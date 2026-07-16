export function polygonAreaSigned(vertices: { x: number; y: number }[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return area;
}

export function polygonArea(vertices: { x: number; y: number }[]): number {
  return Math.abs(polygonAreaSigned(vertices)) / 2;
}

export function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  const n = polygon.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonSelfIntersects(vertices: { x: number; y: number }[]): boolean {
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const i1 = (i + 1) % n;
    for (let j = i + 2; j < n; j++) {
      const j1 = (j + 1) % n;
      if (i === j || i === j1 || i1 === j || i1 === j1) continue;
      
      const x1 = vertices[i].x, y1 = vertices[i].y;
      const x2 = vertices[i1].x, y2 = vertices[i1].y;
      const x3 = vertices[j].x, y3 = vertices[j].y;
      const x4 = vertices[j1].x, y4 = vertices[j1].y;
      
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (Math.abs(denom) < 1e-10) continue;
      
      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
      
      if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
        return true;
      }
    }
  }
  return false;
}

export function insetVertices(vertices: { x: number; y: number }[], inset: number): { x: number; y: number }[] {
  const n = vertices.length;
  if (n < 3) return vertices;

  const result: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    if (len1 < 1e-9) {
      result.push({ x: curr.x, y: curr.y });
      continue;
    }

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len2 < 1e-9) {
      result.push({ x: curr.x, y: curr.y });
      continue;
    }

    const n1x = -v1y / len1;
    const n1y = v1x / len1;

    const n2x = -v2y / len2;
    const n2y = v2x / len2;

    const dot = n1x * n2x + n1y * n2y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) / 2;
    const sinAngle = Math.sin(angle);

    if (sinAngle < 1e-9) {
      const edgeDirX = v1x / len1;
      const edgeDirY = v1y / len1;
      const perpX = -edgeDirY;
      const perpY = edgeDirX;

      const signedArea = polygonAreaSigned(vertices);
      const isCCW = signedArea > 0;

      const inwardPerpX = isCCW ? perpX : -perpX;
      const inwardPerpY = isCCW ? perpY : -perpY;

      result.push({
        x: curr.x + inwardPerpX * inset,
        y: curr.y + inwardPerpY * inset,
      });
      continue;
    }

    const offsetDist = inset / sinAngle;

    const bisectX = n1x + n2x;
    const bisectY = n1y + n2y;
    const bisectLen = Math.sqrt(bisectX * bisectX + bisectY * bisectY);
    if (bisectLen < 1e-9) {
      result.push({ x: curr.x, y: curr.y });
      continue;
    }

    const signedArea = polygonAreaSigned(vertices);
    const isCCW = signedArea > 0;

    const inwardBisectX = isCCW ? bisectX : -bisectX;
    const inwardBisectY = isCCW ? bisectY : -bisectY;

    const offsetX = (inwardBisectX / bisectLen) * offsetDist;
    const offsetY = (inwardBisectY / bisectLen) * offsetDist;

    result.push({
      x: curr.x + offsetX,
      y: curr.y + offsetY,
    });
  }

  return result;
}