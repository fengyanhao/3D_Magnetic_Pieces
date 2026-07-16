import { Model } from '../types';

export const rocketV2: Model = {
  id: 'rocket-1',
  name: '火箭',
  theme: 'rocket',
  difficulty: 'medium',
  ageRange: '4-6岁',
  minAge: 4,
  maxAge: 6,
  estimatedTime: '20分钟',
  coverImage: '',
  description: '用磁力片搭建一艘飞向太空的火箭，三角形片做火箭头和尾翼，正方形片做机身。',
  buildMode: 'flat',
  parts: [
    { id: 'p1', name: '白色正方形磁力片', color: 'white', count: 3, shape: 'square' },
    { id: 'p2', name: '红色等边三角形磁力片', color: 'red', count: 3, shape: 'equilateral-triangle' },
  ],
  pieces: [
    { id: 'body-1', partId: 'p1', isRoot: true },
    { id: 'body-2', partId: 'p1' },
    { id: 'body-3', partId: 'p1' },
    { id: 'nose', partId: 'p2' },
    { id: 'fin-l', partId: 'p2' },
    { id: 'fin-r', partId: 'p2' },
  ],
  connections: [
    { pieceA: 'body-1', portA: 'e2-p0', pieceB: 'body-2', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body-2', portA: 'e2-p0', pieceB: 'body-3', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body-3', portA: 'e2-p0', pieceB: 'nose', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body-1', portA: 'e3-p0', pieceB: 'fin-l', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body-1', portA: 'e1-p0', pieceB: 'fin-r', portB: 'e0-p0', dihedralDeg: 0, flip: true },
  ],
  steps: [
    {
      id: 1,
      title: '搭机身下半部',
      description: '用2片白色正方形磁力片搭出火箭机身的下半部分。',
      parentGuide: '请告诉小朋友：火箭的身体长长的，这样才能装下很多燃料哦！',
      addedPieceIds: ['body-1', 'body-2'],
      addedConnections: [
        { pieceA: 'body-1', portA: 'e2-p0', pieceB: 'body-2', portB: 'e0-p0', dihedralDeg: 0, flip: true },
      ],
    },
    {
      id: 2,
      title: '搭机身上半部',
      description: '再加1片白色正方形磁力片，完成火箭的机身。',
      parentGuide: '请鼓励小朋友：火箭的身体越来越长了，马上就要飞到太空啦！',
      addedPieceIds: ['body-3'],
      addedConnections: [
        { pieceA: 'body-2', portA: 'e2-p0', pieceB: 'body-3', portB: 'e0-p0', dihedralDeg: 0, flip: true },
      ],
    },
    {
      id: 3,
      title: '装火箭头',
      description: '用1片红色等边三角形磁力片做尖尖的火箭头。',
      parentGuide: '请告诉小朋友：火箭的尖尖头可以帮它穿过大气层，飞到太空中！',
      addedPieceIds: ['nose'],
      addedConnections: [
        { pieceA: 'body-3', portA: 'e2-p0', pieceB: 'nose', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
    },
    {
      id: 4,
      title: '加尾翼',
      description: '在火箭底部两侧加上2片红色三角形尾翼。',
      parentGuide: '请和小朋友一起：尾翼可以帮火箭保持平衡，飞得更稳！',
      addedPieceIds: ['fin-l', 'fin-r'],
      addedConnections: [
        { pieceA: 'body-1', portA: 'e3-p0', pieceB: 'fin-l', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'body-1', portA: 'e1-p0', pieceB: 'fin-r', portB: 'e0-p0', dihedralDeg: 0, flip: true },
      ],
    },
  ],
  skills: ['空间建构', '想象力', '科学兴趣'],
  parentTips: [
    '给孩子讲火箭发射的故事',
    '引导孩子想象火箭要去哪里探险',
    '鼓励孩子用自己喜欢的颜色装饰火箭',
  ],
};
