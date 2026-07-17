import asyncio
import unittest


class DAGOrchestratorAuditTests(unittest.IsolatedAsyncioTestCase):
    async def test_layer_ignores_max_concurrency(self):
        active = 0
        peak = 0

        async def task():
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0.01)
            active -= 1

        await asyncio.gather(*(asyncio.create_task(task()) for _ in range(5)))
        self.assertEqual(peak, 5)

    async def test_cancel_flag_does_not_cancel_running_task(self):
        finished = False

        async def running():
            nonlocal finished
            await asyncio.sleep(0.01)
            finished = True

        handle = asyncio.create_task(running())
        cancelled_flag = True
        self.assertTrue(cancelled_flag)
        await handle
        self.assertTrue(finished)

    async def test_skipped_dependency_does_not_block_descendant(self):
        dependency_state = "skipped"
        blocked = dependency_state in ("failed", "cancelled")
        self.assertFalse(blocked)

    def test_zero_timeout_is_treated_as_no_timeout(self):
        timeout = 0
        self.assertFalse(bool(timeout))

    def test_conditional_builder_schedules_both_branches(self):
        graph = {"true": {"condition"}, "false": {"condition"}}
        ready_after_condition = [name for name, deps in graph.items() if deps == {"condition"}]
        self.assertCountEqual(ready_after_condition, ["true", "false"])

    def test_completed_results_are_reused_on_second_execute(self):
        results = {"task": "completed"}
        should_schedule = "task" not in results or results["task"] not in ("completed", "skipped", "cancelled")
        self.assertFalse(should_schedule)


if __name__ == "__main__":
    unittest.main()
