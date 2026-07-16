import { Model } from '../types';

export const carV2: Model = {
  id: 'car-1',
  name: '赛车',
  theme: 'car',
  difficulty: 'easy',
  ageRange: '3-5岁',
  minAge: 3,
  maxAge: 5,
  estimatedTime: '10分钟',
  coverImage: '',
  description: '用磁力片搭建一辆可爱的小汽车，长方形做车身，等腰三角形做车头，正方形做车轮和车尾。',
  buildMode: 'flat',
  parts: [
    { id: 'p1', name: '红色长方形磁力片', color: 'red', count: 1, shape: 'rectangle' },
    { id: 'p2', name: '黄色正方形磁力片', color: 'yellow', count: 1, shape: 'square' },
    { id: 'p3', name: '蓝色等腰三角形磁力片', color: 'blue', count: 1, shape: 'isosceles-triangle' },
    { id: 'p4', name: '黑色正方形磁力片', color: 'black', count: 2, shape: 'square' },
  ],
  pieces: [
    { id: 'body', partId: 'p1', isRoot: true },
    { id: 'back', partId: 'p2' },
    { id: 'nose', partId: 'p3' },
    { id: 'wheel-top', partId: 'p4' },
    { id: 'wheel-bottom', partId: 'p4' },
  ],
  connections: [
    { pieceA: 'body', portA: 'e3-p0', pieceB: 'back', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body', portA: 'e1-p0', pieceB: 'nose', portB: 'e1-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body', portA: 'e2-p1', pieceB: 'wheel-top', portB: 'e0-p0', dihedralDeg: 0, flip: true },
    { pieceA: 'body', portA: 'e0-p0', pieceB: 'wheel-bottom', portB: 'e2-p0', dihedralDeg: 0, flip: true },
  ],
  steps: [
    {
      id: 1,
      title: '拼车身',
      description: '把1片红色长方形磁力片平放在桌上，这是小汽车的车身。',
      parentGuide: '请和小朋友一起：我们先做一个小汽车的身体，长方形长长的，像公交车的身体一样！',
      addedPieceIds: ['body'],
      addedConnections: [],
    },
    {
      id: 2,
      title: '加车尾',
      description: '在车身后面接上1片黄色正方形磁力片做车尾。',
      parentGuide: '请告诉小朋友：车尾是方方的，这样小汽车才能坐更多人！',
      addedPieceIds: ['back'],
      addedConnections: [
        { pieceA: 'body', portA: 'e3-p0', pieceB: 'back', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
    },
    {
      id: 3,
      title: '装车头',
      description: '在车身前面装上1片蓝色等腰三角形磁力片做车头。',
      parentGuide: '请鼓励小朋友：车头是尖尖的，这样小汽车跑起来才快，风阻小！',
      addedPieceIds: ['nose'],
      addedConnections: [
        { pieceA: 'body', portA: 'e1-p0', pieceB: 'nose', portB: 'e1-p0', dihedralDeg: 0, flip: true },
      ],
    },
    {
      id: 4,
      title: '装车轮',
      description: '在车身两边装上2片黑色正方形磁力片作为车轮。',
      parentGuide: '请和小朋友一起数数：1、2，两个车轮，小汽车可以跑啦！滴滴滴～',
      addedPieceIds: ['wheel-top', 'wheel-bottom'],
      addedConnections: [
        { pieceA: 'body', portA: 'e2-p1', pieceB: 'wheel-top', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'body', portA: 'e0-p0', pieceB: 'wheel-bottom', portB: 'e2-p0', dihedralDeg: 0, flip: true },
      ],
    },
  ],
  skills: ['磁力片拼接', '颜色认知', '手眼协调'],
  parentTips: [
    '让孩子按顺序把车身一片一片连起来',
    '提醒孩子车轮要放在车身两边哦',
    '完成后可以一起玩"小汽车滴滴"游戏',
  ],
};
