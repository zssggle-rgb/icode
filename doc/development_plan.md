# 智码 (iCode) 开发实施计划与详细需求响应

## 1. 概览
本计划旨在逐条响应 `requirements_detail.md`、`system_detailed_design.md` 和 `user_journey.md` 的内容，并制定具体的开发实施方案。

## 2. 关键约束与偏离说明 (Crucial Constraints)
根据您的指示，本项目在执行过程中将遵循以下关键约束，部分内容将与原设计文档产生偏离：

| 约束项 | 原文档要求 | **实际执行标准 (本项目)** |
| :--- | :--- | :--- |
| **UI 设计风格** | "Prism 风格" (暗色系 SOC 风格, #0B1220) | **现有 `icodegateway` 风格 (亮色系 Light Mode)**<br>- 背景: `bg-slate-50`/`bg-white`<br>- 文字: `text-slate-800`/`text-slate-500`<br>- 主色: Blue (`#3b82f6`)<br>- 告警: Red (`#ef4444`)<br>- 组件: 圆角卡片, 浅色边框 `border-slate-200` |
| **DLP (防泄漏)** | 终端本地 DLP + 网关 DLP | **仅网关 DLP**<br>- 终端移除本地 DLP 逻辑<br>- 网关负责所有敏感数据识别与阻断<br>- 终端仅负责基础脱敏 (如 .env 过滤) |
| **网关模式** | 代码生成 Mock / 独立 LLM | **Proxy (代理) 模式**<br>- 网关作为中间层，转发请求至上游 LLM (如 OpenAI/Azure/Local)<br>- 在转发前后插入安全 Hook |

---

## 3. 需求逐条响应 (Detailed Response)

### 3.1 响应 `requirements_detail.md` (需求详情)

| 章节 | 需求点 | 状态 | 响应与实施细节 |
| :--- | :--- | :--- | :--- |
| **2.1** | **终端形态 (CLI)** | ✅ 已完成 | 已基于 `yargs` 构建 `icode` CLI，移除 GUI 依赖。 |
| **2.1** | **品牌定制** | ✅ 已完成 | `opencode` 命令已别名为 `icode`；Prompt 已修改为 `icode> `。 |
| **2.1** | **身份绑定** | ✅ 已完成 | 实现 `device.ts` 采集硬件指纹 (MAC/Serial)；启动时上报。 |
| **2.2** | **上下文采集** | 🔄 进行中 | `context.ts` 已实现基础文件读取。下一步集成 LSP 获取 AST/引用。 |
| **2.2** | **最小化上传** | 📅 待开发 | 需实现 `.codeignore` 解析与 Token 计数裁剪。 |
| **2.3** | **本地 DLP** | ❌ **已移除** | 根据指示，移除终端侧正则扫描，减轻端侧负担，逻辑移至网关。 |
| **2.4** | **风险交互** | 📅 待开发 | CLI 将根据网关返回的 `risk_level` (🟢/🟡/🔴) 展示不同颜色提示。 |
| **2.5** | **本地审计** | 📅 待开发 | 需引入 SQLite 存储离线日志，网络恢复后上传。 |
| **3.0** | **性能与兼容** | � 达标 | Node.js/Bun 跨平台支持；移除重型 DLP 后性能符合 <50ms 要求。 |

### 3.2 响应 `system_detailed_design.md` (系统设计)

| 章节 | 设计点 | 状态 | 响应与实施细节 |
| :--- | :--- | :--- | :--- |
| **3.1** | **总体架构** | 🔄 调整中 | 调整为 Proxy 架构。网关增加 `Upstream Provider` 适配层。 |
| **4.1** | **终端模块** | ✅ 已完成 | `src/icode/` 目录下已拆分 `device`, `context` 模块。 |
| **5.1** | **网关服务** | 🔄 进行中 | `server/index.ts` (Hono) 已搭建。需拆分 `services/` 目录 (Auth/Proxy/Audit)。 |
| **5.2** | **鉴权流程** | 📅 待开发 | 需实现 `Session Middleware`，校验 `X-Device-ID` 与 `Authorization` 头。 |
| **5.3** | **风险策略** | 📅 待开发 | 将在 Proxy 响应拦截器中实现：检测到高危内容即返回阻断错误码。 |
| **6.0** | **管理台设计** | 🎨 **重定义** | **完全忽略文档中的 Prism 暗色设计**。采用 `icodegateway` 现有的 React+Tailwind 亮色组件库开发。 |
| **8.0** | **数据库** | 📅 待开发 | 需设计 PostgreSQL Schema：`users`, `devices`, `sessions`, `audit_logs`。 |

### 3.3 响应 `user_journey.md` (用户旅程)

| 场景 | 旅程步骤 | 状态 | 响应与实施细节 |
| :--- | :--- | :--- | :--- |
| **Dev** | **启动与绑定** | ✅ 已完成 | 用户输入 `icode start` -> 上报设备指纹 -> 网关校验 (Mock)。 |
| **Dev** | **智能问答** | 🔄 进行中 | `icode gen` -> 网关 Proxy -> LLM -> 返回结果。 |
| **Dev** | **敏感拦截** | 📅 待开发 | 模拟场景：用户问“密钥” -> 网关识别 -> 返回“已拦截” -> CLI 显示红色警告。 |
| **Admin** | **实时监控** | 🔄 进行中 | Dashboard 原型已在 `GatewayDashboard.tsx` 中实现 (ECharts)。需对接真实 API。 |
| **Admin** | **策略配置** | 📅 待开发 | 需开发前端页面配置 DLP 规则 (Regex/Keyword)，下发至网关内存。 |
| **SRE** | **故障溯源** | 📅 待开发 | 需在网关响应头中注入 `X-Code-Source` (Model/Version)，CLI 记录到本地日志。 |

---

## 4. 详细开发计划 (Development Roadmap)

### 🔴 阶段一：核心骨架 (Core Skeleton) [已完成 90%]
*目标：打通 CLI 到 网关 的基础链路*
1.  **CLI**: `icode` 命令别名，设备指纹采集。
2.  **Gateway**: Hono Server 搭建，Proxy 接口 Stub (桩代码)。
3.  **Protocol**: 定义前后端通信的数据结构 (JSON)。

### 🟡 阶段二：数据与鉴权 (Data & Auth) [当前重点]
*目标：引入数据库，实现真实的用户身份管理*
1.  **Schema 设计**:
    *   `User`: id, username, role
    *   `Device`: id, fingerprint, user_id, status
    *   `Session`: id, token, expires_at
    *   `AuditLog`: id, req_id, prompt, response, risk_level
2.  **鉴权服务**:
    *   实现 `/auth/login` (或 Token 交换)。
    *   网关中间件验证 Session 有效性。
3.  **持久化**:
    *   引入 `drizzle-orm` 或 `prisma` 连接 PostgreSQL/SQLite。

### 🔵 阶段三：网关业务逻辑 (Gateway Business Logic)
*目标：实现 Proxy 转发与审计*
1.  **Proxy Service**:
    *   对接 OpenAI 兼容接口 (如 DeepSeek API)。
    *   实现流式响应 (SSE) 透传。
2.  **Audit Service**:
    *   异步写入审计日志到数据库。
    *   计算 Token 消耗。
3.  **Risk Engine (Basic)**:
    *   简单的关键词匹配拦截 (模拟 DLP)。

### 🟢 阶段四：管理台前端 (Admin Dashboard)
*目标：可视化的监控与管理*
1.  **Dashboard**:
    *   对接后端 `/api/stats` 接口，展示真实 RPM/Block 率。
    *   保持 **Light Mode** 风格。
2.  **审计日志页**:
    *   表格展示所有 AI 请求记录。
    *   支持按用户/时间筛选。

---

## 5. 立即执行项 (Immediate Actions)

根据当前进度，下一步将优先执行 **阶段二 (数据与鉴权)** 和 **阶段三 (网关逻辑)** 的任务：

1.  **修复网关类型错误**: 解决 `server/index.ts` 中的 TS 报错。
2.  **安装数据库依赖**: `bun add drizzle-orm postgres` (或 sqlite)。
3.  **定义 Schema**: 创建 `server/db/schema.ts`。
4.  **实现真实 Session**: 替换当前的 Mock 逻辑。
