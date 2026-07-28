import { Model, MagnetColor, MagnetShape } from './types';
import { houseV2 } from './v2/house';
import { carV2 } from './v2/car';
import { catV2 } from './v2/cat';
import { penguinV2 } from './v2/penguin';
import { rocketV2 } from './v2/rocket';
import { castleV2 } from './v2/castle';
import { flagshipHouseV2 } from './v2/flagship-house';

function svgCover(content: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${content}</svg>`);
}

export const houseCover = svgCover(`
  <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF0F0"/><stop offset="100%" stop-color="#E8F4FD"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#hg)"/>
  <rect x="120" y="180" width="160" height="140" rx="8" fill="rgba(255,107,107,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="80,180 200,80 320,180" fill="rgba(52,152,219,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="170" y="240" width="60" height="80" rx="4" fill="rgba(255,230,109,0.6)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
`);

export const carCover = svgCover(`
  <defs><linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0F8FF"/><stop offset="100%" stop-color="#FFF8E7"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#cg)"/>
  <rect x="80" y="190" width="240" height="80" rx="12" fill="rgba(255,107,107,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="140" y="150" width="120" height="50" rx="8" fill="rgba(255,107,107,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <circle cx="110" cy="280" r="28" fill="rgba(44,62,80,0.7)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
  <circle cx="290" cy="280" r="28" fill="rgba(44,62,80,0.7)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
`);

export const rocketCover = svgCover(`
  <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E8E8FF"/><stop offset="100%" stop-color="#FFF0F0"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#rg)"/>
  <rect x="160" y="120" width="80" height="160" rx="8" fill="rgba(236,240,241,0.8)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="200,40 260,120 140,120" fill="rgba(231,76,60,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="120,280 160,200 160,280" fill="rgba(231,76,60,0.6)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
  <polygon points="280,280 240,200 240,280" fill="rgba(231,76,60,0.6)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
  <polygon points="180,300 200,360 220,300" fill="rgba(255,230,109,0.7)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
`);

export const catCover = svgCover(`
  <defs><linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF0F5"/><stop offset="100%" stop-color="#FFF8F0"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#ag)"/>
  <ellipse cx="200" cy="220" rx="90" ry="80" fill="rgba(245,183,177,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="130,160 150,80 190,140" fill="rgba(245,183,177,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="270,160 250,80 210,140" fill="rgba(245,183,177,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <circle cx="165" cy="200" r="14" fill="rgba(44,62,80,0.7)"/>
  <circle cx="235" cy="200" r="14" fill="rgba(44,62,80,0.7)"/>
  <polygon points="200,225 210,245 190,245" fill="rgba(255,230,109,0.8)"/>
`);

export const castleCover = svgCover(`
  <defs><linearGradient id="clg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F5F0FF"/><stop offset="100%" stop-color="#FFF0F8"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#clg)"/>
  <rect x="100" y="180" width="200" height="140" rx="4" fill="rgba(255,107,107,0.6)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="140" y="100" width="40" height="80" rx="4" fill="rgba(255,107,107,0.6)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="220" y="100" width="40" height="80" rx="4" fill="rgba(255,107,107,0.6)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="120,100 160,40 200,100" fill="rgba(155,89,182,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="200,100 240,40 280,100" fill="rgba(155,89,182,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="175" y="240" width="50" height="80" rx="4" fill="rgba(255,230,109,0.5)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
`);

export const penguinCover = svgCover(`
  <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0F0F0"/><stop offset="100%" stop-color="#E8F4FD"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#pg)"/>
  <ellipse cx="200" cy="210" rx="85" ry="100" fill="rgba(44,62,80,0.75)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <ellipse cx="200" cy="220" rx="50" ry="65" fill="rgba(255,255,255,0.8)" stroke="rgba(255,255,255,0.9)" stroke-width="3"/>
  <circle cx="175" cy="180" r="10" fill="rgba(44,62,80,0.8)"/>
  <circle cx="225" cy="180" r="10" fill="rgba(44,62,80,0.8)"/>
  <polygon points="200,195 215,215 185,215" fill="rgba(255,230,109,0.9)" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
`);

export const flagshipHouseCover = svgCover(`
  <defs><linearGradient id="fhg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0F8FF"/><stop offset="100%" stop-color="#FFF8E7"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#fhg)"/>
  <rect x="100" y="200" width="200" height="120" rx="6" fill="rgba(52,152,219,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="100" y="140" width="200" height="60" rx="6" fill="rgba(255,230,109,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <polygon points="80,140 200,50 320,140" fill="rgba(78,205,150,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
  <rect x="100" y="260" width="200" height="60" rx="4" fill="rgba(255,107,107,0.6)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
  <rect x="170" y="280" width="60" height="40" rx="4" fill="rgba(255,230,109,0.6)" stroke="rgba(255,255,255,0.8)" stroke-width="2"/>
`);

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
  { ...houseV2, coverImage: houseCover },
  { ...carV2, coverImage: carCover },
  { ...rocketV2, coverImage: rocketCover },
  { ...catV2, coverImage: catCover },
  { ...castleV2, coverImage: castleCover },
  { ...penguinV2, coverImage: penguinCover },
  { ...flagshipHouseV2, coverImage: flagshipHouseCover },
];
