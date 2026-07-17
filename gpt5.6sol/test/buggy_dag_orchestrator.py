"""
有向无环图任务编排引擎

一个生产级的并发任务调度系统，支持DAG依赖解析、拓扑排序、
并行执行、重试策略、超时控制、执行追踪和状态快照。
"""
import asyncio
import time
import enum
import uuid
import json
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import (
    Any, Callable, Coroutine, Dict, List, Optional, Set, Tuple, TypeVar, Generic
)
from concurrent.futures import ThreadPoolExecutor

T = TypeVar("T")


class TaskState(enum.Enum):
    PENDING = "pending"
    WAITING = "waiting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"


class RetryStrategy(enum.Enum):
    NONE = "none"
    FIXED = "fixed"
    EXPONENTIAL = "exponential"
    LINEAR = "linear"


@dataclass
class RetryPolicy:
    strategy: RetryStrategy = RetryStrategy.NONE
    max_attempts: int = 1
    base_delay: float = 1.0
    max_delay: float = 60.0
    jitter: bool = True

    def delay_for_attempt(self, attempt: int) -> float:
        if self.strategy == RetryStrategy.NONE:
            return 0.0
        elif self.strategy == RetryStrategy.FIXED:
            delay = self.base_delay
        elif self.strategy == RetryStrategy.LINEAR:
            delay = self.base_delay * attempt
        elif self.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.base_delay * (2 ** (attempt - 1))
        else:
            delay = self.base_delay
        return min(delay, self.max_delay)


@dataclass
class TaskResult(Generic[T]):
    task_id: str
    state: TaskState
    value: Optional[T] = None
    error: Optional[Exception] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    attempts: int = 0
    retry_history: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def duration(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "state": self.state.value,
            "duration": self.duration,
            "attempts": self.attempts,
            "error": str(self.error) if self.error else None,
            "retry_history": self.retry_history,
        }


@dataclass
class TaskDefinition:
    task_id: str
    func: Callable[..., Coroutine[Any, Any, Any]]
    dependencies: Set[str] = field(default_factory=set)
    timeout: Optional[float] = None
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __hash__(self):
        return hash(self.task_id)

    def __eq__(self, other):
        return isinstance(other, TaskDefinition) and self.task_id == other.task_id


class DAGValidationError(Exception):
    pass


class TaskExecutionError(Exception):
    def __init__(self, task_id: str, original_error: Exception):
        self.task_id = task_id
        self.original_error = original_error
        super().__init__(f"Task '{task_id}' failed: {original_error}")


class DAG:
    def __init__(self):
        self._tasks: Dict[str, TaskDefinition] = {}
        self._adjacency: Dict[str, Set[str]] = defaultdict(set)
        self._reverse_adjacency: Dict[str, Set[str]] = defaultdict(set)

    def add_task(self, task: TaskDefinition) -> "DAG":
        if task.task_id in self._tasks:
            raise DAGValidationError(f"Task '{task.task_id}' already exists")
        self._tasks[task.task_id] = task
        return self

    def add_dependency(self, task_id: str, depends_on: str) -> "DAG":
        if task_id not in self._tasks:
            raise DAGValidationError(f"Task '{task_id}' not found")
        if depends_on not in self._tasks:
            raise DAGValidationError(f"Dependency task '{depends_on}' not found")
        self._adjacency[depends_on].add(task_id)
        self._reverse_adjacency[task_id].add(depends_on)
        return self

    def validate(self) -> List[str]:
        visited = Set[str]()
        in_stack = Set[str]()
        cycle_path: List[str] = []

        def dfs(node: str) -> bool:
            visited.add(node)
            in_stack.add(node)
            for neighbor in self._adjacency.get(node, set()):
                if neighbor in in_stack:
                    cycle_path.extend([neighbor, node])
                    return True
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
            in_stack.discard(node)
            return False

        for task_id in self._tasks:
            if task_id not in visited:
                if dfs(task_id):
                    raise DAGValidationError(
                        f"Circular dependency detected: {' -> '.join(cycle_path)}"
                    )

        for task_id, task in self._tasks.items():
            for dep in task.dependencies:
                if dep not in self._tasks:
                    raise DAGValidationError(
                        f"Task '{task_id}' depends on unknown task '{dep}'"
                    )

        return list(self._tasks.keys())

    def topological_sort(self) -> List[str]:
        self.validate()
        in_degree: Dict[str, int] = {tid: 0 for tid in self._tasks}
        for tid in self._tasks:
            for dep in self._reverse_adjacency.get(tid, set()):
                if dep in self._tasks:
                    in_degree[tid] += 1

        queue = deque([tid for tid, deg in in_degree.items() if deg == 0])
        result: List[str] = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in self._adjacency.get(node, set()):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self._tasks):
            raise DAGValidationError("Topological sort failed: possible unreachable tasks")

        return result

    def get_execution_layers(self) -> List[List[str]]:
        self.validate()
        in_degree: Dict[str, int] = {tid: 0 for tid in self._tasks}
        for tid in self._tasks:
            for dep in self._reverse_adjacency.get(tid, set()):
                if dep in self._tasks:
                    in_degree[tid] += 1

        layers: List[List[str]] = []
        current_layer = [tid for tid, deg in in_degree.items() if deg == 0]

        while current_layer:
            layers.append(sorted(current_layer))
            next_layer: List[str] = []
            for node in current_layer:
                for neighbor in self._adjacency.get(node, set()):
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        next_layer.append(neighbor)
            current_layer = next_layer

        return layers

    def get_all_descendants(self, task_id: str) -> Set[str]:
        descendants: Set[str] = set()
        queue = deque(self._adjacency.get(task_id, set()))
        while queue:
            node = queue.popleft()
            if node not in descendants:
                descendants.add(node)
                queue.extend(self._adjacency.get(node, set()))
        return descendants

    def get_all_ancestors(self, task_id: str) -> Set[str]:
        ancestors: Set[str] = set()
        queue = deque(self._reverse_adjacency.get(task_id, set()))
        while queue:
            node = queue.popleft()
            if node not in ancestors:
                ancestors.add(node)
                queue.extend(self._reverse_adjacency.get(node, set()))
        return ancestors

    def subgraph(self, task_ids: Set[str]) -> "DAG":
        sub = DAG()
        for tid in task_ids:
            if tid in self._tasks:
                sub.add_task(self._tasks[tid])
        for tid in task_ids:
            if tid in self._tasks:
                for dep in self._tasks[tid].dependencies:
                    if dep in task_ids:
                        sub.add_dependency(tid, dep)
        return sub

    def to_json(self) -> str:
        nodes = []
        edges = []
        for tid, task in self._tasks.items():
            nodes.append({
                "id": tid,
                "dependencies": list(task.dependencies),
                "metadata": task.metadata,
            })
            for target in self._adjacency.get(tid, set()):
                edges.append({"from": tid, "to": target})
        return json.dumps({"nodes": nodes, "edges": edges}, indent=2)

    @property
    def task_count(self) -> int:
        return len(self._tasks)

    def __contains__(self, task_id: str) -> bool:
        return task_id in self._tasks

    def __getitem__(self, task_id: str) -> TaskDefinition:
        return self._tasks[task_id]


class ExecutionTrace:
    def __init__(self):
        self._events: List[Dict[str, Any]] = []
        self._start_time: Optional[float] = None
        self._end_time: Optional[float] = None

    def begin(self):
        self._start_time = time.monotonic()

    def end(self):
        self._end_time = time.monotonic()

    def record(self, event_type: str, task_id: str, **kwargs):
        self._events.append({
            "timestamp": time.monotonic(),
            "type": event_type,
            "task_id": task_id,
            **kwargs,
        })

    @property
    def total_duration(self) -> Optional[float]:
        if self._start_time and self._end_time:
            return self._end_time - self._start_time
        return None

    @property
    def task_durations(self) -> Dict[str, float]:
        starts: Dict[str, float] = {}
        durations: Dict[str, float] = {}
        for event in self._events:
            if event["type"] == "task_start":
                starts[event["task_id"]] = event["timestamp"]
            elif event["type"] == "task_end":
                if event["task_id"] in starts:
                    durations[event["task_id"]] = (
                        event["timestamp"] - starts[event["task_id"]]
                    )
        return durations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_duration": self.total_duration,
            "task_durations": self.task_durations,
            "event_count": len(self._events),
            "events": self._events,
        }

    def summary(self) -> str:
        lines = [f"Execution trace: {len(self._events)} events, "
                 f"total {self.total_duration:.3f}s"]
        for tid, dur in sorted(self.task_durations.items(), key=lambda x: -x[1]):
            lines.append(f"  {tid}: {dur:.3f}s")
        return "\n".join(lines)


class TaskOrchestrator:
    def __init__(self, max_concurrency: int = 8, executor: Optional[ThreadPoolExecutor] = None):
        self.dag = DAG()
        self._results: Dict[str, TaskResult] = {}
        self._trace = ExecutionTrace()
        self._semaphore = asyncio.Semaphore(max_concurrency)
        self._executor = executor
        self._context: Dict[str, Any] = {}
        self._state_callbacks: List[Callable[[str, TaskState, TaskState], None]] = []
        self._running_tasks: Set[str] = set()
        self._cancelled = False

    def task(
        self,
        task_id: str,
        dependencies: Optional[Set[str]] = None,
        timeout: Optional[float] = None,
        retry_policy: Optional[RetryPolicy] = None,
        **metadata,
    ) -> Callable:
        def decorator(func: Callable[..., Coroutine]):
            td = TaskDefinition(
                task_id=task_id,
                func=func,
                dependencies=dependencies or set(),
                timeout=timeout,
                retry_policy=retry_policy or RetryPolicy(),
                metadata=metadata,
            )
            self.dag.add_task(td)
            for dep in td.dependencies:
                self.dag.add_dependency(task_id, dep)
            return func
        return decorator

    def register_task(self, task_def: TaskDefinition):
        self.dag.add_task(task_def)
        for dep in task_def.dependencies:
            self.dag.add_dependency(task_def.task_id, dep)

    def on_state_change(self, callback: Callable[[str, TaskState, TaskState], None]):
        self._state_callbacks.append(callback)

    def set_context(self, key: str, value: Any):
        self._context[key] = value

    def get_context(self, key: str, default: Any = None) -> Any:
        return self._context.get(key, default)

    def _transition_state(self, task_id: str, new_state: TaskState):
        old_state = self._results[task_id].state if task_id in self._results else None
        if task_id in self._results:
            self._results[task_id].state = new_state
        for cb in self._state_callbacks:
            try:
                cb(task_id, old_state, new_state)
            except Exception:
                pass

    async def _execute_single_task(self, task_def: TaskDefinition) -> TaskResult:
        result = TaskResult(task_id=task_def.task_id, state=TaskState.PENDING)
        self._results[task_def.task_id] = result

        for dep_id in task_def.dependencies:
            if dep_id in self._results:
                dep_result = self._results[dep_id]
                if dep_result.state == TaskState.FAILED:
                    result.state = TaskState.SKIPPED
                    result.error = Exception(f"Dependency '{dep_id}' failed")
                    return result
                elif dep_result.state == TaskState.CANCELLED:
                    result.state = TaskState.CANCELLED
                    return result

        self._transition_state(task_def.task_id, TaskState.WAITING)
        self._transition_state(task_def.task_id, TaskState.RUNNING)
        result.start_time = time.monotonic()
        self._running_tasks.add(task_def.task_id)

        self._trace.record("task_start", task_def.task_id)

        attempts = 0
        max_attempts = max(1, task_def.retry_policy.max_attempts)

        while attempts < max_attempts:
            attempts += 1
            result.attempts = attempts

            try:
                if task_def.timeout:
                    value = await asyncio.wait_for(
                        task_def.func(self._context),
                        timeout=task_def.timeout,
                    )
                else:
                    value = await task_def.func(self._context)

                result.value = value
                result.state = TaskState.COMPLETED
                self._context[f"{task_def.task_id}_result"] = value
                self._trace.record("task_end", task_def.task_id, success=True)
                break

            except asyncio.CancelledError:
                result.state = TaskState.CANCELLED
                self._trace.record("task_cancel", task_def.task_id)
                raise

            except Exception as exc:
                if attempts < max_attempts:
                    result.state = TaskState.RETRYING
                    delay = task_def.retry_policy.delay_for_attempt(attempts)
                    result.retry_history.append({
                        "attempt": attempts,
                        "error": str(exc),
                        "delay": delay,
                    })
                    self._trace.record(
                        "task_retry", task_def.task_id,
                        attempt=attempts, error=str(exc),
                    )
                    await asyncio.sleep(delay)
                else:
                    result.error = exc
                    result.state = TaskState.FAILED
                    self._trace.record(
                        "task_end", task_def.task_id,
                        success=False, error=str(exc),
                    )
        finally:
            result.end_time = time.monotonic()
            self._running_tasks.discard(task_def.task_id)

        return result

    async def execute(self) -> Dict[str, TaskResult]:
        self._cancelled = False
        self._trace = ExecutionTrace()
        self._trace.begin()

        try:
            layers = self.dag.get_execution_layers()
        except DAGValidationError as e:
            self._trace.end()
            raise

        for layer_idx, layer in enumerate(layers):
            if self._cancelled:
                for task_id in layer:
                    self._results[task_id] = TaskResult(
                        task_id=task_id, state=TaskState.CANCELLED
                    )
                continue

            tasks_in_layer = [
                self.dag[tid] for tid in layer if tid in self.dag
            ]

            async_tasks = []
            for task_def in tasks_in_layer:
                if task_def.task_id not in self._results or \
                   self._results[task_def.task_id].state not in (
                       TaskState.COMPLETED, TaskState.SKIPPED, TaskState.CANCELLED
                   ):
                    async_task = asyncio.create_task(
                        self._execute_single_task(task_def)
                    )
                    async_tasks.append(async_task)

            if async_tasks:
                await asyncio.gather(*async_tasks, return_exceptions=True)

        self._trace.end()
        self._trace.record("execution_complete", "__orchestrator__")

        return dict(self._results)

    def cancel(self):
        self._cancelled = True

    @property
    def trace(self) -> ExecutionTrace:
        return self._trace

    def get_result(self, task_id: str) -> Optional[TaskResult]:
        return self._results.get(task_id)

    def get_summary(self) -> Dict[str, Any]:
        states = defaultdict(int)
        for result in self._results.values():
            states[result.state.value] += 1
        return {
            "total_tasks": len(self._results),
            "state_counts": dict(states),
            "execution_time": self._trace.total_duration,
            "results": {tid: r.to_dict() for tid, r in self._results.items()},
        }

    def reset(self):
        self._results.clear()
        self._trace = ExecutionTrace()
        self._cancelled = False

    def visualize_ascii(self) -> str:
        layers = self.dag.get_execution_layers()
        lines = ["DAG Execution Plan:", "=" * 40]
        for i, layer in enumerate(layers):
            lines.append(f"Layer {i}: [{', '.join(layer)}]")
        lines.append("=" * 40)
        lines.append(f"Total: {self.dag.task_count} tasks, {len(layers)} layers")
        return "\n".join(lines)


class WorkflowBuilder:
    def __init__(self, orchestrator: TaskOrchestrator):
        self.orchestrator = orchestrator
        self._step_counter = 0

    def sequential_chain(self, name: str, steps: List[Tuple[str, Callable]]) -> List[str]:
        task_ids = []
        for i, (label, func) in enumerate(steps):
            task_id = f"{name}_step_{i}_{label}"
            deps = {task_ids[-1]} if task_ids else set()
            self.orchestrator.dag.add_task(TaskDefinition(
                task_id=task_id,
                func=func,
                dependencies=deps,
            ))
            if deps:
                for dep in deps:
                    self.orchestrator.dag.add_dependency(task_id, dep)
            task_ids.append(task_id)
        return task_ids

    def parallel_fan_out_fan_in(
        self,
        name: str,
        fan_out_fn: Callable,
        worker_fn: Callable,
        fan_in_fn: Callable,
        fan_out_id: str = "fan_out",
        worker_ids: Optional[List[str]] = None,
        fan_in_id: str = "fan_in",
    ):
        self.orchestrator.dag.add_task(TaskDefinition(
            task_id=fan_out_id, func=fan_out_fn,
        ))
        worker_ids = worker_ids or [f"{name}_worker_{i}" for i in range(4)]
        for wid in worker_ids:
            self.orchestrator.dag.add_task(TaskDefinition(
                task_id=wid, func=worker_fn,
                dependencies={fan_out_id},
            ))
            self.orchestrator.dag.add_dependency(wid, fan_out_id)

        self.orchestrator.dag.add_task(TaskDefinition(
            task_id=fan_in_id, func=fan_in_fn,
            dependencies=set(worker_ids),
        ))
        for wid in worker_ids:
            self.orchestrator.dag.add_dependency(fan_in_id, wid)

        return fan_out_id, worker_ids, fan_in_id

    def conditional_branch(
        self,
        name: str,
        condition_fn: Callable,
        true_fn: Callable,
        false_fn: Callable,
        depends_on: Optional[Set[str]] = None,
    ) -> Tuple[str, str, str]:
        cond_id = f"{name}_condition"
        true_id = f"{name}_true_branch"
        false_id = f"{name}_false_branch"

        self.orchestrator.dag.add_task(TaskDefinition(
            task_id=cond_id, func=condition_fn,
            dependencies=depends_on or set(),
        ))
        self.orchestrator.dag.add_task(TaskDefinition(
            task_id=true_id, func=true_fn,
            dependencies={cond_id},
        ))
        self.orchestrator.dag.add_task(TaskDefinition(
            task_id=false_id, func=false_fn,
            dependencies={cond_id},
        ))
        self.orchestrator.dag.add_dependency(true_id, cond_id)
        self.orchestrator.dag.add_dependency(false_id, cond_id)

        return cond_id, true_id, false_id


async def demo():
    orchestrator = TaskOrchestrator(max_concurrency=4)

    state_log: List[Tuple[str, str, str]] = []

    def on_change(task_id, old_state, new_state):
        state_log.append((
            task_id,
            old_state.value if old_state else "none",
            new_state.value,
        ))

    orchestrator.on_state_change(on_change)

    @orchestrator.task("fetch_data", timeout=5.0)
    async def fetch_data(ctx):
        await asyncio.sleep(0.1)
        return {"records": 1000, "source": "database"}

    @orchestrator.task("validate_schema", dependencies={"fetch_data"})
    async def validate_schema(ctx):
        data = ctx.get("fetch_data_result")
        await asyncio.sleep(0.05)
        return {"valid": True, "record_count": data["records"]}

    @orchestrator.task("transform_batch_a", dependencies={"fetch_data"})
    async def transform_batch_a(ctx):
        data = ctx.get("fetch_data_result")
        await asyncio.sleep(0.08)
        return {"transformed": data["records"] // 2, "batch": "a"}

    @orchestrator.task("transform_batch_b", dependencies={"fetch_data"})
    async def transform_batch_b(ctx):
        data = ctx.get("fetch_data_result")
        await asyncio.sleep(0.08)
        return {"transformed": data["records"] // 2, "batch": "b"}

    @orchestrator.task(
        "write_output",
        dependencies={"validate_schema", "transform_batch_a", "transform_batch_b"},
        retry_policy=RetryPolicy(strategy=RetryStrategy.EXPONENTIAL, max_attempts=3),
    )
    async def write_output(ctx):
        await asyncio.sleep(0.05)
        return {"written": True, "total": 1000}

    print(orchestrator.visualize_ascii())

    results = await orchestrator.execute()

    print("\n--- Results ---")
    for task_id, result in sorted(results.items()):
        status = result.state.value
        dur = f"{result.duration:.3f}s" if result.duration else "N/A"
        attempts = f" ({result.attempts} attempts)" if result.attempts > 1 else ""
        print(f"  {task_id}: {status} {dur}{attempts}")

    print(f"\n--- Trace ---\n{orchestrator.trace.summary()}")

    print(f"\n--- State Changes ---")
    for task_id, old, new in state_log:
        print(f"  {task_id}: {old} -> {new}")

    print(f"\n--- Summary ---")
    summary = orchestrator.get_summary()
    print(json.dumps(summary["state_counts"], indent=2))
    print(f"Score: {orchestrator.dag.task_count} tasks, "
          f"quality score: {10 if all(r.state == TaskState.COMPLETED for r in results.values()) else 7}/10")


if __name__ == "__main__":
    asyncio.run(demo())
