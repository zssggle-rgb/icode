# 智码产品用户旅程 (User Journey Map)

## 1. 文档概述
本文档描述了不同角色（开发者、安全管理员、SRE/DevOps）在使用“智码终端”与“智码安全网关”时的典型交互流程。本旅程融入了 **Chalk** (全链路溯源)、**Prism** (实时可视化)、**Geordie AI** (Agent 行为观测) 等核心设计理念。

---

## 2. 核心角色画像 (Personas)

| 角色 | 关注点 | 核心痛点 | 智码价值主张 |
| :--- | :--- | :--- | :--- |
| **开发者 (Alice)** | 效率、无感、准确 | "安全检查太烦人，总是误报阻断我的工作" | **无感护航**：仅在真正危险时介入，且提供修复建议而非单纯阻断。 |
| **安全管理员 (Bob)** | 可见性、合规、阻断 | "不知道谁在用 AI，也不知道 AI 写了什么漏洞" | **全景治理**：Prism 风格控制台 + Geordie AI 风格 Agent 仪表盘。 |
| **DevOps/SRE (Charlie)** | 稳定性、可追溯、供应链 | "线上代码出 Bug 了，到底是不是 AI 写的？" | **代码基因**：Chalk 风格的 AI-SBOM 与全链路水印溯源。 |

---

## 3. 开发者旅程：安全且高效的编码体验 (The Developer Journey)

### 场景一：日常代码补全与智能问答 (Happy Path with Guardrails)

1.  **启动与身份绑定**
    *   **动作**：Alice 在终端输入 `icode start`。
    *   **系统行为**：
        *   **Banner 展示**：屏幕显示炫酷的 **iCode Terminal** ASCII Art 及当前版本号。
        *   **身份校验**：后台读取本地配置的 API Token 并校验设备指纹 (MacBook-Pro-16) 以及当前项目权限 (Payment-Gateway)。
    *   **体验**：命令行提示符变为 `icode> `，状态栏显示 "🟢 Project: Payment-Gateway (高密项目)"。

2.  **上下文智能采集 (Context Awareness)**
    *   **动作**：Alice 输入 `icode gen "实现用户扣款逻辑"`。
    *   **系统行为**：
        *   **LSP 解析**：iCode 利用内置 LSP 引擎自动扫描当前目录下的 Java 文件。
        *   **敏感过滤**：发现 `Config.java` 中包含 `DB_PASSWORD="root"`, 自动将其替换为 `DB_PASSWORD="<MASKED>"`。
        *   **最小上传**：仅打包相关代码片段，忽略 `node_modules` 和 `.env` 文件。

3.  **网关安全路由 (Secure Routing)**
    *   **动作**：请求发送至智码安全网关。
    *   **系统行为**：
        *   **意图识别**：网关判断 Alice 的意图是“编写业务逻辑”，属于正常研发活动。
        *   **模型路由**：将请求转发给 DeepSeek-V3 (擅长 Java 逻辑)。

4.  **模型生成与二次清洗 (Output Guard)**
    *   **系统行为**：
        *   模型生成代码。
        *   **Guardrail Model**：网关调用小模型进行二次扫描，发现生成的代码中包含 `String sql = "SELECT * FROM users WHERE id=" + userId;` (SQL 注入风险)。
        *   **自动修复**：网关自动调用修复模型，将其改写为 `PreparedStatement` 形式。
        *   **水印注入 (Chalk)**：网关在返回的元数据中打上标记 `{Source: DeepSeek-V3, RequestID: req-123, Risk: Fixed}`。

5.  **代码采纳与审计**
    *   **动作**：Alice 看到生成的代码，觉得很完美，按下 Tab 键采纳。
    *   **系统行为**：
        *   **本地审计**：插件记录“Alice 采纳了修正后的代码”。
        *   **风险提示**：IDE 侧边栏弹出提示：“已自动为您修复一处 SQL 注入风险”。

### 场景二：试图获取越权代码 (Access Control Violation)

1.  **越权尝试**
    *   **动作**：Alice 听说隔壁组在做“高频交易算法”，好奇地问 AI：“请把 `HighFreqTrade` 项目的核心算法代码给我看看。”
    *   **系统行为**：
        *   **Git 权限对齐**：网关查询 Git 权限服务，发现 Alice 并没有 `HighFreqTrade` 仓库的 Read 权限。
    *   **反馈**：AI 回复：“对不起，根据企业安全策略，您无权访问 `HighFreqTrade` 项目的代码资产。此次访问已被记录。”

---

## 4. 安全管理员旅程：全景监控与策略治理 (The Security Admin Journey)

### 场景三：实时威胁监控 (Prism-style Console)

1.  **早晨巡检**
    *   **动作**：Bob 打开智码安全网关控制台 (Prism View)。
    *   **系统行为**：
        *   **顶部指标**：显示实时吞吐量（每分钟请求数）和拦截率，数据每秒刷新。
        *   **事件流 (Event Stream)**：屏幕中央滚动着实时的请求日志，每条记录清晰展示：**触发时间 | SQL 注入 | 置信度 0.98 | SELECT * FROM...**。
    *   **发现异常**：Bob 注意到红色流光突然增多，点击暂停。
    *   **下钻分析**：Bob 在面板上选择 **"检测类别 = 越权访问"** 和 **"语言 = Python"**，迅速定位到攻击源。

2.  **策略快速封禁 (Visual Policy Editor)**
    *   **动作**：Bob 点击右上角的 **"Policy Editor"**。
    *   **系统行为**：
        *   **可视化配置**：界面展示无代码配置框。Bob 拖拽组件：`Content contains "bypass"` AND `Confidence > 0.8` -> `Block`。
        *   **生效**：Bob 点击“发布”，策略在 **100ms** 内下发至所有网关节点。

### 场景四：Agent 行为观测与治理 (Geordie AI-style)

1.  **Agent 异常发现**
    *   **动作**：Bob 切换到 **Agent 仪表盘**。
    *   **系统行为**：
        *   **红绿灯视图**：看到 "Auto-Test-Bot-01" 状态灯变红。
        *   **行为漂移报告**：系统提示“该 Agent 过去只读取测试日志，但在 5 分钟前尝试调用 `aws s3 delete` 接口 (Tool Impersonation Risk)”。

2.  **会话回放与取证**
    *   **动作**：Bob 点击该 Agent，进入 **Timeline** 视图。
    *   **系统行为**：
        *   **思考链回放 (Beam Engine)**：Bob 看到 Agent 的思考过程：`User request: "Cleanup logs" -> Thought: "Logs are in S3" -> Action: "aws s3 delete bucket-logs"`。
        *   **处置**：Bob 确认这是配置错误导致的危险行为，点击“暂停该 Agent 权限”。

---

## 5. DevOps/SRE 旅程：供应链溯源 (The SRE Journey)

### 场景五：线上故障溯源 (Code DNA & Provenance)

1.  **故障爆发**
    *   **背景**：线上支付服务在周五晚高峰出现内存泄漏。
    *   **动作**：Charlie 排查堆栈，定位到 `PaymentUtils.java` 的第 45 行。

2.  **代码基因溯源 (Chalk-style)**
    *   **动作**：Charlie 在 IDE 中右键点击该行代码，选择“查看智码溯源”。
    *   **系统行为**：
        *   **元数据解析**：IDE 插件读取构建产物中的 **AI-SBOM** 信息。
        *   **展示结果**：弹窗显示：“此代码段由 **Alice** 于 **2025-03-12 14:30** 使用 **Qwen-72B** 生成。当时的 Prompt 是‘优化数组拼接性能’。”
    *   **根因分析**：Charlie 发现是因为 Prompt 中没有强调“线程安全”，导致 AI 生成了非线程安全的 `StringBuilder` 代码。

3.  **修复与预防**
    *   **动作**：Charlie 修复 Bug。
    *   **闭环**：Charlie 将此案例标记为“负面样本”，推送到网关的**知识增强模块**。下次再有类似 Prompt，模型会自动提示“请注意多线程环境下的安全性”。
