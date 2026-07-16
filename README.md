# 亲子磁力片

一个专为3-6岁儿童和家长设计的磁力片分步搭建教程Web应用，支持PWA安装和本地一键启动。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 7
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

双击运行 `启动磁力片APP.cmd`，脚本会自动：
- 检查端口 5174 是否占用
- 检查并安装依赖
- 启动开发服务器
- 自动打开浏览器

停止服务请运行 `停止磁力片APP.cmd`。

### 开发命令

```bash
# 安装依赖
npm install

# 运行开发服务器（端口 5174）
npm run dev

# 运行单元测试（watch 模式）
npm test

# 运行单元测试（非 watch 模式）
npm run test:run

# 运行 E2E 测试（自动启动开发服务器）
npm run test:e2e

# 构建生产版本
npm run build
```

访问 http://localhost:5174/ 查看应用。

## PWA 安装

### 桌面端（Chrome/Edge）
1. 打开应用后，点击地址栏右侧的安装图标（⊕）
2. 或通过菜单 → 更多工具 → 创建快捷方式

### 移动端（Android/iOS）
1. 使用 Chrome 或 Safari 打开应用
2. 点击菜单 → 添加到主屏幕

安装后可离线使用，新版本会自动提示更新。

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

已包含6个模型，涵盖房子、汽车、火箭、动物、城堡等主题：

| 模型名称 | 主题 | 难度 | 适合年龄 | 零件数 | 步骤数 | 结构类型 |
|---------|------|------|---------|--------|--------|---------|
| 温馨小房子 | 房子 | 简单 | 3-4岁 | 20片 | 3步 | 立体 |
| 赛车 | 汽车 | 简单 | 3-5岁 | 12片 | 3步 | 平面 |
| 火箭 | 火箭 | 中等 | 4-6岁 | 15片 | 4步 | 平面 |
| 小猫 | 动物 | 简单 | 3-5岁 | 7片 | 3步 | 平面 |
| 彩虹城堡 | 城堡 | 困难 | 5-6岁 | 28片 | 4步 | 立体 |
| 企鹅 | 动物 | 简单 | 3-4岁 | 18片 | 4步 | 平面 |

**形状支持**：正方形、长方形、等边三角形、等腰三角形、直角三角形、长直角三角形、梯形、菱形、五边形、六边形、扇形、半圆（共12种）

## 当前功能

### 首页
- 产品名称展示
- 精选推荐模型
- 按主题浏览入口
- 按难度选择
- 热门模型列表
- 陪玩小贴士

### 模型列表页
- 展示多个模型卡片
- 支持按主题、难度、年龄区间筛选
- 支持 URL 分享筛选状态

### 模型详情页
- 模型名称和 3D 磁力片预览
- 适合年龄、难度、预计耗时
- 所需零件清单
- 能力目标标签
- 家长陪玩提示
- 搭建步骤数量预览

### 分步教程页
- 当前步骤编号和进度条
- 3D 磁力片分步搭建场景
- 本步新增零件高亮
- 操作说明和家长引导话术
- 步骤指示器（可点击跳转）
- 3D 场景重置视角按钮

### 磁力片学堂
- 认识磁力片
- 基础形状百科
- 基础连接教学
- 基础结构练习
- 安全与维护

## 适配说明

应用采用移动端优先设计，最大宽度限制为480px，在手机上体验最佳。支持安全区域适配（Safe Area），兼容刘海屏和底部横条。

## 后续扩展方向

- [x] 收藏功能（本地存储）- 已实现
- [x] 搭建进度保存（localStorage）- 已实现
- [x] 磁力片学堂 - 已实现
- [ ] 添加语音播报功能
- [ ] 添加视频教程支持
- [ ] 添加用户上传模型功能
- [ ] 添加社交分享功能
- [ ] 接入真实磁力片图片资源
- [ ] 添加多语言支持
- [ ] 添加搭建计时功能
- [ ] 添加成就系统