import { MagnetShape, MagnetColor } from '../data/types';
import { shapeLibrary } from '../engine/shapes';
import { sampleShapeOutline } from '../components/magnet3d/primitives';

/**
 * 磁力片零件库元数据。
 * 仅描述 UI 展示需要的信息(名称、可用颜色、缩略图);
 * 几何、端口、校验信息仍来自 shapeLibrary(单一真值)。
 * 不会建立第二套形状定义。
 */

export interface ShapeCatalogEntry {
  shape: MagnetShape;
  /** 中文显示名 */
  label: string;
  /** 简短尺寸描述(基于形状顶点估算) */
  dimensions: string;
  /** 该形状支持的默认颜色 */
  defaultColors: MagnetColor[];
}

/** 全部颜色(供属性面板修改颜色使用)。 */
export const ALL_COLORS: MagnetColor[] = [
  'red', 'orange', 'yellow', 'green', 'cyan',
  'blue', 'purple', 'pink', 'white', 'black', 'clear',
];

export const colorLabels: Record<MagnetColor, string> = {
  red: '红', orange: '橙', yellow: '黄', green: '绿', cyan: '青',
  blue: '蓝', purple: '紫', pink: '粉', white: '白', black: '黑', clear: '透明',
};

/** 形状目录(顺序即零件库展示顺序)。 */
export const shapeCatalog: ShapeCatalogEntry[] = [
  { shape: 'square', label: '正方形', defaultColors: ['red', 'blue', 'yellow'] },
  { shape: 'equilateral-triangle', label: '等边三角形', defaultColors: ['red', 'blue', 'green'] },
  { shape: 'right-triangle', label: '直角三角形', defaultColors: ['yellow', 'green'] },
  { shape: 'long-right-triangle', label: '长直角三角形', defaultColors: ['orange', 'purple'] },
  { shape: 'rectangle', label: '长方形', defaultColors: ['blue', 'red', 'green'] },
  { shape: 'semicircle', label: '半圆形', defaultColors: ['pink', 'cyan'] },
  { shape: 'isosceles-triangle', label: '等腰三角形', defaultColors: ['yellow', 'purple'] },
  { shape: 'rhombus', label: '菱形', defaultColors: ['purple', 'cyan'] },
  { shape: 'trapezoid', label: '梯形', defaultColors: ['green', 'orange'] },
  { shape: 'hexagon', label: '六边形', defaultColors: ['yellow', 'pink'] },
  { shape: 'pentagon', label: '五边形', defaultColors: ['red', 'white'] },
  { shape: 'sector', label: '扇形', defaultColors: ['cyan', 'yellow'] },
].map((entry) => {
  const def = shapeLibrary[entry.shape];
  let dimensions = '';
  if (def) {
    // P1-6: 用采样轮廓计算尺寸,使半圆高度=0.50、扇形含弧
    const pts = sampleShapeOutline(def);
    const xs = pts.map((v) => v.x);
    const ys = pts.map((v) => v.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    dimensions = `${w.toFixed(2)} × ${h.toFixed(2)} × ${def.thickness.toFixed(2)}`;
  }
  return { ...entry, dimensions } as ShapeCatalogEntry;
});

/** 简易 SVG 缩略图:P1-6 用采样轮廓(含圆弧)绘制俯视图。 */
export function shapeThumbnailSvg(shape: MagnetShape, size = 48): string {
  const def = shapeLibrary[shape];
  if (!def) return '';
  // P1-6: 采样轮廓(含曲线),避免半圆/扇形显示为直线
  const pts = sampleShapeOutline(def);
  const xs = pts.map((v) => v.x);
  const ys = pts.map((v) => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const pad = 4;
  const scale = (size - pad * 2) / Math.max(w, h);
  const ox = (size - w * scale) / 2 - minX * scale;
  const oy = (size - h * scale) / 2 - minY * scale;
  const ptsStr = pts.map((v) => `${(v.x * scale + ox).toFixed(2)},${(v.y * scale + oy).toFixed(2)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><polygon points="${ptsStr}" fill="#cbd5e1" stroke="#475569" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}

export function shapeThumbnailDataUrl(shape: MagnetShape, size = 48): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(shapeThumbnailSvg(shape, size));
}
