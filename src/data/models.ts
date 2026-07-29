import { Model, MagnetColor, MagnetShape } from './types';
import { houseV2 } from './v2/house';
import { carV2 } from './v2/car';
import { catV2 } from './v2/cat';
import { penguinV2 } from './v2/penguin';
import { rocketV2 } from './v2/rocket';
import { castleV2 } from './v2/castle';
import { flagshipHouseV2 } from './v2/flagship-house';

// P0-6: 已删除所有手绘 data-URI SVG 封面（houseCover/carCover/...）
// 内置模型封面改由 useModelCover + renderProjectCover 运行时生成真实3D渲染图
// 各 v2 模型文件中 coverImage 字段保持为空字符串，由 ModelCover 组件动态填充

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
  'right-triangle': '直角三角形磁力片',
  'long-right-triangle': '长直角三角形磁力片',
  rectangle: '长方形磁力片',
  rhombus: '菱形磁力片',
  trapezoid: '梯形磁力片',
  hexagon: '六边形磁力片',
  sector: '扇形磁力片',
  semicircle: '半圆磁力片',
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

export const models: Model[] = [
  houseV2,
  carV2,
  rocketV2,
  catV2,
  castleV2,
  penguinV2,
  flagshipHouseV2,
];
