import { MagnetShape } from './types';
import {
  Square, Triangle, TriangleRight,
  Hexagon, Pentagon, Diamond, Circle, Frame, Layers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ShapeDetail {
  id: MagnetShape;
  name: string;
  icon?: LucideIcon;
  description: string;
  characteristics?: string[];
  usageTips?: string[];
  examples?: string[];
}

export const shapeDetails: ShapeDetail[] = [
  {
    id: 'square',
    name: '正方形',
    icon: Square,
    description: '四条边等长、四个角均为直角的四边形。是最基础的磁力片形状，易于组合成各种平面和立体结构。',
    characteristics: ['四条边长度相等', '四个内角均为90度', '对边平行', '对角线相等且互相垂直平分'],
    usageTips: ['适合作为建筑的基础单元', '多个正方形可组合成长方形', '与三角形搭配可搭建立方体'],
    examples: ['立方体墙面', '正方形塔楼', '棋盘格图案'],
  },
  {
    id: 'equilateral-triangle',
    name: '等边三角形',
    icon: Triangle,
    description: '三条边等长、三个角均为60度的三角形。具有良好的稳定性，是搭建锥体和穹顶的理想选择。',
    characteristics: ['三条边长度相等', '三个内角均为60度', '具有旋转对称性'],
    usageTips: ['与正方形组合可搭建三角锥', '多个等边三角形可组成六边形', '适合搭建屋顶结构'],
    examples: ['三角锥', '金字塔', '六边形底座'],
  },
  {
    id: 'isosceles-triangle',
    name: '等腰三角形',
    icon: Triangle,
    description: '两条边等长的三角形。形状灵活多变，可用于创造斜面和尖顶结构。',
    characteristics: ['两条边长度相等', '底边对应的两个角相等', '具有轴对称性'],
    usageTips: ['适合作为屋顶斜面', '与长方形组合搭建房屋', '可创造箭头形状'],
    examples: ['屋顶斜面', '箭头', '风筝'],
  },
  {
    id: 'right-triangle',
    name: '直角三角形',
    icon: TriangleRight,
    description: '含有一个90度角的三角形。可精确填充直角空间，适合与正方形配合使用。',
    characteristics: ['一个内角为90度', '斜边最长', '两条直角边互相垂直'],
    usageTips: ['填充正方形的对角空间', '与正方形组合成更大的三角形', '搭建斜坡和楼梯'],
    examples: ['楼梯台阶', '斜坡', '对角支撑'],
  },
  {
    id: 'long-right-triangle',
    name: '长直角三角形',
    icon: TriangleRight,
    description: '直角边长度差异较大的直角三角形。可创造更陡峭或更平缓的斜面。',
    characteristics: ['一个内角为90度', '两条直角边长度差异大', '斜边较长'],
    usageTips: ['搭建长斜坡', '作为桥梁的支撑', '创造流线型结构'],
    examples: ['长斜坡', '桥梁支撑', '滑梯'],
  },
  {
    id: 'rectangle',
    name: '长方形',
    icon: Frame,
    description: '对边等长、四个角均为直角的四边形。长度方向可扩展性强，适合搭建墙体和平台。',
    characteristics: ['对边长度相等', '四个内角均为90度', '对角线相等'],
    usageTips: ['搭建长墙体', '作为桥梁桥面', '与正方形组合搭建房屋'],
    examples: ['墙体', '桥面', '平台底座'],
  },
  {
    id: 'rhombus',
    name: '菱形',
    icon: Diamond,
    description: '四条边等长但对角不等的四边形。可创造独特的倾斜角度和动感造型。',
    characteristics: ['四条边长度相等', '对角线互相垂直平分', '对角相等', '具有旋转对称性'],
    usageTips: ['创造倾斜角度', '与正方形组合成星形', '搭建菱形塔'],
    examples: ['菱形图案', '星形', '倾斜塔楼'],
  },
  {
    id: 'trapezoid',
    name: '梯形',
    icon: Layers,
    description: '只有一组对边平行的四边形。形状独特，适合创造层叠和阶梯效果。',
    characteristics: ['一组对边平行', '另一组对边不平行', '内角和为360度'],
    usageTips: ['创造阶梯效果', '搭建斜坡', '层叠结构'],
    examples: ['阶梯', '斜坡', '层叠屋顶'],
  },
  {
    id: 'hexagon',
    name: '六边形',
    icon: Hexagon,
    description: '六条边等长、六个角均为120度的多边形。可无缝拼接，适合搭建蜂窝状结构。',
    characteristics: ['六条边长度相等', '六个内角均为120度', '可无缝拼接', '具有六重旋转对称性'],
    usageTips: ['搭建蜂窝结构', '与三角形组合', '创造圆形效果'],
    examples: ['蜂窝', '花朵', '雪花'],
  },
  {
    id: 'pentagon',
    name: '五边形',
    icon: Pentagon,
    description: '五条边等长、五个角均为108度的多边形。形状独特，适合创造花卉和星形图案。',
    characteristics: ['五条边长度相等', '五个内角均为108度', '具有五重旋转对称性'],
    usageTips: ['创造花卉造型', '搭建五角星', '与三角形组合'],
    examples: ['花朵', '五角星', '足球图案'],
  },
  {
    id: 'sector',
    name: '扇形',
    icon: Circle,
    description: '圆的一部分，由两条半径和一段弧围成。可创造弯曲的边缘和圆角效果。',
    characteristics: ['两条半径边', '一条弧形边', '圆心角通常为90度'],
    usageTips: ['创造圆角', '搭建弯曲结构', '与正方形组合成圆形'],
    examples: ['圆角', '扇形门', '风车叶片'],
  },
  {
    id: 'semicircle',
    name: '半圆',
    icon: Circle,
    description: '圆的一半，由直径和半圆弧围成。适合搭建拱门、隧道和圆形结构。',
    characteristics: ['一条直边（直径）', '一条半圆弧', '具有轴对称性'],
    usageTips: ['搭建拱门', '创造隧道', '与长方形组合'],
    examples: ['拱门', '隧道', '圆形屋顶'],
  },
];
