import { Model, MagnetColor, MagnetShape } from './types';

export const COVER_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFDEE9"/>
      <stop offset="100%" stop-color="#B5FFFC"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <g transform="translate(200,200)">
    <polygon points="-60,-60 60,-60 60,60 -60,60" fill="rgba(255,107,107,0.55)" stroke="rgba(255,255,255,0.8)" stroke-width="4"/>
    <polygon points="0,-80 69,40 -69,40" fill="rgba(78,205,196,0.55)" stroke="rgba(255,255,255,0.8)" stroke-width="4" transform="translate(0,10)"/>
  </g>
</svg>
`.trim());

export const themeLabels: Record<string, string> = {
  house: '房子',
  car: '汽车',
  rocket: '火箭',
  animal: '动物',
  castle: '城堡',
  other: '其他',
};

export const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

export const shapeLabels: Record<MagnetShape, string> = {
  square: '正方形磁力片',
  'equilateral-triangle': '等边三角形磁力片',
  'isosceles-triangle': '等腰三角形磁力片',
  rectangle: '长方形磁力片',
  rhombus: '菱形磁力片',
  trapezoid: '梯形磁力片',
  hexagon: '六边形磁力片',
  sector: '扇形磁力片',
  pentagon: '五边形磁力片',
};

export const magnetColorMap: Record<MagnetColor, string> = {
  red: 'rgba(255, 107, 107, 0.75)',
  orange: 'rgba(255, 159, 67, 0.75)',
  yellow: 'rgba(255, 230, 109, 0.75)',
  green: 'rgba(78, 205, 150, 0.75)',
  cyan: 'rgba(78, 205, 196, 0.75)',
  blue: 'rgba(52, 152, 219, 0.75)',
  purple: 'rgba(155, 89, 182, 0.75)',
  pink: 'rgba(245, 183, 177, 0.75)',
  white: 'rgba(255, 255, 255, 0.7)',
  black: 'rgba(44, 62, 80, 0.75)',
  clear: 'rgba(224, 247, 250, 0.6)',
};

export const magnetEdgeColorMap: Record<MagnetColor, string> = {
  red: 'rgba(255, 255, 255, 0.95)',
  orange: 'rgba(255, 255, 255, 0.95)',
  yellow: 'rgba(120, 100, 50, 0.35)',
  green: 'rgba(255, 255, 255, 0.95)',
  cyan: 'rgba(255, 255, 255, 0.95)',
  blue: 'rgba(255, 255, 255, 0.95)',
  purple: 'rgba(255, 255, 255, 0.95)',
  pink: 'rgba(255, 255, 255, 0.95)',
  white: 'rgba(200, 200, 200, 0.5)',
  black: 'rgba(255, 255, 255, 0.6)',
  clear: 'rgba(255, 255, 255, 0.9)',
};

/** 生成唯一的磁力片实例 */
const mkPiece = (partId: string, idx: number, pos: [number, number, number], rot: [number, number, number]) => ({
  id: `${partId}-${idx}`,
  partId,
  position: pos,
  rotation: rot,
});

export const models: Model[] = [
  {
    id: 'house-1',
    name: '温馨小房子',
    theme: 'house',
    difficulty: 'easy',
    ageRange: '3-4岁',
    estimatedTime: '15分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用彩色磁力片搭建一座温馨小房子。正方形片做底座和墙面，三角形片做屋顶，让孩子感受磁力片“边对边”吸合的乐趣。',
    parts: [
      { id: 'p1', name: '红色正方形磁力片', color: 'red', count: 6, shape: 'square' },
      { id: 'p2', name: '蓝色等边三角形磁力片', color: 'blue', count: 4, shape: 'equilateral-triangle' },
      { id: 'p3', name: '黄色长方形磁力片', color: 'yellow', count: 2, shape: 'rectangle' },
    ],
    skills: ['磁力片边对边吸合', '形状组合', '空间想象力'],
    parentTips: [
      '引导孩子把磁力片的边对齐，听听“咔哒”的吸合声',
      '鼓励孩子自己挑选喜欢的颜色做屋顶',
      '完成后和孩子一起给小房子起个名字',
    ],
    steps: [
      {
        id: 1,
        title: '搭底座',
        description: '用4片红色正方形磁力片拼成一个大正方形底座。',
        parentGuide: '请告诉小朋友：我们先给小房子铺一个结实的地板，把正方形片的边紧紧吸在一起！',
        addedPieces: [
          mkPiece('p1', 1, [-0.5, 0, -0.5], [90, 0, 0]),
          mkPiece('p1', 2, [0.5, 0, -0.5], [90, 0, 0]),
          mkPiece('p1', 3, [-0.5, 0, 0.5], [90, 0, 0]),
          mkPiece('p1', 4, [0.5, 0, 0.5], [90, 0, 0]),
        ],
      },
      {
        id: 2,
        title: '立起前后墙',
        description: '在底座前后两边立起2片红色正方形磁力片作为前后墙。',
        parentGuide: '请和小朋友一起：现在我们把墙立起来，看看磁力片能不能自己站稳！',
        addedPieces: [
          mkPiece('p1', 5, [0, 1.05, -0.5], [0, 0, 0]),
          mkPiece('p1', 6, [0, 1.05, 0.5], [0, 0, 0]),
        ],
      },
      {
        id: 3,
        title: '加上侧墙和屋顶',
        description: '用2片黄色长方形磁力片做侧墙，再用4片蓝色三角形磁力片搭出尖屋顶。',
        parentGuide: '请鼓励小朋友：屋顶像不像一个大大的三角形帽子？我们把它轻轻放上去！',
        addedPieces: [
          mkPiece('p3', 1, [-0.8, 1.05, 0], [0, 90, 0]),
          mkPiece('p3', 2, [0.8, 1.05, 0], [0, 90, 0]),
          mkPiece('p2', 1, [-0.3, 2.0, 0], [45, 0, 0]),
          mkPiece('p2', 2, [0.3, 2.0, 0], [45, 0, 0]),
          mkPiece('p2', 3, [-0.3, 2.0, 0], [-45, 0, 0]),
          mkPiece('p2', 4, [0.3, 2.0, 0], [-45, 0, 0]),
        ],
      },
    ],
  },
  {
    id: 'car-1',
    name: '彩虹小汽车',
    theme: 'car',
    difficulty: 'easy',
    ageRange: '3-5岁',
    estimatedTime: '10分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用磁力片搭建一辆可爱的小汽车，正方形和长方形做车身，扇形磁力片做车轮。',
    parts: [
      { id: 'p1', name: '红色长方形磁力片', color: 'red', count: 2, shape: 'rectangle' },
      { id: 'p2', name: '黄色正方形磁力片', color: 'yellow', count: 1, shape: 'square' },
      { id: 'p3', name: '蓝色等边三角形磁力片', color: 'blue', count: 2, shape: 'equilateral-triangle' },
      { id: 'p4', name: '黑色扇形磁力片', color: 'black', count: 4, shape: 'sector' },
    ],
    skills: ['磁力片拼接', '颜色认知', '手眼协调'],
    parentTips: [
      '让孩子按顺序把车身一片一片连起来',
      '提醒孩子车轮要放在车身下面哦',
      '完成后可以一起玩“小汽车滴滴”游戏',
    ],
    steps: [
      {
        id: 1,
        title: '拼车身',
        description: '把2片红色长方形和1片黄色正方形磁力片拼成长长的车身。',
        parentGuide: '请和小朋友一起：我们先做一个小汽车的身体，长方形长长的，正方形短短的，拼在一起刚刚好！',
        addedPieces: [
          mkPiece('p1', 1, [-0.8, 0.2, 0], [90, 0, 90]),
          mkPiece('p2', 1, [0.5, 0.2, 0], [90, 0, 90]),
        ],
      },
      {
        id: 2,
        title: '加车头',
        description: '在车身前面加上2片蓝色三角形磁力片做车头。',
        parentGuide: '请告诉小朋友：车头是尖尖的，这样小汽车跑起来才快！',
        addedPieces: [
          mkPiece('p3', 1, [1.4, 0.2, 0], [90, 0, 90]),
          mkPiece('p3', 2, [1.4, 0.2, 0.5], [90, 0, 90]),
        ],
      },
      {
        id: 3,
        title: '装车轮',
        description: '在车身两边贴上4片黑色扇形磁力片作为车轮。',
        parentGuide: '请鼓励小朋友：小汽车有4个轮子，这样它才能跑得又快又稳！',
        addedPieces: [
          mkPiece('p4', 1, [-0.6, 0.3, 0.75], [0, 0, 0]),
          mkPiece('p4', 2, [-0.6, 0.3, -0.75], [0, 0, 0]),
          mkPiece('p4', 3, [0.7, 0.3, 0.75], [0, 0, 0]),
          mkPiece('p4', 4, [0.7, 0.3, -0.75], [0, 0, 0]),
        ],
      },
    ],
  },
  {
    id: 'rocket-1',
    name: '太空火箭',
    theme: 'rocket',
    difficulty: 'medium',
    ageRange: '4-6岁',
    estimatedTime: '20分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用磁力片搭建一艘飞向太空的火箭，三角形片做火箭头和尾翼，长方形片做机身。',
    parts: [
      { id: 'p1', name: '白色长方形磁力片', color: 'white', count: 4, shape: 'rectangle' },
      { id: 'p2', name: '红色等边三角形磁力片', color: 'red', count: 6, shape: 'equilateral-triangle' },
      { id: 'p3', name: '蓝色正方形磁力片', color: 'blue', count: 2, shape: 'square' },
      { id: 'p4', name: '黄色扇形磁力片', color: 'yellow', count: 2, shape: 'sector' },
    ],
    skills: ['空间建构', '想象力', '科学兴趣'],
    parentTips: [
      '给孩子讲火箭发射的故事',
      '引导孩子想象火箭要去哪里探险',
      '鼓励孩子用自己喜欢的颜色装饰火箭',
    ],
    steps: [
      {
        id: 1,
        title: '搭底座',
        description: '用2片蓝色正方形磁力片拼成火箭底座。',
        parentGuide: '请告诉小朋友：火箭的底座要稳稳的，这样才能发射到太空去！',
        addedPieces: [
          mkPiece('p3', 1, [-0.5, 0, -0.5], [90, 0, 0]),
          mkPiece('p3', 2, [0.5, 0, -0.5], [90, 0, 0]),
        ],
      },
      {
        id: 2,
        title: '搭机身',
        description: '在底座上叠放白色长方形磁力片，搭出火箭长长的机身。',
        parentGuide: '请和小朋友一起：火箭的身体长长的，这样才能装下很多燃料哦！',
        addedPieces: [
          mkPiece('p1', 1, [0, 1.05, 0], [0, 0, 0]),
          mkPiece('p1', 2, [0, 2.1, 0], [0, 0, 0]),
        ],
      },
      {
        id: 3,
        title: '装火箭头',
        description: '用4片红色三角形磁力片拼成尖尖的火箭头。',
        parentGuide: '请鼓励小朋友：火箭的尖尖头可以帮它穿过大气层，飞到太空中！',
        addedPieces: [
          mkPiece('p2', 1, [-0.3, 3.05, 0], [0, 0, 0]),
          mkPiece('p2', 2, [0.3, 3.05, 0], [0, 0, 0]),
          mkPiece('p2', 3, [0, 3.05, -0.3], [0, 90, 0]),
          mkPiece('p2', 4, [0, 3.05, 0.3], [0, 90, 0]),
        ],
      },
      {
        id: 4,
        title: '加尾翼和火焰',
        description: '在火箭底部两侧加上红色三角形尾翼和黄色扇形火焰。',
        parentGuide: '请和小朋友一起：我们的火箭准备好了！倒计时：3-2-1，发射！',
        addedPieces: [
          mkPiece('p2', 5, [-0.9, 1.05, 0], [0, 0, 30]),
          mkPiece('p2', 6, [0.9, 1.05, 0], [0, 0, -30]),
          mkPiece('p4', 1, [0, -0.9, 0], [180, 0, 0]),
          mkPiece('p4', 2, [0, -1.4, 0], [180, 0, 0]),
        ],
      },
    ],
  },
  {
    id: 'animal-1',
    name: '可爱小猫咪',
    theme: 'animal',
    difficulty: 'easy',
    ageRange: '3-5岁',
    estimatedTime: '12分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用柔和的磁力片颜色搭建一只可爱的小猫咪，正方形做身体，三角形做耳朵。',
    parts: [
      { id: 'p1', name: '粉色正方形磁力片', color: 'pink', count: 2, shape: 'square' },
      { id: 'p2', name: '粉色等边三角形磁力片', color: 'pink', count: 3, shape: 'equilateral-triangle' },
      { id: 'p3', name: '黑色扇形磁力片', color: 'black', count: 2, shape: 'sector' },
      { id: 'p4', name: '黄色扇形磁力片', color: 'yellow', count: 1, shape: 'sector' },
    ],
    skills: ['观察力', '颜色搭配', '创造力'],
    parentTips: [
      '和孩子一起模仿小猫的叫声',
      '引导孩子观察家里的小动物',
      '鼓励孩子给小猫起个可爱的名字',
    ],
    steps: [
      {
        id: 1,
        title: '做身体',
        description: '用2片粉色正方形磁力片拼成小猫的身体。',
        parentGuide: '请告诉小朋友：小猫有软软的身体，我们先把它的身体做好！',
        addedPieces: [
          mkPiece('p1', 1, [-0.5, 0, 0], [90, 0, 0]),
          mkPiece('p1', 2, [0.5, 0, 0], [90, 0, 0]),
        ],
      },
      {
        id: 2,
        title: '加头和耳朵',
        description: '用2片粉色三角形磁力片做头，1片小三角形做耳朵。',
        parentGuide: '请和小朋友一起：小猫的头圆圆的，耳朵尖尖的，真可爱！',
        addedPieces: [
          mkPiece('p2', 1, [0, 1.05, 0], [0, 0, 0]),
          mkPiece('p2', 2, [0, 2.0, 0], [0, 0, 0]),
          mkPiece('p2', 3, [0, 2.0, 0.5], [0, 0, 0]),
        ],
      },
      {
        id: 3,
        title: '加眼睛和鼻子',
        description: '用黑色扇形磁力片做眼睛，黄色扇形做鼻子。',
        parentGuide: '请鼓励小朋友：小猫的眼睛圆圆的，鼻子小小的，像在对我们笑！',
        addedPieces: [
          mkPiece('p3', 1, [-0.3, 2.0, 0.3], [0, 0, 0]),
          mkPiece('p3', 2, [0.3, 2.0, 0.3], [0, 0, 0]),
          mkPiece('p4', 1, [0, 2.0, -0.3], [0, 0, 0]),
        ],
      },
    ],
  },
  {
    id: 'castle-1',
    name: '彩虹城堡',
    theme: 'castle',
    difficulty: 'hard',
    ageRange: '5-6岁',
    estimatedTime: '30分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用磁力片搭建一座美丽的彩虹城堡，正方形和长方形的城墙，三角形的塔顶。',
    parts: [
      { id: 'p1', name: '红色正方形磁力片', color: 'red', count: 6, shape: 'square' },
      { id: 'p2', name: '蓝色长方形磁力片', color: 'blue', count: 4, shape: 'rectangle' },
      { id: 'p3', name: '黄色等边三角形磁力片', color: 'yellow', count: 8, shape: 'equilateral-triangle' },
      { id: 'p4', name: '紫色梯形磁力片', color: 'purple', count: 2, shape: 'trapezoid' },
    ],
    skills: ['复杂建构', '空间布局', '耐心培养'],
    parentTips: [
      '给孩子讲公主和王子的故事',
      '引导孩子设计城堡的各个房间',
      '鼓励孩子坚持完成复杂的搭建',
    ],
    steps: [
      {
        id: 1,
        title: '搭底座',
        description: '用6片红色正方形磁力片拼成城堡底座。',
        parentGuide: '请告诉小朋友：我们的城堡要有一个大大的底座，这样才能稳稳地站在地上！',
        addedPieces: [
          mkPiece('p1', 1, [-0.5, 0, -0.5], [90, 0, 0]),
          mkPiece('p1', 2, [0.5, 0, -0.5], [90, 0, 0]),
          mkPiece('p1', 3, [-0.5, 0, 0.5], [90, 0, 0]),
          mkPiece('p1', 4, [0.5, 0, 0.5], [90, 0, 0]),
          mkPiece('p1', 5, [-0.5, 0, 1.5], [90, 0, 0]),
          mkPiece('p1', 6, [0.5, 0, 1.5], [90, 0, 0]),
        ],
      },
      {
        id: 2,
        title: '建城墙',
        description: '用蓝色长方形磁力片搭建城堡的前后城墙。',
        parentGuide: '请和小朋友一起：城堡要有高高的围墙，这样公主就安全啦！',
        addedPieces: [
          mkPiece('p2', 1, [0, 1.05, -0.5], [0, 0, 0]),
          mkPiece('p2', 2, [0, 1.05, 1.5], [0, 0, 0]),
        ],
      },
      {
        id: 3,
        title: '搭主塔',
        description: '在城堡中间用蓝色长方形和黄色三角形搭建最高的塔楼。',
        parentGuide: '请鼓励小朋友：塔楼是城堡最高的地方，站在上面可以看到很远的地方！',
        addedPieces: [
          mkPiece('p2', 3, [0, 1.05, 0.5], [0, 90, 0]),
          mkPiece('p2', 4, [0, 2.1, 0.5], [0, 90, 0]),
          mkPiece('p3', 1, [0, 3.05, 0.5], [0, 0, 0]),
        ],
      },
      {
        id: 4,
        title: '加城门和塔顶',
        description: '用紫色梯形做城门，黄色三角形做四角塔顶。',
        parentGuide: '请和小朋友一起：我们给城堡开一个大门，再给小塔楼戴上尖尖的帽子！',
        addedPieces: [
          mkPiece('p4', 1, [0, 0.2, 2.2], [90, 0, 0]),
          mkPiece('p4', 2, [0, 0.2, -0.2], [90, 0, 0]),
          mkPiece('p3', 2, [-0.3, 1.5, -0.5], [0, 0, 0]),
          mkPiece('p3', 3, [0.3, 1.5, -0.5], [0, 0, 0]),
          mkPiece('p3', 4, [-0.3, 1.5, 1.5], [0, 0, 0]),
          mkPiece('p3', 5, [0.3, 1.5, 1.5], [0, 0, 0]),
        ],
      },
    ],
  },
  {
    id: 'animal-2',
    name: '聪明小企鹅',
    theme: 'animal',
    difficulty: 'easy',
    ageRange: '3-4岁',
    estimatedTime: '10分钟',
    coverImage: COVER_PLACEHOLDER,
    description: '用黑白磁力片搭建一只可爱的小企鹅，学习颜色对比。',
    parts: [
      { id: 'p1', name: '黑色长方形磁力片', color: 'black', count: 2, shape: 'rectangle' },
      { id: 'p2', name: '白色正方形磁力片', color: 'white', count: 2, shape: 'square' },
      { id: 'p3', name: '黑色等边三角形磁力片', color: 'black', count: 2, shape: 'equilateral-triangle' },
      { id: 'p4', name: '黄色扇形磁力片', color: 'yellow', count: 1, shape: 'sector' },
    ],
    skills: ['颜色对比', '形状认知', '观察力'],
    parentTips: [
      '给孩子讲南极的故事',
      '引导孩子模仿企鹅走路的样子',
      '教孩子认识黑白两种颜色',
    ],
    steps: [
      {
        id: 1,
        title: '做身体',
        description: '用黑色长方形和白色正方形磁力片拼成企鹅胖胖的身体。',
        parentGuide: '请告诉小朋友：企鹅的身体胖胖的，黑白相间真好看！',
        addedPieces: [
          mkPiece('p1', 1, [-0.8, 0.2, 0], [90, 0, 90]),
          mkPiece('p2', 1, [0.5, 0.2, 0], [90, 0, 90]),
        ],
      },
      {
        id: 2,
        title: '加头',
        description: '用黑色三角形磁力片搭出企鹅圆圆的头。',
        parentGuide: '请和小朋友一起：企鹅的头圆圆的，像一顶小帽子！',
        addedPieces: [
          mkPiece('p3', 1, [0, 1.25, 0], [0, 0, 0]),
          mkPiece('p3', 2, [0, 1.25, 0.5], [0, 0, 0]),
        ],
      },
      {
        id: 3,
        title: '加嘴巴',
        description: '用黄色扇形磁力片做企鹅的嘴巴。',
        parentGuide: '请鼓励小朋友：企鹅的嘴巴红红的，真可爱！',
        addedPieces: [
          mkPiece('p4', 1, [0, 1.25, -0.5], [0, 0, 0]),
        ],
      },
    ],
  },
];
