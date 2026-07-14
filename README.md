# 亲子磁力片搭建教程

一个专为3-6岁儿童和家长设计的磁力片分步搭建教程Web应用。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **样式**: Tailwind CSS 3
- **图标**: Lucide React
- **路由**: React Router DOM 6

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/ 查看应用。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── Header.tsx       # 页面头部组件
│   ├── ModelCard.tsx    # 模型卡片组件
│   └── MagnetScene.tsx  # 3D 磁力片场景组件
├── data/               # 数据层
│   ├── types.ts        # TypeScript类型定义
│   └── models.ts       # 模型数据（Mock数据）
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 首页
│   ├── ModelListPage.tsx # 模型列表页
│   ├── ModelDetailPage.tsx # 模型详情页
│   └── TutorialPage.tsx # 分步教程页
├── App.tsx             # 应用入口
├── main.tsx            # 主入口文件
└── index.css           # 全局样式
```

## 如何新增模型数据

所有模型数据存储在 `src/data/models.ts` 文件中。要新增模型，只需按照以下数据结构添加一个新的模型对象：

```typescript
{
  id: 'unique-id',
  name: '模型名称',
  theme: 'house' | 'car' | 'rocket' | 'animal' | 'castle' | 'other',
  difficulty: 'easy' | 'medium' | 'hard',
  ageRange: '3-4岁',
  estimatedTime: '15分钟',
  coverImage: 'data:image/svg+xml;utf8,...', // 静态占位封面
  description: '模型描述',
  parts: [
    { id: 'p1', name: '红色正方形磁力片', color: 'red', count: 4, shape: 'square' }
  ],
  skills: ['磁力片边对边吸合', '空间想象力'],
  parentTips: ['引导孩子...'],
  steps: [
    {
      id: 1,
      title: '步骤标题',
      description: '操作说明',
      parentGuide: '家长引导话术',
      pieces: [
        // partId 对应 parts 中的 id
        // position 单位是“片边长”，rotation 为欧拉角（deg）
        { partId: 'p1', position: [0, 0, 0], rotation: [90, 0, 0] }
      ]
    }
  ]
}
```

新增模型后，无需修改任何页面代码，新模型会自动显示在首页和列表页中。

### 磁力片形状可选值

- `square`：正方形
- `rectangle`：长方形
- `equilateral-triangle`：等边三角形
- `isosceles-triangle`：等腰三角形
- `rhombus`：菱形
- `trapezoid`：梯形
- `hexagon`：六边形
- `sector`：扇形
- `pentagon`：五边形

### 磁力片颜色可选值

`red`、`orange`、`yellow`、`green`、`cyan`、`blue`、`purple`、`pink`、`white`、`black`、`clear`

## 当前功能

### 首页
- 产品名称展示
- 今日推荐模型
- 按主题浏览入口（房子、汽车、火箭、动物、城堡）
- 按难度选择（简单、中等、困难）
- 热门模型列表
- 陪玩小贴士

### 模型列表页
- 展示多个模型卡片
- 支持按主题筛选
- 支持按难度筛选
- 支持按年龄筛选

### 模型详情页
- 模型名称和 3D 磁力片预览
- 适合年龄、难度、预计耗时
- 所需零件清单（带颜色和磁力片形状）
- 能力目标标签
- 家长陪玩提示
- 搭建步骤数量预览
- 开始搭建按钮

### 分步教程页
- 当前步骤编号和进度条
- 3D 磁力片分步搭建场景（可拖拽旋转视角）
- 本步新增零件
- 操作说明
- 家长引导话术
- 步骤指示器（可点击跳转）
- 上一步 / 下一步按钮
- 完成页（庆祝动画、五星评价）

## 样例数据

已包含6个模型：
1. **温馨小房子** - 房子主题，简单难度，3步教程
2. **彩虹小汽车** - 汽车主题，简单难度，3步教程
3. **太空火箭** - 火箭主题，中等难度，4步教程
4. **可爱小猫咪** - 动物主题，简单难度，3步教程
5. **彩虹城堡** - 城堡主题，困难难度，4步教程
6. **聪明小企鹅** - 动物主题，简单难度，3步教程

每个模型都使用磁力片零件数据，并在模型详情页和分步教程页中以 3D 形式展示。

## 适配说明

应用采用移动端优先设计，最大宽度限制为480px，在手机上体验最佳。支持安全区域适配（Safe Area），兼容刘海屏和底部横条。

## 后续扩展方向

- [ ] 添加收藏功能（本地存储）
- [ ] 添加搭建进度保存
- [ ] 添加语音播报功能
- [ ] 添加视频教程支持
- [ ] 添加用户上传模型功能
- [ ] 添加社交分享功能
- [ ] 接入真实磁力片图片资源
- [ ] 支持更多 3D 视角（自动旋转、重置视角）
- [ ] 添加多语言支持
- [ ] 添加搭建计时功能
- [ ] 添加成就系统
