import { Model } from '../types';

/**
 * P3: 旗舰立体小屋（v2 修订版）
 *
 * 原创设计，未照搬 MagneticBlox 中任何模型。
 *
 * v1 使用长方形（rectangle）作为二层墙体，因长方形长边有 2 个端口，
 * 在闭环连接（墙角加固）中产生位置误差（2.0、1.0、1.4142）。
 * v2 改用正方形作为二层墙体（与一层墙体相同的连接方式），
 * 并新增直角三角形作为屋顶旗杆装饰，满足「至少 3 种形状」要求。
 *
 * 规格：
 * - 29 片零件
 * - 9 个步骤
 * - 3 种形状：正方形 / 等边三角形 / 直角三角形
 * - 5 种颜色：红 / 蓝 / 黄 / 绿 / 橙
 * - 结构：完整底座 + 四面双层墙体 + 金字塔屋顶 + 屋顶旗杆装饰
 * - 每步具备作者镜头和分批入场动画（P1 教学编排字段）
 *
 * 几何布局（底座 2×2，单位边长 1）：
 *   底座：base-00(-0.5,-0.5)  base-10(0.5,-0.5)
 *         base-01(-0.5, 0.5)  base-11(0.5, 0.5)
 *   一层墙：每面 2 片正方形，竖立 1 单位高
 *   二层墙：每面 2 片正方形，竖立叠加 1 单位高（与一层相同连接方式）
 *   屋顶：每面 2 片等边三角形，向内倾斜(-90°)形成金字塔屋顶
 *   旗杆：1 片直角三角形，立在屋顶前侧作为装饰（dihedral -90 向外倾斜）
 */
export const flagshipHouseV2: Model = {
  id: 'flagship-house-1',
  name: '梦幻立体小屋',
  theme: 'house',
  difficulty: 'hard',
  ageRange: '5-10岁',
  minAge: 5,
  maxAge: 10,
  estimatedTime: '35分钟',
  coverImage: '',
  description:
    '一座有完整底座、四面双层墙体和金字塔屋顶的立体小屋，使用正方形、等边三角形和直角三角形三种磁力片搭建，屋顶有橙色旗杆装饰，入口朝南。',
  buildMode: 'solid',
  parts: [
    { id: 'sq-red', name: '红色正方形磁力片', color: 'red', count: 4, shape: 'square' },
    { id: 'sq-blue', name: '蓝色正方形磁力片', color: 'blue', count: 8, shape: 'square' },
    { id: 'sq-yellow', name: '黄色正方形磁力片', color: 'yellow', count: 8, shape: 'square' },
    { id: 'tri-green', name: '绿色等边三角形磁力片', color: 'green', count: 8, shape: 'equilateral-triangle' },
    { id: 'tri-orange', name: '橙色直角三角形磁力片', color: 'orange', count: 1, shape: 'right-triangle' },
  ],
  pieces: [
    // 底座（4 片红色正方形）
    { id: 'base-00', partId: 'sq-red', isRoot: true },
    { id: 'base-10', partId: 'sq-red' },
    { id: 'base-01', partId: 'sq-red' },
    { id: 'base-11', partId: 'sq-red' },
    // 一层墙体（8 片蓝色正方形，每面 2 片）
    { id: 'wall-f-0', partId: 'sq-blue' },
    { id: 'wall-f-1', partId: 'sq-blue' },
    { id: 'wall-b-0', partId: 'sq-blue' },
    { id: 'wall-b-1', partId: 'sq-blue' },
    { id: 'wall-l-0', partId: 'sq-blue' },
    { id: 'wall-l-1', partId: 'sq-blue' },
    { id: 'wall-r-0', partId: 'sq-blue' },
    { id: 'wall-r-1', partId: 'sq-blue' },
    // 二层墙体（8 片黄色正方形，每面 2 片，与一层连接方式相同）
    { id: 'wall2-f-0', partId: 'sq-yellow' },
    { id: 'wall2-f-1', partId: 'sq-yellow' },
    { id: 'wall2-b-0', partId: 'sq-yellow' },
    { id: 'wall2-b-1', partId: 'sq-yellow' },
    { id: 'wall2-l-0', partId: 'sq-yellow' },
    { id: 'wall2-l-1', partId: 'sq-yellow' },
    { id: 'wall2-r-0', partId: 'sq-yellow' },
    { id: 'wall2-r-1', partId: 'sq-yellow' },
    // 屋顶（8 片绿色等边三角形，每面 2 片向内倾斜）
    { id: 'roof-f-0', partId: 'tri-green' },
    { id: 'roof-f-1', partId: 'tri-green' },
    { id: 'roof-b-0', partId: 'tri-green' },
    { id: 'roof-b-1', partId: 'tri-green' },
    { id: 'roof-l-0', partId: 'tri-green' },
    { id: 'roof-l-1', partId: 'tri-green' },
    { id: 'roof-r-0', partId: 'tri-green' },
    { id: 'roof-r-1', partId: 'tri-green' },
    // 屋顶旗杆装饰（1 片橙色直角三角形）
    { id: 'roof-flag-1', partId: 'tri-orange' },
  ],
  connections: [
    // ---- 底座内部（4 条）----
    { pieceA: 'base-00', portA: 'e1-p0', pieceB: 'base-10', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'base-00', portA: 'e2-p0', pieceB: 'base-01', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'base-10', portA: 'e2-p0', pieceB: 'base-11', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'base-01', portA: 'e1-p0', pieceB: 'base-11', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    // ---- 一层前墙（3 条）----
    { pieceA: 'base-00', portA: 'e0-p0', pieceB: 'wall-f-0', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base-10', portA: 'e0-p0', pieceB: 'wall-f-1', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'wall-f-0', portA: 'e1-p0', pieceB: 'wall-f-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    // ---- 一层后墙（3 条）----
    { pieceA: 'base-01', portA: 'e2-p0', pieceB: 'wall-b-0', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base-11', portA: 'e2-p0', pieceB: 'wall-b-1', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'wall-b-0', portA: 'e3-p0', pieceB: 'wall-b-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    // ---- 一层左墙（3 条）----
    { pieceA: 'base-00', portA: 'e3-p0', pieceB: 'wall-l-0', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base-01', portA: 'e3-p0', pieceB: 'wall-l-1', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'wall-l-0', portA: 'e3-p0', pieceB: 'wall-l-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    // ---- 一层右墙（3 条）----
    { pieceA: 'base-10', portA: 'e1-p0', pieceB: 'wall-r-0', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base-11', portA: 'e1-p0', pieceB: 'wall-r-1', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'wall-r-0', portA: 'e1-p0', pieceB: 'wall-r-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    // ---- 一层墙角（4 条）----
    { pieceA: 'wall-f-0', portA: 'e3-p0', pieceB: 'wall-l-0', portB: 'e1-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall-f-1', portA: 'e1-p0', pieceB: 'wall-r-0', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall-r-1', portA: 'e1-p0', pieceB: 'wall-b-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall-b-0', portA: 'e1-p0', pieceB: 'wall-l-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    // ---- 二层前墙（3 条，与一层连接方式相同）----
    { pieceA: 'wall-f-0', portA: 'e2-p0', pieceB: 'wall2-f-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall-f-1', portA: 'e2-p0', pieceB: 'wall2-f-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall2-f-0', portA: 'e1-p0', pieceB: 'wall2-f-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    // ---- 二层后墙（3 条）----
    { pieceA: 'wall-b-0', portA: 'e2-p0', pieceB: 'wall2-b-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall-b-1', portA: 'e2-p0', pieceB: 'wall2-b-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall2-b-0', portA: 'e3-p0', pieceB: 'wall2-b-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    // ---- 二层左墙（3 条）----
    { pieceA: 'wall-l-0', portA: 'e2-p0', pieceB: 'wall2-l-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall-l-1', portA: 'e2-p0', pieceB: 'wall2-l-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall2-l-0', portA: 'e3-p0', pieceB: 'wall2-l-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    // ---- 二层右墙（3 条）----
    { pieceA: 'wall-r-0', portA: 'e2-p0', pieceB: 'wall2-r-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall-r-1', portA: 'e2-p0', pieceB: 'wall2-r-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'wall2-r-0', portA: 'e1-p0', pieceB: 'wall2-r-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    // ---- 二层墙角（4 条）----
    { pieceA: 'wall2-f-0', portA: 'e3-p0', pieceB: 'wall2-l-0', portB: 'e1-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall2-f-1', portA: 'e1-p0', pieceB: 'wall2-r-0', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall2-r-1', portA: 'e1-p0', pieceB: 'wall2-b-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    { pieceA: 'wall2-b-0', portA: 'e1-p0', pieceB: 'wall2-l-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
    // ---- 屋顶（8 条：每片三角形 e0 连接二层墙 e2，dihedral -45 向内倾斜形成金字塔）----
    { pieceA: 'wall2-f-0', portA: 'e2-p0', pieceB: 'roof-f-0', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-f-1', portA: 'e2-p0', pieceB: 'roof-f-1', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-b-0', portA: 'e2-p0', pieceB: 'roof-b-0', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-b-1', portA: 'e2-p0', pieceB: 'roof-b-1', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-l-0', portA: 'e2-p0', pieceB: 'roof-l-0', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-l-1', portA: 'e2-p0', pieceB: 'roof-l-1', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-r-0', portA: 'e2-p0', pieceB: 'roof-r-0', portB: 'e0-p0', dihedralDeg: -45 },
    { pieceA: 'wall2-r-1', portA: 'e2-p0', pieceB: 'roof-r-1', portB: 'e0-p0', dihedralDeg: -45 },
    // ---- 旗杆装饰（1 条：直角三角形 e0 连接 roof-f-0 的 e1，dihedral -90 向外倾斜避免穿透墙体）----
    { pieceA: 'roof-f-0', portA: 'e1-p0', pieceB: 'roof-flag-1', portB: 'e0-p0', dihedralDeg: -90 },
  ],
  steps: [
    // ---- 步骤 1：底座 ----
    {
      id: 1,
      title: '搭建底座',
      description: '用4片红色正方形磁力片拼成2×2的方形底座，这是小屋的地基。',
      parentGuide: '请告诉小朋友：盖房子要先打好地基。我们用4片红色正方形拼成一个大正方形，这就是小屋的底座。',
      addedPieceIds: ['base-00', 'base-10', 'base-01', 'base-11'],
      addedConnections: [
        { pieceA: 'base-00', portA: 'e1-p0', pieceB: 'base-10', portB: 'e3-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'base-00', portA: 'e2-p0', pieceB: 'base-01', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'base-10', portA: 'e2-p0', pieceB: 'base-11', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'base-01', portA: 'e1-p0', pieceB: 'base-11', portB: 'e3-p0', dihedralDeg: 0, flip: true },
      ],
      camera: { position: [2.5, 3.5, 2.5], target: [0, 0, 0], zoom: 1, transitionMs: 800 },
      entrance: {
        'base-00': { type: 'drop', delayMs: 0, durationMs: 800, easing: 'easeOutCubic' },
        'base-10': { type: 'drop', delayMs: 150, durationMs: 800, easing: 'easeOutCubic' },
        'base-01': { type: 'drop', delayMs: 300, durationMs: 800, easing: 'easeOutCubic' },
        'base-11': { type: 'drop', delayMs: 450, durationMs: 800, easing: 'easeOutCubic' },
      },
      highlightMs: 400,
      snapFeedback: 'pulse',
      hint: '先放一片正方形，然后依次拼上其他三片，组成大正方形。',
      focusPoints: ['观察底座是水平的', '4片正方形拼成2×2的大正方形'],
    },
    // ---- 步骤 2：前墙 ----
    {
      id: 2,
      title: '竖起前墙',
      description: '在底座前边竖起2片蓝色正方形磁力片做前墙，留出入口位置。',
      parentGuide: '请和小朋友一起：房子要有墙才能遮风挡雨。我们先竖起前面的墙，注意要让磁力片站起来。',
      addedPieceIds: ['wall-f-0', 'wall-f-1'],
      addedConnections: [
        { pieceA: 'base-00', portA: 'e0-p0', pieceB: 'wall-f-0', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base-10', portA: 'e0-p0', pieceB: 'wall-f-1', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'wall-f-0', portA: 'e1-p0', pieceB: 'wall-f-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
      ],
      camera: { position: [0, 2, 4], target: [0, 0.5, 0], zoom: 1, transitionMs: 700 },
      entrance: {
        'wall-f-0': { type: 'fold', delayMs: 0, durationMs: 900, easing: 'easeOutBack' },
        'wall-f-1': { type: 'fold', delayMs: 180, durationMs: 900, easing: 'easeOutBack' },
      },
      highlightMs: 350,
      snapFeedback: 'pulse',
      hint: '把正方形磁力片竖起来，贴着底座的边缘放好。',
      focusPoints: ['前墙要垂直于底座', '两片墙之间要边对边对齐'],
    },
    // ---- 步骤 3：后墙 ----
    {
      id: 3,
      title: '竖起后墙',
      description: '在底座后边竖起2片蓝色正方形磁力片做后墙。',
      parentGuide: '请鼓励小朋友：后面的墙也要竖起来，和前面的墙一样高哦！',
      addedPieceIds: ['wall-b-0', 'wall-b-1'],
      addedConnections: [
        { pieceA: 'base-01', portA: 'e2-p0', pieceB: 'wall-b-0', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base-11', portA: 'e2-p0', pieceB: 'wall-b-1', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'wall-b-0', portA: 'e3-p0', pieceB: 'wall-b-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
      camera: { position: [0, 2, -4], target: [0, 0.5, 0], zoom: 1, transitionMs: 700 },
      entrance: {
        'wall-b-0': { type: 'fold', delayMs: 0, durationMs: 900, easing: 'easeOutBack' },
        'wall-b-1': { type: 'fold', delayMs: 180, durationMs: 900, easing: 'easeOutBack' },
      },
      highlightMs: 350,
      snapFeedback: 'pulse',
      hint: '后面的墙和前面的墙要一样高、一样齐。',
      focusPoints: ['后墙和前墙平行', '两片墙之间要对齐'],
    },
    // ---- 步骤 4：左墙 ----
    {
      id: 4,
      title: '竖起左墙',
      description: '在底座左边竖起2片蓝色正方形磁力片做左侧墙。',
      parentGuide: '请告诉小朋友：左边也要有墙，这样风才不会从旁边吹进来。',
      addedPieceIds: ['wall-l-0', 'wall-l-1'],
      addedConnections: [
        { pieceA: 'base-00', portA: 'e3-p0', pieceB: 'wall-l-0', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base-01', portA: 'e3-p0', pieceB: 'wall-l-1', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'wall-l-0', portA: 'e3-p0', pieceB: 'wall-l-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
      camera: { position: [-4, 2, 0], target: [0, 0.5, 0], zoom: 1, transitionMs: 700 },
      entrance: {
        'wall-l-0': { type: 'fold', delayMs: 0, durationMs: 900, easing: 'easeOutBack' },
        'wall-l-1': { type: 'fold', delayMs: 180, durationMs: 900, easing: 'easeOutBack' },
      },
      highlightMs: 350,
      snapFeedback: 'pulse',
      hint: '左侧墙要和前墙、后墙的边对齐。',
      focusPoints: ['左墙垂直于底座', '左墙和前后墙的衔接'],
    },
    // ---- 步骤 5：右墙 + 一层墙角加固 ----
    {
      id: 5,
      title: '竖起右墙并加固墙角',
      description: '在底座右边竖起2片蓝色正方形磁力片做右侧墙，然后把四面墙的角连接处加固。',
      parentGuide: '请和小朋友一起：最后一边的墙也竖起来！然后把四个墙角连接好，房子的一层就完成啦。',
      addedPieceIds: ['wall-r-0', 'wall-r-1'],
      addedConnections: [
        { pieceA: 'base-10', portA: 'e1-p0', pieceB: 'wall-r-0', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base-11', portA: 'e1-p0', pieceB: 'wall-r-1', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'wall-r-0', portA: 'e1-p0', pieceB: 'wall-r-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-f-0', portA: 'e3-p0', pieceB: 'wall-l-0', portB: 'e1-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall-f-1', portA: 'e1-p0', pieceB: 'wall-r-0', portB: 'e3-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall-r-1', portA: 'e1-p0', pieceB: 'wall-b-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall-b-0', portA: 'e1-p0', pieceB: 'wall-l-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
      ],
      camera: { position: [4, 2.5, 3], target: [0, 0.5, 0], zoom: 1, transitionMs: 800 },
      entrance: {
        'wall-r-0': { type: 'fold', delayMs: 0, durationMs: 900, easing: 'easeOutBack' },
        'wall-r-1': { type: 'fold', delayMs: 180, durationMs: 900, easing: 'easeOutBack' },
      },
      highlightMs: 500,
      snapFeedback: 'glow',
      hint: '右墙竖好后，检查四个墙角是否连接牢固。',
      focusPoints: ['四面墙围成一个完整的框架', '墙角连接处要对齐'],
    },
    // ---- 步骤 6：二层前后墙 ----
    {
      id: 6,
      title: '搭建二层前后墙',
      description: '在前后墙的顶部各叠放2片黄色正方形磁力片，把墙加高一层。',
      parentGuide: '请告诉小朋友：房子要更高一点才宽敞。我们把黄色正方形磁力片叠在蓝色墙的上面，让墙变高一层。',
      addedPieceIds: ['wall2-f-0', 'wall2-f-1', 'wall2-b-0', 'wall2-b-1'],
      addedConnections: [
        { pieceA: 'wall-f-0', portA: 'e2-p0', pieceB: 'wall2-f-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-f-1', portA: 'e2-p0', pieceB: 'wall2-f-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall2-f-0', portA: 'e1-p0', pieceB: 'wall2-f-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-b-0', portA: 'e2-p0', pieceB: 'wall2-b-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-b-1', portA: 'e2-p0', pieceB: 'wall2-b-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall2-b-0', portA: 'e3-p0', pieceB: 'wall2-b-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
      camera: { position: [3, 4, 3], target: [0, 1.2, 0], zoom: 1, transitionMs: 800 },
      entrance: {
        'wall2-f-0': { type: 'drop', delayMs: 0, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-f-1': { type: 'drop', delayMs: 150, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-b-0': { type: 'drop', delayMs: 300, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-b-1': { type: 'drop', delayMs: 450, durationMs: 800, easing: 'easeOutCubic' },
      },
      highlightMs: 400,
      snapFeedback: 'pulse',
      hint: '黄色正方形磁力片叠放在蓝色墙的上面，边对边对齐。',
      focusPoints: ['二层墙和一层墙之间要贴合', '前后墙的高度一致'],
    },
    // ---- 步骤 7：二层左右墙 + 墙角 ----
    {
      id: 7,
      title: '搭建二层左右墙并加固',
      description: '在左右墙的顶部各叠放2片黄色正方形磁力片，然后连接二层墙的四个角。',
      parentGuide: '请鼓励小朋友：左右两边也加高，然后把二层墙的角也连接好，房子的二层就完成啦！',
      addedPieceIds: ['wall2-l-0', 'wall2-l-1', 'wall2-r-0', 'wall2-r-1'],
      addedConnections: [
        { pieceA: 'wall-l-0', portA: 'e2-p0', pieceB: 'wall2-l-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-l-1', portA: 'e2-p0', pieceB: 'wall2-l-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall2-l-0', portA: 'e3-p0', pieceB: 'wall2-l-1', portB: 'e1-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-r-0', portA: 'e2-p0', pieceB: 'wall2-r-0', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall-r-1', portA: 'e2-p0', pieceB: 'wall2-r-1', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall2-r-0', portA: 'e1-p0', pieceB: 'wall2-r-1', portB: 'e3-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'wall2-f-0', portA: 'e3-p0', pieceB: 'wall2-l-0', portB: 'e1-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall2-f-1', portA: 'e1-p0', pieceB: 'wall2-r-0', portB: 'e3-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall2-r-1', portA: 'e1-p0', pieceB: 'wall2-b-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
        { pieceA: 'wall2-b-0', portA: 'e1-p0', pieceB: 'wall2-l-1', portB: 'e3-p0', dihedralDeg: 90, flip: true },
      ],
      camera: { position: [4, 5, 3], target: [0, 1.5, 0], zoom: 1, transitionMs: 800 },
      entrance: {
        'wall2-l-0': { type: 'drop', delayMs: 0, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-l-1': { type: 'drop', delayMs: 150, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-r-0': { type: 'drop', delayMs: 300, durationMs: 800, easing: 'easeOutCubic' },
        'wall2-r-1': { type: 'drop', delayMs: 450, durationMs: 800, easing: 'easeOutCubic' },
      },
      highlightMs: 500,
      snapFeedback: 'glow',
      hint: '左右墙加高后，检查二层四个角是否连接牢固。',
      focusPoints: ['二层墙围成完整框架', '二层墙角和一层墙角对齐'],
    },
    // ---- 步骤 8：屋顶 ----
    {
      id: 8,
      title: '搭建金字塔屋顶',
      description: '在二层墙的顶部各放2片绿色等边三角形磁力片，向内倾斜形成金字塔屋顶。',
      parentGuide: '请和小朋友一起：我们在墙顶放上绿色三角形，让它们向内倾斜，这样就搭出了屋顶！',
      addedPieceIds: ['roof-f-0', 'roof-f-1', 'roof-b-0', 'roof-b-1', 'roof-l-0', 'roof-l-1', 'roof-r-0', 'roof-r-1'],
      addedConnections: [
        { pieceA: 'wall2-f-0', portA: 'e2-p0', pieceB: 'roof-f-0', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-f-1', portA: 'e2-p0', pieceB: 'roof-f-1', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-b-0', portA: 'e2-p0', pieceB: 'roof-b-0', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-b-1', portA: 'e2-p0', pieceB: 'roof-b-1', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-l-0', portA: 'e2-p0', pieceB: 'roof-l-0', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-l-1', portA: 'e2-p0', pieceB: 'roof-l-1', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-r-0', portA: 'e2-p0', pieceB: 'roof-r-0', portB: 'e0-p0', dihedralDeg: -45 },
        { pieceA: 'wall2-r-1', portA: 'e2-p0', pieceB: 'roof-r-1', portB: 'e0-p0', dihedralDeg: -45 },
      ],
      camera: { position: [3, 6, 3], target: [0, 2, 0], zoom: 1, transitionMs: 900 },
      entrance: {
        'roof-f-0': { type: 'drop', delayMs: 0, durationMs: 900, easing: 'easeOutCubic' },
        'roof-f-1': { type: 'drop', delayMs: 130, durationMs: 900, easing: 'easeOutCubic' },
        'roof-b-0': { type: 'drop', delayMs: 260, durationMs: 900, easing: 'easeOutCubic' },
        'roof-b-1': { type: 'drop', delayMs: 390, durationMs: 900, easing: 'easeOutCubic' },
        'roof-l-0': { type: 'drop', delayMs: 520, durationMs: 900, easing: 'easeOutCubic' },
        'roof-l-1': { type: 'drop', delayMs: 650, durationMs: 900, easing: 'easeOutCubic' },
        'roof-r-0': { type: 'drop', delayMs: 780, durationMs: 900, easing: 'easeOutCubic' },
        'roof-r-1': { type: 'drop', delayMs: 910, durationMs: 900, easing: 'easeOutCubic' },
      },
      highlightMs: 500,
      snapFeedback: 'glow',
      hint: '三角形磁力片要向内倾斜，让它们在屋顶汇合。',
      focusPoints: ['8片三角形围成金字塔屋顶', '屋顶从四个方向向中心收拢'],
    },
    // ---- 步骤 9：屋顶旗杆装饰 ----
    {
      id: 9,
      title: '安装屋顶旗杆装饰',
      description: '在屋顶前侧插上橙色直角三角形磁力片做旗杆装饰，小屋就完成啦！',
      parentGuide: '请鼓励小朋友：最后一步啦！在屋顶前侧插上橙色小旗子，我们的梦幻小屋就完成啦！',
      addedPieceIds: ['roof-flag-1'],
      addedConnections: [
        { pieceA: 'roof-f-0', portA: 'e1-p0', pieceB: 'roof-flag-1', portB: 'e0-p0', dihedralDeg: -90 },
      ],
      camera: { position: [2, 5, 4], target: [0, 2.5, 0], zoom: 1.2, transitionMs: 700 },
      entrance: {
        'roof-flag-1': { type: 'drop', delayMs: 0, durationMs: 800, easing: 'easeOutBack' },
      },
      highlightMs: 600,
      snapFeedback: 'glow',
      hint: '把橙色直角三角形插在屋顶前侧，作为旗杆装饰。',
      focusPoints: ['橙色旗子立在屋顶前侧', '小屋搭建完成'],
    },
  ],
  skills: ['空间认知', '手眼协调', '结构思维', '三维想象', '工程思维'],
  parentTips: [
    '鼓励宝贝自己找对应颜色和形状的磁力片',
    '提醒宝贝注意边对边连接对齐',
    '可以给孩子讲一讲房子的结构：地基、墙体、屋顶',
    '引导宝贝观察二层墙体如何叠放在一层墙体上',
    '搭建屋顶时，鼓励宝贝尝试不同的倾斜角度',
  ],
};
