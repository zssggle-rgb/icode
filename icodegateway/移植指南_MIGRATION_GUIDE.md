# 智码安全网关 (Smart Code Gateway) 移植指南

本文档将指导您如何将生成的 **智码安全网关** 界面移植到现有的 React 项目中。

## 1. 目录结构说明

导出的 `smart_code_gateway_export` 目录结构如下：

```
smart_code_gateway_export/
├── index.html                 # 示例入口 HTML (含 Tailwind 配置)
├── src/
│   ├── components/            # 公共组件依赖
│   │   ├── Header.tsx         # 顶部导航栏
│   │   └── Sidebar.tsx        # 侧边栏菜单
│   └── smart_code_gateway/    # 核心业务模块
│       ├── App.tsx            # 网关主入口组件
│       ├── main.tsx           # 挂载入口
│       └── components/        # 网关功能页面 (Dashboard, Monitor, Audit...)
```

## 2. 移植步骤

### 第一步：复制文件

将 `smart_code_gateway_export/src` 下的所有内容复制到您的目标项目的 `src` 目录下。

*   如果您的项目已有 `src/components` 目录，请将 `Header.tsx` 和 `Sidebar.tsx` 放入其中，并**注意检查文件名冲突**。
*   如果路径发生变化，您可能需要修改 `smart_code_gateway/App.tsx` 中对 `Sidebar` 和 `Header` 的引用路径。

### 第二步：安装依赖

在目标项目的根目录下，运行以下命令安装必要的依赖库：

```bash
npm install echarts echarts-for-react lucide-react
```

*   **echarts**: 图表绘制引擎
*   **echarts-for-react**: React 封装组件
*   **lucide-react**: 图标库

### 第三步：配置样式 (Tailwind CSS)

本网关界面依赖 **Tailwind CSS**。

**情况 A：您的项目已使用 Tailwind CSS**
无需额外操作，样式应能直接生效。

**情况 B：您的项目未使用 Tailwind CSS**
您可以选择以下两种方式之一：

1.  **快速集成（推荐用于演示）**：
    参考 `smart_code_gateway_export/index.html`，在您的 `index.html` `head` 中引入 CDN 和配置：
    ```html
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              slate: { 50: '#f8fafc', /* ...完整配置参考 index.html */ 900: '#0f172a' },
              primary: { 50: '#eff6ff', /* ... */ 700: '#1d4ed8' }
            }
          }
        }
      }
    </script>
    ```

2.  **正式集成**：
    按照 Tailwind CSS 官方文档在项目中安装并配置 `tailwind.config.js`。

### 第四步：路由集成

在您的应用路由配置中，添加指向 `src/smart_code_gateway/App.tsx` 的路由。

例如（使用 React Router）：

```tsx
import SmartCodeGatewayApp from './smart_code_gateway/App';

// 在路由定义中：
<Route path="/gateway/*" element={<SmartCodeGatewayApp />} />
```

## 3. 常见问题排查

*   **TS 报错：找不到模块**：
    *   检查 `App.tsx` 中 `import Sidebar` 的路径是否正确指向了您复制后的位置。
*   **样式错乱**：
    *   确保 Tailwind CSS 已生效。
    *   检查是否有全局 CSS 样式冲突（本网关主要使用 `slate-50` 背景色和 `Inter/Noto Sans SC` 字体）。
*   **图标不显示**：
    *   确认 `lucide-react` 已正确安装。

---
© 2026 智码安全
