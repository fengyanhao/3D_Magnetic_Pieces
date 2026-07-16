import { ShapeDef, EdgeDef, ConnectorPort, Vec2, Polarity } from './types';

const SQ3 = Math.sqrt(3);

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function rot90CCW(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

function polygonArea(vertices: Vec2[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

interface ShapeOptions {
  /** 每条边划分为几个端口 */
  portsPerEdge?: Record<string, number>;
  /** 默认每条边几个端口 */
  defaultPortsPerEdge?: number;
  /** 磁极配置（可选） */
  polarities?: Record<string, Polarity>;
}

function buildPorts(
  edges: EdgeDef[],
  options: ShapeOptions = {}
): ConnectorPort[] {
  const ports: ConnectorPort[] = [];
  
  for (const edge of edges) {
    const count = options.portsPerEdge?.[edge.edgeId] ?? options.defaultPortsPerEdge ?? 1;
    for (let i = 0; i < count; i++) {
      const t0 = i / count;
      const t1 = (i + 1) / count;
      const p0 = lerp(edge.v0, edge.v1, t0);
      const p1 = lerp(edge.v0, edge.v1, t1);
      const dir = normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
      const normal = rot90CCW(dir);
      const length = dist(p0, p1);
      
      ports.push({
        portId: `${edge.edgeId}-p${i}`,
        edgeId: edge.edgeId,
        t0,
        t1,
        length,
        p0,
        p1,
        dir,
        normal,
        polarity: options.polarities?.[`${edge.edgeId}-p${i}`],
      });
    }
  }
  
  return ports;
}

function makeShape(
  id: string,
  vertices: Vec2[],
  thickness: number,
  defaultSize: number,
  options: ShapeOptions = {}
): ShapeDef {
  const n = vertices.length;
  const edges: EdgeDef[] = [];
  for (let i = 0; i < n; i++) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % n];
    edges.push({
      edgeId: `e${i}`,
      v0,
      v1,
      length: dist(v0, v1),
    });
  }
  
  const ports = buildPorts(edges, options);
  const area = polygonArea(vertices);
  
  return { id, vertices, edges, ports, thickness, defaultSize, area };
}

interface CurvedShapeOptions extends ShapeOptions {
  curvedEdges?: {
    edgeId: string;
    center: Vec2;
    radius: number;
    startAngle: number;
    endAngle: number;
  }[];
}

function makeShapeWithCurves(
  id: string,
  vertices: Vec2[],
  thickness: number,
  defaultSize: number,
  options: CurvedShapeOptions = {}
): ShapeDef {
  const n = vertices.length;
  const edges: EdgeDef[] = [];
  
  for (let i = 0; i < n; i++) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % n];
    const edgeId = `e${i}`;
    const curvedInfo = options.curvedEdges?.find(e => e.edgeId === edgeId);
    
    let edgeLength = dist(v0, v1);
    if (curvedInfo) {
      const angleDiff = curvedInfo.endAngle - curvedInfo.startAngle;
      edgeLength = curvedInfo.radius * Math.abs(angleDiff);
    }
    
    edges.push({
      edgeId,
      v0,
      v1,
      length: edgeLength,
      isCurved: !!curvedInfo,
      center: curvedInfo?.center,
      radius: curvedInfo?.radius,
      startAngle: curvedInfo?.startAngle,
      endAngle: curvedInfo?.endAngle,
    });
  }
  
  const straightEdges = edges.filter(e => !e.isCurved);
  const ports = buildPorts(straightEdges, options);
  
  let area = polygonArea(vertices);
  for (const curved of options.curvedEdges || []) {
    const angleDiff = curved.endAngle - curved.startAngle;
    const sectorArea = 0.5 * curved.radius * curved.radius * Math.abs(angleDiff);
    if (angleDiff > 0) {
      area += sectorArea;
    } else {
      area -= sectorArea;
    }
  }
  
  return { id, vertices, edges, ports, thickness, defaultSize, area };
}

/** 正方形：边长 1，每条边 1 个端口 */
export const squareShape: ShapeDef = makeShape(
  'square',
  [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ],
  0.05,
  1,
  { defaultPortsPerEdge: 1 }
);

/** 长方形：长 2，宽 1。长边上各 2 个长度为 1 的端口，短边各 1 个端口 */
export const rectangleShape: ShapeDef = makeShape(
  'rectangle',
  [
    { x: -1.0, y: -0.5 },
    { x: 1.0, y: -0.5 },
    { x: 1.0, y: 0.5 },
    { x: -1.0, y: 0.5 },
  ],
  0.05,
  2,
  {
    portsPerEdge: {
      e0: 2,
      e2: 2,
      e1: 1,
      e3: 1,
    },
  }
);

/** 等边三角形：边长 1，每条边 1 个端口 */
export const equilateralTriangleShape: ShapeDef = makeShape(
  'equilateral-triangle',
  [
    { x: 0, y: -SQ3 / 3 },
    { x: 0.5, y: SQ3 / 6 },
    { x: -0.5, y: SQ3 / 6 },
  ],
  0.05,
  1,
  { defaultPortsPerEdge: 1 }
);

/** 等腰三角形：底边 1，高 1，每条边 1 个端口 */
export const isoscelesTriangleShape: ShapeDef = makeShape(
  'isosceles-triangle',
  [
    { x: 0, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ],
  0.05,
  1,
  { defaultPortsPerEdge: 1 }
);

/** 梯形：下底 1.2，上底 0.6，高 0.8，每条边 1 个端口 */
export const trapezoidShape: ShapeDef = makeShape(
  'trapezoid',
  [
    { x: -0.6, y: -0.4 },
    { x: 0.6, y: -0.4 },
    { x: 0.4, y: 0.4 },
    { x: -0.4, y: 0.4 },
  ],
  0.05,
  1,
  { defaultPortsPerEdge: 1 }
);

/** 正六边形：边长 0.5，每条边 1 个端口 */
export const hexagonShape: ShapeDef = makeShape(
  'hexagon',
  [
    { x: 0.5, y: 0 },
    { x: 0.25, y: 0.4330127018922193 },
    { x: -0.25, y: 0.4330127018922193 },
    { x: -0.5, y: 0 },
    { x: -0.25, y: -0.4330127018922193 },
    { x: 0.25, y: -0.4330127018922193 },
  ],
  0.05,
  0.5,
  { defaultPortsPerEdge: 1 }
);

/** 正五边形：外接圆半径 0.5，每条边 1 个端口 */
export const pentagonShape: ShapeDef = makeShape(
  'pentagon',
  [
    { x: 0, y: 0.5 },
    { x: 0.4755282581475768, y: 0.1545084968185426 },
    { x: 0.2938926261462365, y: -0.4045084968185426 },
    { x: -0.2938926261462365, y: -0.4045084968185426 },
    { x: -0.4755282581475768, y: 0.1545084968185426 },
  ],
  0.05,
  0.588,
  { defaultPortsPerEdge: 1 }
);

/** 直角三角形：直角边 1，斜边 √2，每条边 1 个端口 */
export const rightTriangleShape: ShapeDef = makeShape(
  'right-triangle',
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ],
  0.05,
  1,
  { defaultPortsPerEdge: 1 }
);

/** 长直角三角形：短直角边 1，长直角边 2，每条直角边 1 个端口 */
export const longRightTriangleShape: ShapeDef = makeShape(
  'long-right-triangle',
  [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 1 },
  ],
  0.05,
  2,
  { defaultPortsPerEdge: 1 }
);

/** 半圆：直径 1，半径 0.5，仅直边有端口 */
export const semicircleShape: ShapeDef = makeShapeWithCurves(
  'semicircle',
  [
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 },
  ],
  0.05,
  1,
  {
    defaultPortsPerEdge: 1,
    curvedEdges: [
      {
        edgeId: 'e1',
        center: { x: 0, y: 0 },
        radius: 0.5,
        startAngle: 0,
        endAngle: Math.PI,
      },
    ],
  }
);

/** 扇形：半径 0.5，圆心角 90 度，仅两条半径边有端口 */
export const sectorShape: ShapeDef = makeShapeWithCurves(
  'sector',
  [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0, y: 0.5 },
  ],
  0.05,
  0.5,
  {
    defaultPortsPerEdge: 1,
    curvedEdges: [
      {
        edgeId: 'e2',
        center: { x: 0, y: 0 },
        radius: 0.5,
        startAngle: 0,
        endAngle: Math.PI / 2,
      },
    ],
  }
);

/** 菱形：对角线均为 1，每条边 1 个端口 */
export const rhombusShape: ShapeDef = makeShape(
  'rhombus',
  [
    { x: 0, y: 0.5 },
    { x: 0.5, y: 0 },
    { x: 0, y: -0.5 },
    { x: -0.5, y: 0 },
  ],
  0.05,
  0.707,
  { defaultPortsPerEdge: 1 }
);

export const shapeLibrary: Record<string, ShapeDef> = {
  square: squareShape,
  rectangle: rectangleShape,
  'equilateral-triangle': equilateralTriangleShape,
  'isosceles-triangle': isoscelesTriangleShape,
  'right-triangle': rightTriangleShape,
  'long-right-triangle': longRightTriangleShape,
  trapezoid: trapezoidShape,
  hexagon: hexagonShape,
  pentagon: pentagonShape,
  sector: sectorShape,
  semicircle: semicircleShape,
  rhombus: rhombusShape,
};

/** 根据形状 ID 获取定义 */
export function getShapeDef(shapeId: string): ShapeDef | undefined {
  return shapeLibrary[shapeId];
}

/** 根据 portId 查找端口定义 */
export function getPort(shape: ShapeDef, portId: string): ConnectorPort | undefined {
  return shape.ports.find((p) => p.portId === portId);
}

/** 查找同一条边上的所有端口 */
export function getPortsOnEdge(shape: ShapeDef, edgeId: string): ConnectorPort[] {
  return shape.ports.filter((p) => p.edgeId === edgeId);
}
