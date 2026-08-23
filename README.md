<div align="center">

# 3D Magnetic Pieces

*An open-source interactive 3D magnetic-tile building and learning platform for children and parents.*

*一个面向儿童与家长的开源交互式 3D 磁力片搭建与学习平台。*

[Live Demo](https://parent-child-magnetic-pieces.fun-bell-4118.chatgpt.site) · [English](#english) · [中文](#中文说明) · [Latest Release](https://github.com/fengyanhao/3D_Magnetic_Pieces/releases/latest) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

</div>

![3D Magnetic Pieces homepage](./src/test/e2e/visual-audit.spec.ts-snapshots/%E9%A6%96%E9%A1%B5-Desktop-1440-win32.png)

<a id="english"></a>

## Overview

3D Magnetic Pieces combines guided magnetic-tile tutorials with a browser-based 3D editor and a deterministic geometry engine. Families can explore models step by step, while contributors can extend the model catalog, connection rules, validation logic, and learning experience.

- Step-by-step 3D tutorials across multiple themes and difficulty levels
- Desktop 3D editor with geometry, connection, serialization, and validation tools
- Physical and semantic checks for pieces, connections, construction steps, and model integrity
- Responsive learning UI for desktop, tablet, and mobile devices
- Unit and Playwright E2E test suites covering models, routes, rendering, and editor workflows

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Routing:** React Router DOM 6
- **3D engine:** Three.js + `@react-three/fiber` + `@react-three/drei`
- **Testing:** Vitest 3 + Testing Library + Playwright

## Requirements

- Node.js 20 or later
- npm 10 or later

## Getting Started

### One-click startup on Windows

Double-click `启动磁力片网站.cmd`. The script checks port 5174, installs missing dependencies, starts the development server, and opens the browser. Run `停止磁力片网站.cmd` to stop it.

### Development commands

```bash
# Install dependencies
npm install

# Start the website on port 5174
npm run start-site

# Run unit tests in watch mode
npm test

# Run unit tests once
npm run test:run

# Run Playwright E2E tests
npm run test:e2e

# Type-check and create a production build
npm run build
```

Open <http://localhost:5174/>. See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete development and pull-request workflow.

## Deployment

The application uses `BrowserRouter`, so static hosting must provide an **SPA fallback** to `index.html`.

### Vercel

1. Push the repository to GitHub.
2. Import it into Vercel.
3. The included `vercel.json` supplies the required rewrite rule.

### Netlify

1. Push the repository to GitHub.
2. Import it into Netlify.
3. The included `netlify.toml` supplies the required redirect rule.

### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Project Structure

```text
src/
├── components/          # Shared UI and 3D scene components
│   ├── DesktopSiteShell.tsx  # Desktop navigation, breadcrumbs, and footer
│   ├── Header.tsx       # Page header
│   ├── ModelCard.tsx    # Model card
│   ├── MagnetScene.tsx  # 3D magnetic-tile scene
│   └── ErrorBoundary.tsx # Error boundary
├── data/                # Data layer
│   ├── types.ts         # TypeScript data types
│   ├── models.ts        # Model catalog
│   └── v2/              # v2 engine model definitions
├── engine/              # Geometry and connection engine
│   ├── shapes.ts        # Shape definitions
│   ├── solver.ts        # Connection solver
│   ├── validator.ts     # Physical validator
│   └── types.ts         # Engine types
├── pages/               # Route-level pages
│   ├── HomePage.tsx
│   ├── ModelListPage.tsx
│   ├── ModelDetailPage.tsx
│   ├── TutorialPage.tsx
│   └── NotFoundPage.tsx
├── test/                # Unit, integration, and E2E tests
│   ├── e2e/             # Playwright tests and visual snapshots
│   ├── models.test.ts
│   ├── geometry.inset.test.ts
│   └── engine.validator.test.ts
├── utils/               # Color and geometry helpers
├── App.tsx              # Application router
├── main.tsx             # Browser entry point
└── index.css            # Global styles
```

## Model Catalog

The project currently includes seven models across house, vehicle, rocket, animal, and castle themes.

| Model | ID | Theme | Difficulty | Age | Pieces | Steps | Structure |
|---|---|---|---|---|---:|---:|---|
| Cozy House | `house-1` | House | Medium | 4–6 | 12 | 3 | 3D |
| Race Car | `car-1` | Car | Easy | 3–5 | 5 | 4 | Flat |
| Rocket | `rocket-1` | Rocket | Medium | 4–6 | 6 | 4 | Flat |
| Cat | `cat-1` | Animal | Easy | 3–5 | 7 | 4 | Flat |
| Rainbow Castle | `castle-1` | Castle | Hard | 6–12 | 20 | 5 | 3D |
| Penguin | `penguin-1` | Animal | Easy | 3–4 | 8 | 4 | Flat |
| Dream 3D House | `flagship-house-1` | House | Hard | 5–10 | 29 | 9 | 3D |

Supported shapes: square, rectangle, equilateral triangle, isosceles triangle, right triangle, elongated right triangle, trapezoid, rhombus, pentagon, hexagon, sector, and semicircle.

## Features

### Home

- Featured models, theme browsing, and difficulty selection
- Popular-model grid on desktop and horizontal scrolling on mobile
- Direct entry points to the editor and learning center
- Parent-child play tips

### Model catalog and details

- Search and filters for theme, difficulty, age, and structure type
- Shareable URL-based filter state
- Interactive 3D preview, parts list, learning goals, and parent guidance
- Construction-step preview and a direct start-building action

### Step-by-step tutorials

- Interactive 3D construction scene with newly added pieces highlighted
- Clickable step timeline, parts list, instructions, and parent prompts
- Desktop split layout and mobile vertical layout
- Camera reset controls

### Learning center

- Shape reference
- Connection tutorials
- Basic structure exercises
- Safety and maintenance guidance

### 3D editor and engine

- Desktop model-authoring workspace
- Geometry, connection, serialization, and solver modules
- Physical, semantic, inventory, and step-coverage validation
- Unit, integration, route, visual-regression, and Playwright E2E tests

## Responsive Design

- **Desktop:** content up to 1440 px wide, shared top navigation and footer, and the complete editor workspace
- **Mobile:** optimized for a 390 px viewport with fixed bottom navigation
- **Tablet:** adaptive layout optimized around a 768 px viewport

The learning website is responsive across devices. The professional editor is intentionally optimized for desktop use.

## Roadmap

- [x] Local favorites
- [x] Saved building progress with `localStorage`
- [x] Magnetic-tile learning center
- [x] Desktop design system
- [ ] Voice guidance
- [ ] Video tutorial support
- [ ] User-uploaded models
- [ ] Social sharing
- [ ] Real magnetic-tile image assets
- [ ] Multilingual application UI
- [ ] Building timer
- [ ] Achievement system

## Contributing and License

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. The project is released under the [MIT License](LICENSE).

<a id="中文说明"></a>

## 中文说明

**亲子磁力片**是一个专为 3–6 岁儿童和家长设计的磁力片分步搭建教程网站。普通用户端为响应式网站，桌面端和移动端均提供优化体验；编辑器为电脑端专业网页工具。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 3
- **图标**: Lucide React
- **路由**: React Router DOM 6
- **3D 引擎**: Three.js + @react-three/fiber + @react-three/drei
- **测试**: Vitest 3 + Testing Library + Playwright

## 环境要求

- Node.js >= 20
- npm >= 10

## 快速开始

### 一键启动（Windows）

双击运行 `启动磁力片网站.cmd`，脚本会自动：
- 检查端口 5174 是否占用
- 检查并安装依赖
- 启动开发服务器
- 自动打开浏览器

停止服务请运行 `停止磁力片网站.cmd`。

### 开发命令

```bash
# 安装依赖
npm install

# 启动磁力片网站（端口 5174）
npm run start-site

# 运行单元测试（watch 模式）
npm test

# 运行单元测试（非 watch 模式）
npm run test:run

# 运行 E2E 测试（自动启动开发服务器）
npm run test:e2e

# 构建生产版本
npm run build
```

访问 http://localhost:5174/ 查看网站。

## 部署说明

本项目使用 `BrowserRouter`，部署到静态服务器时需要配置 **SPA fallback**。

### Vercel 部署
1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. `vercel.json` 已配置好 rewrite 规则

### Netlify 部署
1. 将代码推送到 GitHub
2. 在 Netlify 导入项目
3. `netlify.toml` 已配置好 redirect 规则

### Nginx 部署
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── DesktopSiteShell.tsx  # 桌面网站统一外壳（导航、面包屑、页脚）
│   ├── Header.tsx       # 页面头部组件
│   ├── ModelCard.tsx    # 模型卡片组件
│   ├── MagnetScene.tsx  # 3D 磁力片场景组件
│   └── ErrorBoundary.tsx # 错误边界
├── data/               # 数据层
│   ├── types.ts        # TypeScript 类型定义
│   ├── models.ts       # 模型数据
│   └── v2/             # v2 引擎模型定义
├── engine/             # 3D 引擎
│   ├── shapes.ts       # 形状定义
│   ├── solver.ts       # 连接求解器
│   ├── validator.ts    # 物理校验器
│   └── types.ts        # 引擎类型
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 首页
│   ├── ModelListPage.tsx # 模型列表页
│   ├── ModelDetailPage.tsx # 模型详情页
│   ├── TutorialPage.tsx # 分步教程页
│   └── NotFoundPage.tsx # 404 页面
├── test/               # 测试文件
│   ├── e2e/            # Playwright E2E 测试
│   ├── models.test.ts  # 模型数据校验测试
│   ├── geometry.inset.test.ts # 几何内缩测试
│   └── engine.validator.test.ts # 引擎校验测试
├── utils/              # 工具函数
│   ├── color.ts        # 颜色解析
│   └── geometry.ts     # 几何工具
├── App.tsx             # 应用入口
├── main.tsx            # 主入口文件
└── index.css           # 全局样式
```

## 模型数据

已包含7个模型，涵盖房子、汽车、火箭、动物、城堡等主题：

| 模型名称 | 模型ID | 主题 | 难度 | 适合年龄 | 零件数 | 步骤数 | 结构类型 |
|---------|--------|------|------|---------|--------|--------|---------|
| 温馨小房子（基础案例） | house-1 | 房子 | 中等 | 4-6岁 | 12片 | 3步 | 立体 |
| 赛车 | car-1 | 汽车 | 简单 | 3-5岁 | 5片 | 4步 | 平面 |
| 火箭 | rocket-1 | 火箭 | 中等 | 4-6岁 | 6片 | 4步 | 平面 |
| 小猫 | cat-1 | 动物 | 简单 | 3-5岁 | 7片 | 4步 | 平面 |
| 彩虹城堡 | castle-1 | 城堡 | 困难 | 6-12岁 | 20片 | 5步 | 立体 |
| 企鹅 | penguin-1 | 动物 | 简单 | 3-4岁 | 8片 | 4步 | 平面 |
| 梦幻立体小屋（复杂旗舰案例） | flagship-house-1 | 房子 | 困难 | 5-10岁 | 29片 | 9步 | 立体 |

**形状支持**：正方形、长方形、等边三角形、等腰三角形、直角三角形、长直角三角形、梯形、菱形、五边形、六边形、扇形、半圆（共12种）

## 当前功能

### 首页
- 精选推荐模型（桌面端左右布局）
- 按主题浏览入口
- 按难度选择
- 热门模型列表（桌面端网格，移动端横向滚动）
- 编辑器入口、学堂入口
- 陪玩小贴士

### 模型列表页
- 搜索功能
- 桌面端左侧常驻筛选栏 + 右侧大网格
- 移动端筛选展开面板
- 支持按主题、难度、年龄、结构类型筛选
- 支持 URL 分享筛选状态

### 模型详情页
- 左侧/上方 3D 磁力片预览（桌面端大画布 sticky）
- 右侧方案信息、材料清单、开始搭建按钮
- 能力目标标签、家长陪玩提示
- 搭建步骤预览

### 分步教程页
- 桌面端：左侧大画布 + 右侧步骤信息面板（含时间轴、零件清单、说明、家长引导）
- 移动端：纵向步骤布局
- 3D 磁力片分步搭建场景
- 本步新增零件高亮
- 操作说明和家长引导话术
- 步骤时间轴（可点击跳转）
- 3D 场景重置视角按钮

### 磁力片学堂
- 基础形状百科
- 基础连接教学
- 基础结构练习
- 安全与维护

### 3D 编辑器与引擎
- 电脑端专业模型编辑工作台
- 几何、连接、序列化与求解器模块
- 物理、语义、材料清单与步骤覆盖校验
- 单元、集成、路由、视觉回归与 Playwright E2E 测试

## 适配说明

网站采用响应式设计：
- **桌面端**：最大内容宽度 1440px，充分利用横向空间，统一顶部导航和页脚
- **移动端**：390px 宽度优化，底部固定导航栏
- **平板端**：768px 适配，过渡式布局

编辑器为电脑端专业网页工具，在桌面端提供完整工作台体验。

## 后续扩展方向

- [x] 收藏功能（本地存储）- 已实现
- [x] 搭建进度保存（localStorage）- 已实现
- [x] 磁力片学堂 - 已实现
- [x] 桌面网站设计体系 - 已实现
- [ ] 添加语音播报功能
- [ ] 添加视频教程支持
- [ ] 添加用户上传模型功能
- [ ] 添加社交分享功能
- [ ] 接入真实磁力片图片资源
- [ ] 添加多语言支持
- [ ] 添加搭建计时功能
- [ ] 添加成就系统

## 参与贡献与许可证

提交 Issue 或 Pull Request 前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。本项目采用 [MIT License](LICENSE) 开源许可证。
