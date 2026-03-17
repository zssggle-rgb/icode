# 智码 (iCode) 系统设计方案 V2.1

## 1. 总体架构
本方案旨在构建一个安全、可控的企业级 AI 编程辅助系统，强调“端云协同”与“数据最小化”原则。
核心组件职责明确化：
1.  **智码终端 (iCode Terminal)**：开发者 CLI 工具，负责身份绑定和上下文采集，**不进行本地 DLP**（根据用户最新指示移除）。
2.  **智码安全网关 (iCode Security Gateway)**：系统的中枢神经，作为**中间层 (Middle Layer)**，负责统一接入、鉴权、审计，并将请求**代理转发**给后端 LLM 服务（如 OpenAI/Azure/私有模型），网关本身不具备模型推理能力。

## 2. 智码终端 (iCode Terminal) 设计
基于 `opencode` 改造。

### 2.1 核心模块
*   **设备指纹 (Device Fingerprint)**
    *   **功能**: 生成基于硬件特征 (CPU, Hostname, OS) 的唯一标识。
    *   **实现**: `src/icode/device.ts` 使用 SHA-256 算法生成 16 位指纹。
    *   **用途**: 在会话初始化 (`/api/v1/session/init`) 时上报，用于服务端设备绑定校验。
*   **上下文感知 (Context Gathering)**
    *   **功能**: 自动收集当前工作区的代码片段，提供给 LLM 以增强回答准确性。
    *   **实现**: `src/icode/context.ts` 遍历当前目录，读取 TS/JS/Java 等源文件。
    *   **变更**: 移除了本地 DLP 扫描逻辑，原始内容直接发送给网关，由网关或上游服务处理（如有需要）。

### 2.2 CLI 命令改造
*   `icode start`: 增加 `--device` 参数，默认自动采集设备指纹。
*   `icode gen`: 收集 Prompt 和 Context，直接发送给网关。

## 3. 智码安全网关 (iCode Security Gateway) 设计
基于 `icodegateway` 目录构建，采用前后端分离架构。

### 3.1 技术栈
*   **后端**: Bun + Hono (高性能 Web 框架)
*   **前端**: React + Vite + Tailwind CSS (基于现有 `icodegateway` 源码)
*   **通信**: REST API (JSON)

### 3.2 目录结构规划
```
icodegateway/
├── package.json          # 项目配置
├── vite.config.ts        # 前端构建配置
├── server/               # 后端服务
│   ├── index.ts          # 服务入口 (代理逻辑)
└── src/                  # 前端源码
```

### 3.3 核心 API 定义 (代理模式)
1.  **会话初始化**
    *   `POST /api/v1/session/init`
    *   输入: `user_id`, `device_fingerprint`, `repo_id`
    *   输出: `session_id`, `policy_version`
2.  **代码生成 (Proxy)**
    *   `POST /api/v1/chat/completions`
    *   输入: `session_id`, `prompt`, `context`
    *   输出: `content` (LLM 回复)
    *   **逻辑**: 
        1.  校验 Session 有效性。
        2.  (可选) 服务端审计/过滤。
        3.  **透传请求**至上游 LLM 服务 (OpenAI/Azure 等)。
        4.  接收 LLM 响应并返回给终端。
    *   **说明**: 网关仅作为管道 (Pipe)，不生产内容。
3.  **采纳率上报**
    *   `POST /api/v1/adoption/report`
    *   输入: `request_id`, `adoption_type` (accept/reject)

### 3.4 管理控制台
*   **Dashboard**: 监控 API 流量、Token 使用情况。
*   **审计日志**: 记录所有经过网关的请求摘要。

## 4. 变更记录 (V2 -> V2.1)
*   **移除**: 智码终端的本地 DLP 模块。
*   **澄清**: 网关的角色从“Mock 生成”调整为“代理转发 (Proxy)”。代码中明确了转发逻辑的位置。
