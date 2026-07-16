export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseRgbaString(rgbaStr: string): RGBA {
  const m = rgbaStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) {
    return { r: 1, g: 1, b: 1, a: 1 };
  }
  return {
    r: parseInt(m[1], 10) / 255,
    g: parseInt(m[2], 10) / 255,
    b: parseInt(m[3], 10) / 255,
    a: m[4] ? parseFloat(m[4]) : 1,
  };
}
