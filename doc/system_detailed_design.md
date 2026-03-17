# 智码项目详细设计文档（V1.0）

## 1. 文档信息

| 项 | 内容 |
|---|---|
| 文档名称 | 智码项目详细设计文档 |
| 覆盖范围 | 基于 OpenCode 的智码终端（iCode Terminal）+ 自研智码安全网关 |
| 版本 | V1.0 |
| 目标读者 | 架构师、终端研发、网关研发、安全团队、测试团队、运维团队 |
| 设计基线 | 已确认采用 AI-SBOM；高风险聚焦“公司代码越权泄露”；默认低打扰策略；审计默认保留 180 天；当前单模型（本地 Qwen） |

---

## 2. 总体目标与设计原则

### 2.1 目标
- 为企业研发提供统一、安全、低打扰的 AI 编码入口。
- 防止通过 AI 通道发生公司代码越权泄露。
- 构建端到端可审计、可回放、可复盘的治理闭环。
- 通过 AI-SBOM 建立代码生成溯源能力。

### 2.2 设计原则
- 默认放行、强证据阻断：仅对“可证实越权泄露”强阻断。
- 最小必要上传：终端端侧裁剪上下文，降低敏感暴露面。
- 全链路追踪：全请求贯穿 request_id/session_id。
- 策略可演进：规则支持热更新与灰度。
- 低侵入低打扰：研发体验优先，告警和复核主要在后台完成。

---

## 3. 系统架构设计

### 3.1 总体架构

```text
[Developer CLI: iCode Terminal]
    ├─ 身份绑定（Token + DeviceID + ProjectID）
    ├─ Context采集（LSP/AST/Diff/错误日志）
    ├─ 本地DLP与最小化上传
    ├─ 风险交互（红黄绿，仅高风险强阻断）
    └─ 本地审计缓存（离线可用）
            |
            v
[Smart Code Security Gateway]
    ├─ API接入层（HTTP + SSE）
    ├─ 统一鉴权与ACL校验
    ├─ 输入防护（注入/意图基础检测）
    ├─ 模型代理（当前本地Qwen）
    ├─ 输出防护（越权泄露检测核心）
    ├─ AI-SBOM生成与归档
    └─ 审计与回放服务
            |
            +--> [Admin Console]
            |       ├─ 实时监控
            |       ├─ 事件检索/复核
            |       ├─ 会话回放
            |       └─ 策略管理
            |
            +--> [Data Layer]
                    ├─ PostgreSQL（主业务库）
                    ├─ Redis（会话态/限流）
                    └─ Object Storage（大字段与回放片段）
```

### 3.2 逻辑分层
- 终端层：负责本地体验、上下文构建和预防护。
- 网关层：负责统一治理、策略执行、审计汇聚。
- 管控层：负责可视化监控、策略运营、事件复核。
- 数据层：负责结构化存储、检索和回放。

---

## 4. 智码终端详细设计（基于 OpenCode）

## 4.1 终端模块拆分
- CLI 入口模块：命令解析、banner、prompt、版本信息。
- 身份绑定模块：读取本地 Token、生成 DeviceID、加载项目上下文。
- Context 模块：LSP/AST、符号引用、最近 diff、编译测试错误采集。
- 最小化上传模块：.codeignore 解析、分片裁剪、token 预算估算。
- 本地 DLP 模块：凭证/隐私/机密关键词检测与脱敏。
- 请求执行模块：向网关发起流式请求，处理中断/重试。
- 采纳追踪模块：记录 accept/reject/edit-accept。
- 本地审计缓存模块：断网时本地落盘，恢复后重传。

### 4.2 终端交互界面设计（CLI）

### 4.2.1 启动界面
- 显示 iCode Banner 与版本号。
- 显示当前项目与安全等级，例如：`Project: Payment-Gateway (高密)`。
- 显示连接状态：`Gateway: Connected / Offline Cache Mode`。

### 4.2.2 主交互界面
- 提示符固定：`icode> `。
- 输入区：支持自然语言任务、命令快捷键、历史记录。
- 状态条：显示当前会话 request_id、模型名称（Qwen）、上下文 token 估算值。
- 风险提示区：
  - 绿色：正常输出，不打断。
  - 黄色：可疑输出，后台标记复核，不打断。
  - 红色：确定性越权泄露，阻断并提示原因。

### 4.2.3 关键命令设计
- `icode start`：初始化会话并校验身份。
- `icode gen "<prompt>"`：发起代码生成。
- `icode status`：查看连接状态、缓存队列、最近事件。
- `icode audit tail`：查看本地待上传审计日志摘要。
- `icode sbom show <request_id>`：查看本次请求的 AI-SBOM 摘要。

### 4.3 终端核心流程
1. 用户输入 prompt。
2. 端侧采集 context（AST、引用、diff、错误日志）。
3. 端侧执行 DLP 脱敏与最小化裁剪。
4. 组装请求并发送网关。
5. 流式接收模型输出。
6. 端侧展示结果并接收用户采纳动作。
7. 上报审计与 AI-SBOM 关联信息。

### 4.4 终端异常处理
- 鉴权失败：立即终止请求，提示重新登录或权限不足。
- 网关超时：自动退避重试 1 次，失败后进入离线缓存模式。
- DLP 命中高危（端侧）：阻断发送，记录事件并给出可解释提示。

---

## 5. 智码安全网关详细设计（自研）

### 5.1 服务拆分
- API Gateway Service：统一入口、鉴权、限流、request_id 分配。
- Policy Engine Service：规则匹配、风险分级、处置决策。
- ACL Service：用户与项目仓库权限校验（对接 Git/SVN）。
- Model Proxy Service：接入本地 Qwen 推理服务。
- Output Guard Service：越权泄露检测与阻断。
- Audit Service：审计归档、会话回放索引。
- SBOM Service：AI-SBOM 生成、查询、统计。
- Admin Console Backend：提供管理端 API。

### 5.2 网关关键时序
1. 接收终端请求并联合鉴权（token/device/project）。
2. ACL 校验当前用户是否可访问请求上下文范围。
3. 执行输入检查（基础注入/恶意意图识别）。
4. 转发给 Qwen 模型并流式接收输出。
5. 输出防护执行“越权泄露检测”。
6. 根据策略执行：放行/后台告警/阻断。
7. 记录审计、写入 AI-SBOM、返回终端。

### 5.3 高风险定义与策略（已冻结）
- 高风险：输出内容属于用户无权限访问的公司代码资产。
- 处置：
  - 高风险（强证据）：阻断返回，前台提示并记录事件。
  - 中风险（弱证据）：放行，后台高优告警进入复核队列。
  - 低风险：放行，常规审计。

---

## 6. 管理控制台界面设计

### 6.1 页面结构
- 登录页：管理员身份认证。
- 总览页（Dashboard）：
  - 指标卡：RPM、拦截率、疑似越权事件数、复核积压数。
  - 趋势图：按小时/天统计风险事件。
- 事件流页（Event Stream）：
  - 列表字段：时间、用户、项目、风险级别、规则命中、状态。
  - 筛选条件：时间范围、项目、风险级别、处理状态。
- 会话回放页（Replay）：
  - 会话时间线：输入、上下文摘要、模型输出、用户采纳动作。
  - AI-SBOM 面板：来源模型、请求 ID、落地文件、commit 关联。
- 策略页（Policy Editor）：
  - 规则开关、阈值、灰度比例、发布记录。
- 复核页（Review Queue）：
  - 人工复核 + AI 复核建议 + 复核结论回写。

### 6.2 关键交互
- 低打扰原则：研发侧尽量无阻塞，管理端承载治理复杂度。
- 一键下钻：从总览指标点击直接跳转到已筛选事件列表。
- 回放联动：在事件详情中直接打开会话回放和对应 SBOM。

### 6.3 UI 风格规范（Prism 风格）

### 6.3.1 风格定位
- 类型：安全运营控制台（SOC Console）风格，非营销大屏。
- 气质：稳重、克制、信息密度高，强调实时事件与风险分级。
- 视觉原则：暗色背景承载高亮告警，操作链路短、状态清晰可判读。

### 6.3.2 色彩系统
- 主背景：`#0B1220`
- 次级背景：`#121A2A`
- 卡片背景：`#172033`
- 主文字：`#E6EDF7`
- 次文字：`#9FB0C7`
- 边框/分割：`#263247`
- 品牌主色：`#3B82F6`
- 成功（低风险）：`#22C55E`
- 警告（中风险）：`#F59E0B`
- 危险（高风险）：`#EF4444`
- 信息强调：`#22D3EE`

### 6.3.3 字体与排版
- 字体族：优先 `Inter`，中文回退 `PingFang SC`、`Microsoft YaHei`。
- 字号层级：
  - 页面标题：24/32，Semibold
  - 区块标题：18/26，Semibold
  - 表格正文：14/22，Regular
  - 辅助说明：12/18，Regular
- 关键数值（KPI）：32/40，Bold。
- 代码与ID（request_id、session_id）：等宽字体 `JetBrains Mono`。

### 6.3.4 间距与栅格
- 栅格：12 列栅格，内容区最大宽度 1440px。
- 基础间距：4px 网格，常用 8/12/16/24/32。
- 卡片圆角：8px；输入框/按钮圆角：6px。
- 表格行高：默认 44px，紧凑模式 36px。

### 6.3.5 组件规范
- 按钮：
  - 主按钮：品牌主色实底，用于“发布策略”“提交复核”。
  - 次按钮：描边，用于“筛选”“导出”。
  - 危险按钮：红色实底，用于“阻断策略生效”等高影响操作。
- 风险标签：
  - low：绿色实底浅透明
  - medium：橙色实底浅透明
  - high：红色实底浅透明
- 表格：
  - 首列固定显示时间戳，次列显示风险级别与事件类型。
  - 支持列冻结、列显隐、多条件筛选。
- 时间线：
  - Replay 视图使用左侧时间轴 + 右侧内容卡，按事件时间升序展示。
- 抽屉：
  - Event 详情采用右侧抽屉，宽度 480px，避免页面跳转打断分析流。

### 6.3.6 页面级样式规则
- Dashboard：
  - 顶部 4 个 KPI 卡，统一高度 116px。
  - 趋势图与事件流上下布局，事件流默认展示最近 50 条。
- Event Stream：
  - 默认按时间倒序；高风险行使用红色左边框强调。
  - 行内提供“回放”“查看 SBOM”“创建复核任务”快捷操作。
- Replay：
  - 三栏布局：会话概览 / 时间线 / SBOM 卡片。
  - 代码片段支持差异高亮（原始输出 vs 最终采纳）。
- Policy Editor：
  - 左侧规则列表，右侧规则画布与命中样例。
  - 发布时必须显示版本号、灰度比例、影响范围确认。
- Review Queue：
  - 任务状态泳道：待复核、复核中、已完成。
  - 支持“人工结论”和“AI建议”并排对比。

### 6.3.7 交互与动效
- 动效时长：150ms（基础）、240ms（面板开合）。
- 刷新策略：
  - Dashboard 指标 5 秒轮询。
  - Event Stream 支持 SSE 实时追加与手动暂停。
- 键盘效率：
  - `/` 快捷聚焦搜索框。
  - `g + d` 跳转 Dashboard，`g + e` 跳转 Event Stream。

### 6.3.8 可用性与可访问性
- 对比度：正文文本与背景对比度不低于 WCAG AA。
- 色盲友好：风险级别同时使用颜色与形状/图标编码。
- 空状态：所有页面提供空状态引导与下一步动作按钮。
- 错误态：统一错误提示条，包含 request_id 便于排障。

### 6.3.9 页面可验证性约束
- 每个核心页面至少提供 2 个可观测断言：
  - 视觉断言：关键组件可见且状态颜色正确。
  - 数据断言：request_id 可检索并与后端数据一致。
- 与 E2E 用例绑定：
  - Dashboard、Event Stream、Replay、Policy Editor、Review Queue、SBOM 均需在 E2E 中被覆盖。

---

## 7. API 接口设计

### 7.1 约定
- 传输协议：HTTPS。
- 鉴权方式：`Authorization: Bearer <token>` + 业务头。
- 通用头：
  - `X-Request-Id`
  - `X-Device-Id`
  - `X-Project-Id`
  - `X-Repo-Id`
  - `X-Client-Version`
- 返回体规范：
  - `code`: 0 成功，非 0 失败
  - `message`: 描述
  - `data`: 业务数据

### 7.2 终端到网关接口

#### 7.2.1 会话初始化
- `POST /api/v1/session/init`
- 作用：校验身份和项目上下文，返回会话信息。
- 请求体：
```json
{
  "user_id": "u_1001",
  "device_fingerprint": "dfp_xxx",
  "project_id": "proj_payment",
  "repo_id": "repo_payment_gateway"
}
```
- 响应体：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "session_id": "sess_xxx",
    "project_level": "high",
    "model": "qwen-local",
    "policy_version": "pv_20260316_01"
  }
}
```

#### 7.2.2 流式代码生成
- `POST /api/v1/chat/completions`（SSE）
- 作用：提交 prompt + context，接收流式输出与风险事件。
- 请求体：
```json
{
  "session_id": "sess_xxx",
  "prompt": "实现用户扣款逻辑",
  "context": {
    "files": [
      {"path": "src/PaymentService.java", "content": "..."}
    ],
    "diff": "...",
    "errors": []
  },
  "options": {
    "stream": true,
    "temperature": 0.2
  }
}
```
- SSE 事件：
  - `event: token`：增量文本
  - `event: risk`：风险标记
  - `event: done`：结束和统计信息
- `risk` 数据示例：
```json
{
  "risk_level": "high",
  "risk_type": "acl_code_leak",
  "action": "block",
  "reason": "输出片段与受限仓库高匹配，且当前用户无ACL"
}
```

#### 7.2.3 采纳行为上报
- `POST /api/v1/adoption/report`
- 作用：上报 accept/reject/edit-accept 行为并关联 SBOM。
- 请求体：
```json
{
  "session_id": "sess_xxx",
  "request_id": "req_xxx",
  "adoption_type": "edit_accept",
  "file_path": "src/PaymentService.java",
  "line_start": 42,
  "line_end": 88
}
```

#### 7.2.4 审计日志上传
- `POST /api/v1/audit/upload`
- 作用：上传终端本地缓存审计事件（支持批量）。

### 7.3 管理端接口

#### 7.3.1 事件检索
- `GET /api/v1/admin/events`
- 查询参数：`start_time`、`end_time`、`risk_level`、`project_id`、`status`。

#### 7.3.2 会话回放
- `GET /api/v1/admin/replay/{session_id}`
- 返回：会话时间线、上下文摘要、模型输出、采纳动作、SBOM 快照。

#### 7.3.3 策略管理
- `POST /api/v1/admin/policies/publish`
- 作用：发布新策略版本并灰度生效。

#### 7.3.4 SBOM 查询
- `GET /api/v1/admin/sbom/{request_id}`
- 作用：按请求查看 AI-SBOM 明细。

#### 7.3.5 复核回写
- `POST /api/v1/admin/review/submit`
- 作用：提交人工/AI 复核结论，更新事件状态。

### 7.4 错误码设计
- `1001`：鉴权失败
- `1002`：设备指纹不匹配
- `1003`：ACL 权限不足
- `2001`：策略阻断（高风险越权）
- `3001`：模型服务不可用
- `4001`：请求参数不合法

---

## 8. 数据库设计

### 8.1 技术选型
- 网关主库：PostgreSQL 15
- 缓存与短期状态：Redis
- 大文本与回放片段：对象存储（可选）
- 终端本地离线缓存：SQLite

### 8.2 核心表设计（PostgreSQL）

### 8.2.1 用户与权限域

#### `users`
- `id` (PK)
- `username`
- `display_name`
- `status`
- `created_at`

#### `devices`
- `id` (PK)
- `user_id` (FK users.id)
- `device_fingerprint`
- `device_name`
- `status`
- `last_seen_at`

#### `projects`
- `id` (PK)
- `project_name`
- `security_level` (`high`/`normal`)
- `status`

#### `repos`
- `id` (PK)
- `project_id` (FK projects.id)
- `repo_name`
- `repo_path`

#### `acl_bindings`
- `id` (PK)
- `user_id` (FK users.id)
- `project_id` (FK projects.id)
- `repo_id` (FK repos.id)
- `can_read`
- `can_write`
- `updated_at`
- 索引：`(user_id, repo_id)`、`(project_id, repo_id)`

### 8.2.2 会话与请求域

#### `sessions`
- `id` (PK)
- `user_id`
- `device_id`
- `project_id`
- `repo_id`
- `started_at`
- `ended_at`
- `client_version`
- 索引：`(user_id, started_at desc)`

#### `requests`
- `id` (PK, request_id)
- `session_id` (FK sessions.id)
- `prompt_text`
- `context_summary`
- `input_tokens`
- `output_tokens`
- `latency_ms`
- `risk_level`
- `risk_action`
- `created_at`
- 索引：`(session_id, created_at)`、`(risk_level, created_at)`

#### `responses`
- `id` (PK)
- `request_id` (FK requests.id)
- `model_name`
- `model_version`
- `response_text`
- `is_blocked`
- `created_at`

#### `adoption_events`
- `id` (PK)
- `request_id` (FK requests.id)
- `adoption_type` (`accept`/`reject`/`edit_accept`)
- `file_path`
- `line_start`
- `line_end`
- `commit_id`
- `created_at`
- 索引：`(request_id)`、`(commit_id)`

### 8.2.3 风险与策略域

#### `risk_events`
- `id` (PK)
- `request_id` (FK requests.id)
- `risk_type` (`acl_code_leak`)
- `risk_level` (`low`/`medium`/`high`)
- `confidence`
- `action` (`allow`/`alert`/`block`)
- `evidence`
- `status` (`new`/`reviewing`/`closed`)
- `created_at`
- 索引：`(risk_level, status, created_at desc)`

#### `policies`
- `id` (PK)
- `policy_name`
- `policy_version`
- `content_json`
- `status` (`draft`/`active`/`archived`)
- `published_at`

#### `policy_publish_history`
- `id` (PK)
- `policy_id` (FK policies.id)
- `published_by`
- `gray_ratio`
- `created_at`

### 8.2.4 AI-SBOM 域

#### `ai_sbom_records`
- `id` (PK)
- `request_id` (FK requests.id, unique)
- `session_id`
- `user_id`
- `project_id`
- `repo_id`
- `model_name`
- `model_version`
- `prompt_hash`
- `context_fingerprint`
- `output_fingerprint`
- `risk_level`
- `adoption_type`
- `file_path`
- `line_start`
- `line_end`
- `commit_id`
- `generated_at`
- `adopted_at`
- `committed_at`
- 索引：`(project_id, generated_at)`、`(commit_id)`、`(risk_level, generated_at)`

### 8.2.5 回放与复核域

#### `replay_snapshots`
- `id` (PK)
- `session_id`
- `request_id`
- `snapshot_uri`
- `created_at`

#### `review_tasks`
- `id` (PK)
- `risk_event_id` (FK risk_events.id)
- `review_type` (`manual`/`ai`)
- `assignee`
- `result` (`true_positive`/`false_positive`/`needs_followup`)
- `comment`
- `completed_at`
- 索引：`(result, completed_at desc)`

### 8.3 本地 SQLite 表（终端）
- `local_audit_queue`：待上传审计事件。
- `local_session_cache`：最近会话与 request_id 映射。
- `local_config`：终端配置与策略版本号。

---

## 9. AI-SBOM 设计

### 9.1 定义
- AI-SBOM 是 AI 生成代码的来源与演化清单，用于溯源、审计、责任界定和质量分析。

### 9.2 生命周期
1. 生成时：写入候选 SBOM（包含模型、请求、指纹）。
2. 采纳时：补齐文件路径、行号、采纳类型。
3. 提交时：关联 commit_id。
4. 复核时：关联风险结论与处置结果。

### 9.3 典型查询
- 按 `commit_id` 查询本次提交中的 AI 代码占比。
- 按 `request_id` 回放完整链路。
- 按 `project_id + 时间` 统计高风险生成趋势。

---

## 10. 安全与合规设计（V1）

### 10.1 当前阶段策略
- 重点风险：越权泄露。
- 审计留存：默认 180 天，可配置。
- 回放权限：管理员可回放。
- 低打扰：默认后台告警，前台仅高风险阻断。

### 10.2 预留能力
- 字段级加密开关（后续版本启用）。
- 多模型路由策略扩展位（当前固定单模型）。

---

## 11. 非功能设计

### 11.1 性能目标
- 终端本地预检延迟：< 50ms。
- 网关风控处理附加延迟：P95 < 150ms（不含模型推理）。
- 流式首包时间：< 800ms（依赖模型服务）。

### 11.2 可用性目标
- 网关服务可用性：99.9%。
- 审计写入成功率：99.99%（断网重传保障）。

### 11.3 扩展性目标
- 接口与数据模型支持后续多模型、多策略、多租户扩展。

---

## 12. 部署设计

### 12.1 环境划分
- Dev：单机部署（网关 + Qwen + PostgreSQL + Redis）。
- Staging：近生产配置，开启灰度策略与回放验证。
- Prod：多副本网关 + 独立数据库 + 监控告警。

### 12.2 关键组件
- iCode Terminal（开发者机器）
- Smart Code Security Gateway（K8s）
- Qwen Inference Service（内网）
- PostgreSQL / Redis / Object Storage
- Admin Console（Web）

---

## 13. 端到端测试用例（E2E）

### 13.1 测试说明
- 目标：验证“可用性、低打扰、越权防护、可追溯闭环”。
- 范围：终端、网关、模型、管理端、数据层全链路。
- 原则：E2E 从 CLI 发起，管理端页面完成结果验证与复核闭环。

### 13.2 CLI 驱动的端到端流程设计

1. 在 CLI 使用 `icode start` 建立会话并获取 `session_id`。
2. 在 CLI 使用 `icode gen` 发起请求并记录 `request_id`。
3. CLI 完成采纳动作（accept/reject/edit_accept）并上报。
4. 管理端以 `request_id/session_id` 进入页面验证：
   - Dashboard：指标是否变化。
   - Event Stream：事件是否产生、级别是否正确。
   - Replay：会话输入输出和采纳轨迹是否完整。
   - Policy Editor：策略版本是否命中当前请求。
   - Review Queue：中风险是否进入复核队列。
5. 在 SBOM 查询页面（或会话详情中的 SBOM 面板）校验溯源字段完整性。

### 13.3 页面验证清单（覆盖网关主要页面）

| 页面 | 验证入口 | 关键校验点 |
|---|---|---|
| Dashboard | 管理端首页 | RPM、拦截率、事件数量随 CLI 请求变化 |
| Event Stream | 事件流列表 | request_id 可检索，风险级别与动作准确 |
| Replay | 会话回放页 | 输入、上下文摘要、输出、采纳动作完整 |
| Policy Editor | 策略管理页 | policy_version 命中、生效时间正确 |
| Review Queue | 复核队列页 | 中风险事件入队，复核状态可流转 |
| SBOM 面板/查询 | 会话详情或 SBOM 查询页 | 模型、指纹、文件落点、commit 关联完整 |

### 13.4 用例清单（CLI 起点 + 页面可验证）

| 用例ID | 场景 | 前置条件 | CLI步骤 | 页面验证 | 预期结果 |
|---|---|---|---|---|---|
| E2E-001 | 正常补全链路 | 用户有项目权限，网关在线 | `icode start` -> `icode gen` | Dashboard + Event Stream | 返回流式结果，风险=low，事件可检索 |
| E2E-002 | 高风险越权阻断 | 用户无目标仓库 ACL | `icode gen "索要受限仓库代码"` | Event Stream + Replay | 网关阻断，risk=high/action=block，回放有阻断原因 |
| E2E-003 | 中风险后台告警 | 输出与受限代码弱相似 | `icode gen "模糊探测prompt"` | Event Stream + Review Queue | 前台放行，后台产生复核任务 |
| E2E-004 | 采纳行为上报 | 正常生成完成 | `icode gen` 后 accept | Replay | 回放页显示 adoption_type=accept |
| E2E-005 | 修改后采纳上报 | 正常生成完成 | `icode gen` 后编辑并 accept | Replay + SBOM 面板 | adoption_type=edit_accept，文件行号与 SBOM 一致 |
| E2E-006 | 拒绝上报 | 正常生成完成 | `icode gen` 后 reject | Replay | adoption_type=reject |
| E2E-007 | AI-SBOM 生成 | 正常生成完成 | `icode gen` 记录 request_id | SBOM 面板/查询页 | 模型、指纹、落点字段完整 |
| E2E-008 | 提交关联 SBOM | 已采纳代码并提交 Git | CLI 触发提交关联上报 | SBOM 面板/查询页 | sbom.commit_id 更新成功 |
| E2E-009 | 会话回放完整性 | 已存在会话数据 | 通过 CLI 生成并采纳一次 | Replay | 输入/输出/采纳/风险全过程可查看 |
| E2E-010 | 审计 180 天策略 | 默认留存策略生效 | 触发清理任务 | Dashboard + Event Stream | 过期数据归档或清理，统计变化正确 |
| E2E-011 | 终端离线上报 | 网关暂时不可达 | 断网 `icode gen`，恢复网络 | Event Stream | 本地缓存事件自动重传并可检索 |
| E2E-012 | 设备指纹异常 | 伪造 device_id | `icode start` | Event Stream | 返回 1002，会话建立失败并留痕 |
| E2E-013 | token 失效 | token 过期 | `icode gen` | Event Stream | 返回 1001，拒绝请求并留痕 |
| E2E-014 | 策略热发布命中 | 存在策略草稿 | `icode gen` 前后各请求一次 | Policy Editor + Event Stream | 新请求命中新 policy_version |
| E2E-015 | 大上下文裁剪 | 输入超长上下文 | `icode gen` 携带大上下文 | Replay + SBOM 面板 | 请求成功，context_summary 含裁剪标识 |
| E2E-016 | 流式中断恢复 | 网络抖动 | `icode gen` 中途断连后恢复 | Replay + Event Stream | 会话状态正确闭合并记录异常 |
| E2E-017 | 页面筛选下钻 | 有多条风险事件 | CLI 连续制造不同风险级别事件 | Dashboard + Event Stream | 可按项目/级别筛选并准确下钻 |
| E2E-018 | AI 复核回写 | 有中风险待复核任务 | CLI 触发中风险事件 | Review Queue + Event Stream | AI复核提交后状态流转一致 |
| E2E-019 | 单模型可用性 | Qwen 服务在线 | CLI 连续 100 次 `icode gen` | Dashboard | 成功率和延迟达标 |
| E2E-020 | 全链路闭环验收 | 全链路在线 | `icode start` -> `icode gen` -> 采纳 -> 提交 | 全部主要页面 | request/adoption/risk/sbom/replay 数据一致 |

### 13.5 重点断言
- 数据一致性：`request_id` 在 requests/risk_events/adoption_events/ai_sbom_records 中一致。
- 处置正确性：仅高风险越权触发阻断。
- 体验约束：非高风险场景不出现阻塞式前台干预。
- 页面覆盖性：Dashboard/Event Stream/Replay/Policy Editor/Review Queue/SBOM 至少各被 1 条 E2E 覆盖。

---

## 14. 里程碑建议

- M1：终端与网关最小可用链路（会话、生成、审计）。
- M2：高风险越权检测与阻断上线。
- M3：AI-SBOM 全量打通（采纳、提交、回放）。
- M4：管理端复核闭环与运营报表上线。

---

## 15. 附录：建议的实施优先级

- P0：会话鉴权、流式生成、审计落库、AI-SBOM 最小字段。
- P1：越权泄露检测、管理端事件流、会话回放。
- P2：AI 复核、策略灰度、报表与治理优化。
