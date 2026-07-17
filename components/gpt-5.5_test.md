# BUG 审计反馈

审计范围：`test` 目录下 7 个 JS/Python 文件。  
已执行验证：`python -m py_compile`、`node --check`、以及若干原生 Python/Node 最小复现脚本。未修改原始源码。

## 总览

- 总发现数：54
- 高风险：24
- 中风险：23
- 低风险：7
- 整体代码质量评分：3 / 10  
  多数文件包含可复现的安全漏洞、阻断级语法错误、错误吞噬、资源泄漏和核心逻辑失效问题。

## 测试结果摘要

- Python 编译：
  - `buggy_auth_system.py`：通过
  - `buggy_math_engine.py`：通过
  - `buggy_file_manager.py`：通过
  - `buggy_dag_orchestrator.py`：失败，`SyntaxError: invalid syntax`，位置 `buggy_dag_orchestrator.py:460`
- JS 语法检查：
  - `buggy_async_pipeline.js`：通过
  - `buggy_rate_limiter.js`：通过
  - `buggy_reactive_engine.js`：通过
- 动态复现：
  - `MathEngine.median([1,2,3,4])` 返回 `5`，应为 `2.5`
  - `MathEngine.matrix_multiply([[1,2,3]], [[1,2],[3,4],[5,6]])` 错误抛出 `ValueError`
  - 普通认证用户可执行 `delete_user`
  - 普通认证用户可调用 `get_all_users` 并拿到密码哈希
  - `FileManager._resolve_path('/tmp/outside.txt')` 可跳出根目录
  - `ReactiveContext` 中 `Computed` 和 `Effect` 在信号变化后不更新

---

## 文件：`buggy_auth_system.py`

**1. 问题清单**

---
**[P-001]**
- **严重程度**：高
- **类别**：硬编码密钥
- **位置**：`buggy_auth_system.py:11-12`
- **描述**：`SECRET_KEY` 和 `ADMIN_TOKEN` 直接写入源码，一旦代码泄露即可被复用，且无法安全轮换。
- **修复建议**：改为环境变量或密钥管理服务加载，并支持密钥轮换。

---
**[P-002]**
- **严重程度**：高
- **类别**：SQL 注入
- **位置**：`buggy_auth_system.py:37`, `buggy_auth_system.py:93`, `buggy_auth_system.py:105`
- **描述**：查询、提权、删除用户处使用 f-string 拼接 SQL，攻击者可通过用户名构造注入语句。
- **修复建议**：所有 SQL 均使用参数化查询，禁止拼接用户输入。

---
**[P-003]**
- **严重程度**：高
- **类别**：密码存储不安全
- **位置**：`buggy_auth_system.py:43`
- **描述**：使用 MD5 存储密码，无 salt、无慢哈希，容易被彩虹表和离线爆破破解。
- **修复建议**：使用 `bcrypt`、`argon2` 或 PBKDF2，并加入唯一 salt 和合理迭代参数。

---
**[P-004]**
- **严重程度**：高
- **类别**：权限提升
- **位置**：`buggy_auth_system.py:45-55`
- **描述**：`register` 允许调用方传入任意 `role`，普通注册流程可直接创建管理员。
- **修复建议**：注册接口固定创建普通用户，角色变更必须走独立管理员授权流程。

---
**[P-005]**
- **严重程度**：高
- **类别**：越权删除
- **位置**：`buggy_auth_system.py:99-107`
- **描述**：`delete_user` 只验证是否登录，不验证管理员权限；任意登录用户可删除其他用户。
- **修复建议**：删除用户必须校验管理员角色或资源所有权，并记录审计日志。

---
**[P-006]**
- **严重程度**：高
- **类别**：敏感信息泄露
- **位置**：`buggy_auth_system.py:112-123`
- **描述**：任意登录用户可获取全量用户列表和 `password_hash`。
- **修复建议**：仅管理员可访问用户列表，响应中移除密码哈希字段。

---
**[P-007]**
- **严重程度**：中
- **类别**：认证逻辑错误
- **位置**：`buggy_auth_system.py:64`
- **描述**：读取了 `is_active` 但未使用，禁用用户仍可登录。
- **修复建议**：登录时校验账号启用状态。

---
**[P-008]**
- **严重程度**：中
- **类别**：密码修改校验缺失
- **位置**：`buggy_auth_system.py:127-139`
- **描述**：`change_password` 接收 `old_password` 但未验证，令牌泄露后可直接改密。
- **修复建议**：修改密码前验证旧密码，必要时要求二次认证。

---
**[P-009]**
- **严重程度**：中
- **类别**：会话安全
- **位置**：`buggy_auth_system.py:68-80`
- **描述**：token 使用 MD5 和时间生成，无过期、无撤销、无签名，`session_store` 仅内存保存。
- **修复建议**：使用安全随机数生成 token，设置过期时间和撤销机制。

---
**[P-010]**
- **严重程度**：中
- **类别**：角色索引错误
- **位置**：`buggy_auth_system.py:72`
- **描述**：session 中 `role` 使用 `user[3]`，实际该字段是 email，导致管理员判断异常。
- **修复建议**：使用具名字段或 ORM/row factory，避免裸 tuple 下标。

---
**[P-011]**
- **严重程度**：中
- **类别**：防暴力破解缺失
- **位置**：`buggy_auth_system.py:109-110`
- **描述**：`check_rate_limit` 未实现，登录失败次数也未被使用。
- **修复建议**：实现账号/IP 维度限流和锁定策略。

**2. 单元测试文件**

建议测试文件：`test_buggy_auth_system.py`

覆盖点：SQL 注入用户名、普通用户删除他人、普通用户读取密码哈希、禁用用户登录、修改密码不验证旧密码、注册时传入 admin 角色、session role 字段错误。

**3. 统计摘要**

- 总发现数：11
- 高风险：6
- 中风险：5
- 低风险：0
- 代码质量评分：2 / 10

---

## 文件：`buggy_math_engine.py`

**1. 问题清单**

---
**[P-012]**
- **严重程度**：高
- **类别**：递归 DoS
- **位置**：`buggy_math_engine.py:37-40`
- **描述**：`factorial(-1)` 无限递归，触发 `RecursionError`。
- **修复建议**：校验 `n >= 0` 且为整数，超限输入直接拒绝。

---
**[P-013]**
- **严重程度**：高
- **类别**：性能 DoS
- **位置**：`buggy_math_engine.py:42-47`
- **描述**：`fibonacci` 使用指数级递归，大输入会导致 CPU 长时间占用。
- **修复建议**：改为迭代或带缓存实现，并限制输入规模。

---
**[P-014]**
- **严重程度**：中
- **类别**：计算错误
- **位置**：`buggy_math_engine.py:55-65`
- **描述**：偶数长度中位数返回两个中间值之和，未除以 2；`[1,2,3,4]` 返回 `5`。
- **修复建议**：偶数长度返回两个中间值平均值。

---
**[P-015]**
- **严重程度**：中
- **类别**：输入副作用
- **位置**：`buggy_math_engine.py:56-57`
- **描述**：`median` 原地排序输入数组，调用方数据被篡改。
- **修复建议**：对副本排序。

---
**[P-016]**
- **严重程度**：中
- **类别**：矩阵维度校验错误
- **位置**：`buggy_math_engine.py:76-88`
- **描述**：矩阵乘法错误比较 `cols_A != cols_B`，应比较 `cols_A != rows_B`。
- **修复建议**：按矩阵乘法规则校验维度，并校验矩阵非空、行长度一致。

---
**[P-017]**
- **严重程度**：中
- **类别**：边界条件错误
- **位置**：`buggy_math_engine.py:109-121`
- **描述**：`percentile([], 50)` 抛出 `IndexError`；`p < 0` 或 `p > 100` 未拒绝。
- **修复建议**：空数组和非法百分位显式抛出 `ValueError`。

---
**[P-018]**
- **严重程度**：低
- **类别**：异常吞噬
- **位置**：`buggy_math_engine.py:49-53`
- **描述**：`mean` 捕获所有异常并返回 `0.0`，会隐藏类型错误和空输入错误。
- **修复建议**：只处理明确的空输入，其他异常向上传播。

---
**[P-019]**
- **严重程度**：低
- **类别**：共享状态污染
- **位置**：`buggy_math_engine.py:14`, `buggy_math_engine.py:28`
- **描述**：`_history` 是类变量，多个实例共享历史记录。
- **修复建议**：改为实例变量。

**2. 单元测试文件**

建议测试文件：`test_buggy_math_engine.py`

覆盖点：负数阶乘、较大 Fibonacci、偶数中位数、输入数组不应被修改、合法矩阵乘法、非法矩阵维度、空数组百分位、非法百分位、实例历史隔离。

**3. 统计摘要**

- 总发现数：8
- 高风险：2
- 中风险：4
- 低风险：2
- 代码质量评分：5 / 10

---

## 文件：`buggy_file_manager.py`

**1. 问题清单**

---
**[P-020]**
- **严重程度**：高
- **类别**：路径穿越 / 沙箱逃逸
- **位置**：`buggy_file_manager.py:36-39`
- **描述**：仅检查字符串包含 `..`，绝对路径如 `/tmp/outside.txt` 可绕过并跳出 `root_dir`。
- **修复建议**：使用 `realpath/resolve` 归一化后校验目标路径必须位于根目录内。

---
**[P-021]**
- **严重程度**：高
- **类别**：上传路径穿越
- **位置**：`buggy_file_manager.py:184-196`
- **描述**：`save_upload` 直接拼接 `filename`，未调用 `_resolve_path`，`../escape.txt` 可写到 uploads 外部。
- **修复建议**：上传文件名只允许 basename 或白名单字符，并归一化校验。

---
**[P-022]**
- **严重程度**：高
- **类别**：符号链接 / TOCTOU
- **位置**：`buggy_file_manager.py:44-68`
- **描述**：读写前检查和实际打开之间存在竞态，且跟随符号链接，可能覆盖根目录外敏感文件。
- **修复建议**：使用不跟随符号链接的安全打开方式，并在打开后校验真实路径。

---
**[P-023]**
- **严重程度**：中
- **类别**：文件大小限制失效
- **位置**：`buggy_file_manager.py:61-62`
- **描述**：超过 `MAX_FILE_SIZE` 只打印警告，仍继续写入。
- **修复建议**：超限直接拒绝并返回失败。

---
**[P-024]**
- **严重程度**：中
- **类别**：临时文件不安全
- **位置**：`buggy_file_manager.py:94-95`
- **描述**：使用 `tempfile.mktemp`，存在竞态和可预测路径风险。
- **修复建议**：使用 `NamedTemporaryFile` 或 `mkstemp`。

---
**[P-025]**
- **严重程度**：中
- **类别**：批量操作非原子
- **位置**：`buggy_file_manager.py:127-138`
- **描述**：`batch_rename` 部分成功后失败不会回滚，可能造成文件丢失或状态不一致。
- **修复建议**：先校验全部目标，再使用事务式两阶段 rename 或失败回滚。

---
**[P-026]**
- **严重程度**：中
- **类别**：弱哈希默认值
- **位置**：`buggy_file_manager.py:142`
- **描述**：默认使用 MD5，不能用于安全完整性校验。
- **修复建议**：默认使用 SHA-256，并限制可选算法。

---
**[P-027]**
- **严重程度**：中
- **类别**：权限滥用
- **位置**：`buggy_file_manager.py:155-160`
- **描述**：调用方可传入任意 chmod mode，可能创建过宽权限文件。
- **修复建议**：限制权限范围，并按业务角色授权。

---
**[P-028]**
- **严重程度**：低
- **类别**：资源泄漏
- **位置**：`buggy_file_manager.py:106-123`
- **描述**：`watch_file` 创建无限循环 daemon 线程，无停止机制。
- **修复建议**：提供 stop token 或 watcher close 方法。

**2. 单元测试文件**

建议测试文件：`test_buggy_file_manager.py`

覆盖点：绝对路径逃逸、上传文件名穿越、超大文件仍写入、`mktemp` 风险路径、批量 rename 部分失败、MD5 默认哈希、任意 chmod、watcher 无法停止。

**3. 统计摘要**

- 总发现数：9
- 高风险：3
- 中风险：5
- 低风险：1
- 代码质量评分：3 / 10

---

## 文件：`buggy_dag_orchestrator.py`

**1. 问题清单**

---
**[P-029]**
- **严重程度**：高
- **类别**：阻断级语法错误
- **位置**：`buggy_dag_orchestrator.py:460`
- **描述**：文件无法通过 `py_compile`，整个模块无法导入或运行。
- **修复建议**：修正 `_execute_single_task` 中 `try/finally` 结构缩进和语法。

---
**[P-030]**
- **严重程度**：高
- **类别**：运行时类型错误
- **位置**：`buggy_dag_orchestrator.py:139-140`
- **描述**：`Set[str]()` 来自 `typing`，不可实例化；即使修复语法，`validate()` 也会失败。
- **修复建议**：使用内置 `set()`。

---
**[P-031]**
- **严重程度**：高
- **类别**：依赖图不一致
- **位置**：`buggy_dag_orchestrator.py:123-136`, `buggy_dag_orchestrator.py:164-180`
- **描述**：`TaskDefinition.dependencies` 和邻接表需要手动同步，直接 `add_task` 带 dependencies 时拓扑排序可能忽略依赖。
- **修复建议**：`add_task` 内统一注册依赖边，或禁止直接带 dependencies 添加任务。

---
**[P-032]**
- **严重程度**：中
- **类别**：取消语义不完整
- **位置**：`buggy_dag_orchestrator.py:508`
- **描述**：`cancel()` 只设置标志，不取消已经运行的 asyncio task。
- **修复建议**：保存运行中的 task handle，取消并等待其结束。

---
**[P-033]**
- **严重程度**：中
- **类别**：异常吞噬
- **位置**：`buggy_dag_orchestrator.py:501`
- **描述**：`asyncio.gather(..., return_exceptions=True)` 的异常结果未检查，调度层可能误以为执行完成。
- **修复建议**：收集并处理异常结果，必要时标记任务失败。

---
**[P-034]**
- **严重程度**：低
- **类别**：配置失效
- **位置**：`buggy_dag_orchestrator.py:46`
- **描述**：`RetryPolicy.jitter` 字段存在但未参与延迟计算。
- **修复建议**：实现 jitter 或移除该字段。

---
**[P-035]**
- **严重程度**：低
- **类别**：空值格式化错误
- **位置**：`buggy_dag_orchestrator.py:323-326`
- **描述**：`summary()` 在 trace 未结束时格式化 `None` 为浮点数会报错。
- **修复建议**：对 `total_duration is None` 单独处理。

**2. 单元测试文件**

建议测试文件：`test_buggy_dag_orchestrator.py`

当前首个测试应验证模块无法编译；修复语法后再覆盖 `validate()`、直接添加依赖任务、取消运行中任务、异常收集、trace 未结束 summary。

**3. 统计摘要**

- 总发现数：7
- 高风险：3
- 中风险：2
- 低风险：2
- 代码质量评分：1 / 10

---

## 文件：`buggy_async_pipeline.js`

**1. 问题清单**

---
**[P-036]**
- **严重程度**：高
- **类别**：导入副作用
- **位置**：`buggy_async_pipeline.js:207`
- **描述**：文件末尾直接执行 `main()`，被测试或其他模块导入时会启动网络请求、轮询和进程信号处理。
- **修复建议**：使用 `if (require.main === module)` 保护入口，并导出类供测试。

---
**[P-037]**
- **严重程度**：高
- **类别**：无限重试 / 栈溢出
- **位置**：`buggy_async_pipeline.js:52-60`
- **描述**：`fetchWithRetry` 没有最大重试次数和退避策略，持续失败会无限递归。
- **修复建议**：加入最大重试、指数退避、超时和最终失败返回。

---
**[P-038]**
- **严重程度**：中
- **类别**：全局异常吞噬
- **位置**：`buggy_async_pipeline.js:9-15`
- **描述**：全局捕获 `uncaughtException` 和 `unhandledRejection` 后只打印日志，进程继续运行在未知状态。
- **修复建议**：记录后进行受控退出或明确恢复策略。

---
**[P-039]**
- **严重程度**：中
- **类别**：HTTP 处理不完整
- **位置**：`buggy_async_pipeline.js:30-44`
- **描述**：未检查 HTTP 状态码、响应大小和超时；JSON 解析失败返回 `undefined`。
- **修复建议**：非 2xx 拒绝，设置超时和大小上限，解析失败抛出明确错误。

---
**[P-040]**
- **严重程度**：中
- **类别**：错误吞噬
- **位置**：`buggy_async_pipeline.js:67-80`
- **描述**：processor 报错后继续执行并计入 processed，失败数据可能进入后续流程。
- **修复建议**：区分可恢复/不可恢复错误，失败计入 `failed` 并返回结构化错误。

---
**[P-041]**
- **严重程度**：中
- **类别**：并发控制失效
- **位置**：`buggy_async_pipeline.js:82-100`
- **描述**：`concurrency` 配置未使用，`Promise.all` 会一次性启动所有批次。
- **修复建议**：实现并发队列或 worker pool。

---
**[P-042]**
- **严重程度**：中
- **类别**：资源泄漏
- **位置**：`buggy_async_pipeline.js:106-116`
- **描述**：`setInterval` 返回值未保存，`cleanup()` 无法停止轮询。
- **修复建议**：保存 interval handle 并在 cleanup 中 clear。

---
**[P-043]**
- **严重程度**：中
- **类别**：内存风险
- **位置**：`buggy_async_pipeline.js:119-132`
- **描述**：`readLargeFile` 将全部 chunk 存入内存，文件过大时可能导致内存耗尽。
- **修复建议**：使用流式处理或设置文件大小上限。

**2. 单元测试文件**

建议测试文件：`test_buggy_async_pipeline.js`

覆盖点：导入不应执行 main、fetch 无限重试、JSON 解析失败、processor 报错计数、concurrency 未生效、interval cleanup、超大文件读取。

**3. 统计摘要**

- 总发现数：8
- 高风险：2
- 中风险：6
- 低风险：0
- 代码质量评分：3 / 10

---

## 文件：`buggy_rate_limiter.js`

**1. 问题清单**

---
**[P-044]**
- **严重程度**：高
- **类别**：鉴权密钥不安全
- **位置**：`buggy_rate_limiter.js:231-233`
- **描述**：API Key 使用 `Math.random()` 生成，随机性不足，且无过期、scope、hash 存储。
- **修复建议**：使用 `crypto.randomBytes`，只存 key 哈希，并增加过期和权限范围。

---
**[P-045]**
- **严重程度**：高
- **类别**：限流绕过
- **位置**：`buggy_rate_limiter.js:184-198`
- **描述**：非 GET/POST 请求完全跳过限流，攻击者可用其他 HTTP 方法绕过。
- **修复建议**：默认所有方法限流，必要时显式白名单例外。

---
**[P-046]**
- **严重程度**：中
- **类别**：资源泄漏
- **位置**：`buggy_rate_limiter.js:35-37`
- **描述**：构造函数创建永久 `setInterval`，无 stop 方法，测试和多实例场景会泄漏定时器。
- **修复建议**：保存 timer，提供 `close()`，必要时 `unref()`。

---
**[P-047]**
- **严重程度**：中
- **类别**：封禁清理错误
- **位置**：`buggy_rate_limiter.js:50`
- **描述**：清理条件使用 `now - blockedUntil > blockDurationMs`，实际封禁过期后还会额外保留一个封禁周期。
- **修复建议**：`now >= blockedUntil` 即可清理。

---
**[P-048]**
- **严重程度**：中
- **类别**：请求悬挂
- **位置**：`buggy_rate_limiter.js:279-282`
- **描述**：`someAsyncOperation` 返回永不 resolve 的 Promise，路由会一直挂起。
- **修复建议**：确保异步操作有完成、失败和超时路径。

---
**[P-049]**
- **严重程度**：中
- **类别**：输入清洗不足
- **位置**：`buggy_rate_limiter.js:285-288`
- **描述**：只移除 `<script>` 开始标签，闭合标签、事件属性、其他 HTML 注入都可保留。
- **修复建议**：不要用正则做 HTML 安全清洗；按输出上下文编码或使用可信 sanitizer。

---
**[P-050]**
- **严重程度**：低
- **类别**：校验过弱
- **位置**：`buggy_rate_limiter.js:290-292`
- **描述**：email 只检查是否包含 `@`，大量非法地址会通过。
- **修复建议**：使用明确业务规则或成熟邮箱格式校验。

**2. 单元测试文件**

建议测试文件：`test_buggy_rate_limiter.js`

覆盖点：API key 随机性、非 GET/POST 绕过、封禁过期清理、构造多个 limiter 后定时器泄漏、永不 resolve 的 handler、XSS sanitize 绕过、弱 email 校验。

**3. 统计摘要**

- 总发现数：7
- 高风险：2
- 中风险：4
- 低风险：1
- 代码质量评分：4 / 10

---

## 文件：`buggy_reactive_engine.js`

**1. 问题清单**

---
**[P-051]**
- **严重程度**：高
- **类别**：响应式依赖失效
- **位置**：`buggy_reactive_engine.js:202-213`, `buggy_reactive_engine.js:254-269`, `buggy_reactive_engine.js:302-314`
- **描述**：`Signal._notify` 只在 `currentTracker` 存在时通知；正常 set 时没有全局依赖表，`Computed` 和 `Effect` 不会更新。复现：`count.value=2` 后 `doubled.value` 仍为旧值。
- **修复建议**：使用统一依赖 tracker，读取时注册 observer，写入时按 source 查找并调度 observer。

---
**[P-052]**
- **严重程度**：高
- **类别**：批处理失效
- **位置**：`buggy_reactive_engine.js:538-555`
- **描述**：`batch()` 使用 `ctx._tracker.notify(signal)`，但依赖实际记录在其他 tracker 中，批处理无法触发相关 effect。
- **修复建议**：批处理和普通通知共用同一依赖图。

---
**[P-053]**
- **严重程度**：中
- **类别**：调度错误吞噬
- **位置**：`buggy_reactive_engine.js:122-132`
- **描述**：scheduler 吞掉 task 异常，调用方无法感知 effect/computed 内部失败。
- **修复建议**：记录错误并暴露错误回调或失败状态。

---
**[P-054]**
- **严重程度**：中
- **类别**：浅拷贝历史污染
- **位置**：`buggy_reactive_engine.js:359-367`
- **描述**：Store snapshot 只做浅拷贝，数组/对象历史会被后续原地修改污染。
- **修复建议**：对状态做不可变更新或深拷贝/结构共享快照。

---
**[P-055]**
- **严重程度**：中
- **类别**：事务嵌套错误
- **位置**：`buggy_reactive_engine.js:409-432`
- **描述**：嵌套事务 `beginTransaction` 会清空 `_pendingChanges`，`commit` 可下溢，`rollback` 不能恢复完整事务前状态。
- **修复建议**：维护事务栈，每层记录独立变更集。

---
**[P-056]**
- **严重程度**：中
- **类别**：派生状态泄漏
- **位置**：`buggy_reactive_engine.js:480-489`
- **描述**：`derive` 创建的 `Effect` 未保存，Store dispose 无法释放它。
- **修复建议**：保存派生 effect，并在 dispose 时统一释放。

**2. 单元测试文件**

建议测试文件：`test_buggy_reactive_engine.js`

覆盖点：signal 变化后 computed 更新、effect 重新运行、batch 只触发一次且结果正确、scheduler 异常可观测、历史快照不被对象突变污染、嵌套事务 rollback、derive dispose。

**3. 统计摘要**

- 总发现数：6
- 高风险：2
- 中风险：4
- 低风险：0
- 代码质量评分：3 / 10

---

## 跨文件综合汇总

- 合并统计：
  - 总发现数：54
  - 高风险：24
  - 中风险：23
  - 低风险：7
- TOP 5 最高风险问题：
  1. `buggy_dag_orchestrator.py` 无法编译，模块完全不可用。
  2. `buggy_auth_system.py` 多处 SQL 注入。
  3. `buggy_auth_system.py` 普通用户可删除任意用户并读取密码哈希。
  4. `buggy_file_manager.py` 路径归一化错误导致根目录逃逸。
  5. `buggy_reactive_engine.js` 核心依赖追踪失效，响应式系统实际不可用。
- 跨文件共性问题：
  - 大量错误被吞掉，只打印日志或返回默认值。
  - 安全边界依赖字符串判断，缺少规范化校验。
  - 缺少资源生命周期管理，例如 interval、watcher、session、连接和临时文件。
  - 测试可导入性差，部分文件导入即执行副作用逻辑。
  - 多处使用弱加密或弱随机：MD5、`Math.random()`、硬编码 token。
