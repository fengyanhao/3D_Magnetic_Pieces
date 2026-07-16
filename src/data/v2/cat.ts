import { Model } from '../types';

export const catV2: Model = {
  id: 'cat-1',
  name: '小猫',
  theme: 'animal',
  difficulty: 'easy',
  ageRange: '3-5岁',
  minAge: 3,
  maxAge: 5,
  estimatedTime: '12分钟',
  coverImage: '',
  description: '用柔和的磁力片颜色搭建一只可爱的小猫咪，正方形做身体和头，三角形做耳朵和尾巴尖。',
  buildMode: 'flat',
  parts: [
    { id: 'p1', name: '粉色正方形磁力片', color: 'pink', count: 4, shape: 'square' },
    { id: 'p2', name: '粉色等边三角形磁力片', color: 'pink', count: 3, shape: 'equilateral-triangle' },
  ],
  pieces: [
    { id: 'body-back', partId: 'p1', isRoot: true },
    { id: 'body-front', partId: 'p1' },
    { id: 'head', partId: 'p1' },
    { id: 'ear-l', partId: 'p2' },
    { id: 'ear-r', partId: 'p2' },
    { id: 'tail-base', partId: 'p1' },
    { id: 'tail-tip', partId: 'p2' },
  ],
  connections: [
    { pieceA: 'body-back', portA: 'e2-p0', pieceB: 'body-front', portB: 'e0-p0', dihedralDeg: 180 },
    { pieceA: 'body-front', portA: 'e2-p0', pieceB: 'head', portB: 'e0-p0', dihedralDeg: 180 },
    { pieceA: 'head', portA: 'e3-p0', pieceB: 'ear-l', portB: 'e0-p0', dihedralDeg: 180, flip: true },
    { pieceA: 'head', portA: 'e1-p0', pieceB: 'ear-r', portB: 'e0-p0', dihedralDeg: 180 },
    { pieceA: 'body-back', portA: 'e0-p0', pieceB: 'tail-base', portB: 'e2-p0', dihedralDeg: 180 },
    { pieceA: 'tail-base', portA: 'e0-p0', pieceB: 'tail-tip', portB: 'e0-p0', dihedralDeg: 180, flip: true },
  ],
  steps: [
    {
      id: 1,
      title: '做身体',
      description: '用2片粉色正方形磁力片拼成小猫的身体。',
      parentGuide: '请告诉小朋友：小猫有软软的身体，我们先把它的身体做好，上下两片连起来！',
      addedPieceIds: ['body-back', 'body-front'],
      addedConnections: [
        { pieceA: 'body-back', portA: 'e2-p0', pieceB: 'body-front', portB: 'e0-p0', dihedralDeg: 180 },
      ],
    },
    {
      id: 2,
      title: '加头',
      description: '用1片粉色正方形磁力片做小猫的头。',
      parentGuide: '请和小朋友一起：小猫的头圆圆的，真可爱，把它装在身体前面！',
      addedPieceIds: ['head'],
      addedConnections: [
        { pieceA: 'body-front', portA: 'e2-p0', pieceB: 'head', portB: 'e0-p0', dihedralDeg: 180 },
      ],
    },
    {
      id: 3,
      title: '加耳朵',
      description: '用2片粉色三角形磁力片做小猫的耳朵。',
      parentGuide: '请鼓励小朋友：小猫的耳朵尖尖的，看起来真精神！左右各一个，不要搞反哦~',
      addedPieceIds: ['ear-l', 'ear-r'],
      addedConnections: [
        { pieceA: 'head', portA: 'e3-p0', pieceB: 'ear-l', portB: 'e0-p0', dihedralDeg: 180, flip: true },
        { pieceA: 'head', portA: 'e1-p0', pieceB: 'ear-r', portB: 'e0-p0', dihedralDeg: 180 },
      ],
    },
    {
      id: 4,
      title: '加尾巴',
      description: '用1片正方形和1片三角形磁力片做小猫的尾巴。',
      parentGuide: '请告诉小朋友：小猫的尾巴长长的，开心的时候会摇来摇去！',
      addedPieceIds: ['tail-base', 'tail-tip'],
      addedConnections: [
        { pieceA: 'body-back', portA: 'e0-p0', pieceB: 'tail-base', portB: 'e2-p0', dihedralDeg: 180 },
        { pieceA: 'tail-base', portA: 'e0-p0', pieceB: 'tail-tip', portB: 'e0-p0', dihedralDeg: 180, flip: true },
      ],
    },
  ],
  skills: ['观察力', '颜色搭配', '创造力'],
  parentTips: [
    '和孩子一起模仿小猫的叫声',
    '引导孩子观察家里的小动物',
    '鼓励孩子给小猫起个可爱的名字',
  ],
};
