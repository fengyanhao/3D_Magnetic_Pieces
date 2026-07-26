import { Vector3, Matrix4 } from 'three';
import {
  PhysicalModel,
  ShapeDef,
  ValidationIssue,
  ValidationResult,
  Connection,
  PieceRef,
  PieceTransform,
  ConnectorPort,
  Vec2,
  ValidationIssueCode,
} from './types';
import { solveConnections, SolverContext, computeAllConnectionResiduals } from './solver';
import { getPort } from './shapes';

const EPS = 1e-6;
const POSITION_ERROR_TOLERANCE = 0.01;
const DIRECTION_DOT_TOLERANCE = 0.999;
const DIHEDRAL_ERROR_TOLERANCE = 1.0;
const PORT_LENGTH_TOLERANCE_RATIO = 0.01;
const PLANAR_DISTANCE_TOLERANCE = 0.01;
const GROUND_TOUCH_TOLERANCE = 0.02;
const PENETRATION_DEPTH_TOLERANCE = 0.03;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function v3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function v3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function v3Scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function v3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function v3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function v3Length(a: Vec3): number {
  return Math.sqrt(v3Dot(a, a));
}

function v3Normalize(a: Vec3): Vec3 {
  const len = v3Length(a);
  if (len < EPS) return { x: 0, y: 0, z: 0 };
  return v3Scale(a, 1 / len);
}

// P0-2: Vec3 接口结构兼容 three.Vector3,vec3FromThree 不再需要转换。
// 旧调用点直接传 Vector3 给 Vec3 类型参数(TS 结构子类型自动接受)。

function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function len2(a: Vec2): number {
  return Math.sqrt(dot2(a, a));
}

function convexHull2D(points: Vec2[]): Vec2[] {
  if (points.length <= 1) return points.slice();

  const sorted = points.slice().sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });

  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2(sub2(lower[lower.length - 1], lower[lower.length - 2]), sub2(p, lower[lower.length - 1])) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Vec2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross2(sub2(upper[upper.length - 1], upper[upper.length - 2]), sub2(p, upper[upper.length - 1])) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function pointInConvexPolygon(point: Vec2, hull: Vec2[]): boolean {
  if (hull.length < 3) return false;
  const n = hull.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % n];
    const cross = cross2(sub2(b, a), sub2(point, a));
    if (Math.abs(cross) < EPS) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}

interface ConvexPrism {
  vertices: Vec3[];
  faces: { normal: Vec3; vertices: Vec3[] }[];
  edges: { a: Vec3; b: Vec3 }[];
}

function buildConvexPrism(shape: ShapeDef, tf: PieceTransform): ConvexPrism {
  const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
  const halfThick = shape.thickness / 2;

  const bottomVerts: Vec3[] = [];
  const topVerts: Vec3[] = [];

  for (const v of shape.vertices) {
    const bottom = new Vector3(v.x, v.y, -halfThick).applyMatrix4(matrix);
    const top = new Vector3(v.x, v.y, halfThick).applyMatrix4(matrix);
    // P0-2: Vector3 结构兼容 Vec3 接口,无需转换
    bottomVerts.push(bottom);
    topVerts.push(top);
  }

  const vertices = bottomVerts.concat(topVerts);
  const n = shape.vertices.length;

  const faces: { normal: Vec3; vertices: Vec3[] }[] = [];

  const bottomNormal = v3Normalize(v3Cross(
    v3Sub(bottomVerts[1], bottomVerts[0]),
    v3Sub(bottomVerts[2], bottomVerts[0])
  ));
  faces.push({ normal: bottomNormal, vertices: bottomVerts.slice() });

  const topNormal = v3Normalize(v3Cross(
    v3Sub(topVerts[1], topVerts[0]),
    v3Sub(topVerts[2], topVerts[0])
  ));
  if (v3Dot(topNormal, bottomNormal) > 0) {
    faces.push({ normal: v3Scale(topNormal, -1), vertices: topVerts.slice().reverse() });
  } else {
    faces.push({ normal: topNormal, vertices: topVerts.slice() });
  }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const sideVerts = [bottomVerts[i], bottomVerts[j], topVerts[j], topVerts[i]];
    const sideNormal = v3Normalize(v3Cross(
      v3Sub(bottomVerts[j], bottomVerts[i]),
      v3Sub(topVerts[i], bottomVerts[i])
    ));
    faces.push({ normal: sideNormal, vertices: sideVerts });
  }

  const edges: { a: Vec3; b: Vec3 }[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    edges.push({ a: bottomVerts[i], b: bottomVerts[j] });
    edges.push({ a: topVerts[i], b: topVerts[j] });
    edges.push({ a: bottomVerts[i], b: topVerts[i] });
  }

  return { vertices, faces, edges };
}

function projectOntoAxis(prism: ConvexPrism, axis: Vec3): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of prism.vertices) {
    const proj = v3Dot(v, axis);
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

function overlapOnAxis(a: ConvexPrism, b: ConvexPrism, axis: Vec3): number {
  if (v3Length(axis) < EPS) return Infinity;
  const norm = v3Normalize(axis);
  const projA = projectOntoAxis(a, norm);
  const projB = projectOntoAxis(b, norm);
  const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
  return overlap;
}

function satConvexPrismIntersection(
  prismA: ConvexPrism,
  prismB: ConvexPrism
): { intersects: boolean; penetrationDepth: number } {
  const axes: Vec3[] = [];

  for (const face of prismA.faces) {
    axes.push(face.normal);
  }
  for (const face of prismB.faces) {
    axes.push(face.normal);
  }

  for (const edgeA of prismA.edges) {
    for (const edgeB of prismB.edges) {
      const dirA = v3Sub(edgeA.b, edgeA.a);
      const dirB = v3Sub(edgeB.b, edgeB.a);
      if (v3Length(dirA) < EPS || v3Length(dirB) < EPS) continue;
      const cross = v3Cross(dirA, dirB);
      if (v3Length(cross) > EPS) {
        axes.push(cross);
      }
    }
  }

  let minOverlap = Infinity;

  for (const axis of axes) {
    if (v3Length(axis) < EPS) continue;
    const overlap = overlapOnAxis(prismA, prismB, axis);
    if (overlap <= 0) {
      return { intersects: false, penetrationDepth: 0 };
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
    }
  }

  return { intersects: true, penetrationDepth: minOverlap };
}

function getPortWorldEndpoints(
  pieceId: string,
  portId: string,
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  flip: boolean = false
): { p0: Vec3; p1: Vec3; dir: Vec3; normal: Vec3 } | null {
  const shape = getShape(pieceId);
  const tf = transforms[pieceId];
  if (!shape || !tf) return null;

  const port = getPort(shape, portId);
  if (!port) return null;

  const m = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
  // P0-2: Vector3 直接当 Vec3 用,无需 vec3FromThree 转换
  const p0 = new Vector3(port.p0.x, port.p0.y, 0).applyMatrix4(m);
  const p1 = new Vector3(port.p1.x, port.p1.y, 0).applyMatrix4(m);

  let rp0 = p0, rp1 = p1;
  if (flip) {
    rp0 = p1;
    rp1 = p0;
  }

  const dir = v3Normalize(v3Sub(rp1, rp0));
  // P0-2: Vector3 直接当 Vec3 用
  const normal = new Vector3(0, 0, 1).applyQuaternion(tf.quaternion).normalize();

  return { p0: rp0, p1: rp1, dir, normal };
}

function pointToSegmentDistance(point: Vec3, segA: Vec3, segB: Vec3): number {
  const ab = v3Sub(segB, segA);
  const ap = v3Sub(point, segA);
  const abLenSq = v3Dot(ab, ab);
  if (abLenSq < EPS) return v3Length(v3Sub(point, segA));

  let t = v3Dot(ap, ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = v3Add(segA, v3Scale(ab, t));
  return v3Length(v3Sub(point, closest));
}

function issue(
  modelId: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
  extra: Partial<ValidationIssue> = {}
): ValidationIssue {
  return { modelId, message, severity, ...extra };
}

export function validatePhysicalModel(
  model: PhysicalModel,
  getShapeForPiece: (pieceId: string) => ShapeDef | undefined
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const modelId = model.id;

  if (model.pieces.length === 0) {
    issues.push(issue(modelId, '模型没有定义任何零件', 'error', { code: 'other' }));
    return { valid: issues.length === 0, issues };
  }

  const rootPiece = model.pieces.find((p) => p.isRoot) || model.pieces[0];

  const ctx: SolverContext = {
    pieces: model.pieces,
    connections: model.connections,
    rootPieceId: rootPiece.id,
    getShapeForPiece,
  };

  const solverResult = solveConnections(ctx);
  if (solverResult.error) {
    issues.push(issue(modelId, `约束求解失败: ${solverResult.error}`, 'error', { code: 'other' }));
    return { valid: issues.length === 0, issues };
  }

  const transforms = solverResult.transforms;
  const spanningTreeIndices = solverResult.spanningTreeConnectionIndices;

  checkPortOverlap(modelId, model.pieces, getShapeForPiece, issues);

  checkPortReuse(modelId, model.connections, getShapeForPiece, issues);

  checkLoopResiduals(modelId, model, solverResult.loopResiduals, spanningTreeIndices, issues);

  checkPortLengthCompatibility(modelId, model.connections, getShapeForPiece, issues);

  checkSingleConnectedComponent(modelId, model.pieces, model.connections, issues);

  checkStepReachability(modelId, model, issues);

  checkDihedralDegRange(modelId, model.connections, issues);

  checkPieceAddedOnce(modelId, model, issues);

  checkConnectionStepCoverage(modelId, model, getShapeForPiece, issues);

  checkIntersectionsSAT(modelId, model.pieces, model.connections, transforms, getShapeForPiece, issues);

  checkGroundPlaneWithThickness(modelId, model.buildMode, model.pieces, transforms, getShapeForPiece, issues);

  if (model.buildMode !== 'flat') {
    checkSupportAndStabilityConvexHull(modelId, model, transforms, getShapeForPiece, issues);
  }

  if (model.buildMode === 'flat') {
    checkPlanarityAllVertices(modelId, model.pieces, transforms, getShapeForPiece, issues);
  }

  return { valid: issues.filter((i) => i.severity === 'error').length === 0, issues };
}

function checkPortOverlap(
  modelId: string,
  pieces: PieceRef[],
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  for (const p of pieces) {
    const shape = getShape(p.id);
    if (!shape) continue;

    const edgePorts: Record<string, ConnectorPort[]> = {};
    for (const port of shape.ports) {
      if (!edgePorts[port.edgeId]) edgePorts[port.edgeId] = [];
      edgePorts[port.edgeId].push(port);
    }

    for (const edgeId of Object.keys(edgePorts)) {
      const ports = edgePorts[edgeId];
      ports.sort((a, b) => a.t0 - b.t0);

      for (let i = 0; i < ports.length - 1; i++) {
        const curr = ports[i];
        const next = ports[i + 1];
        if (curr.t1 > next.t0 + EPS) {
          issues.push(
            issue(modelId, `零件 ${p.id} 的边 ${edgeId} 上端口 ${curr.portId} 与 ${next.portId} 重叠`, 'error', {
              pieceId: p.id,
              edgeId,
              code: ValidationIssueCode.PORT_OVERLAP,
            })
          );
        }
      }
    }
  }
}

function checkPortReuse(
  modelId: string,
  connections: Connection[],
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  const portUsage: Record<string, number[]> = {};

  connections.forEach((conn, idx) => {
    const keyA = `${conn.pieceA}:${conn.portA}`;
    const keyB = `${conn.pieceB}:${conn.portB}`;
    if (!portUsage[keyA]) portUsage[keyA] = [];
    if (!portUsage[keyB]) portUsage[keyB] = [];
    portUsage[keyA].push(idx);
    portUsage[keyB].push(idx);
  });

  for (const key of Object.keys(portUsage)) {
    const indices = portUsage[key];
    if (indices.length > 1) {
      const [pieceId, portId] = key.split(':');
      const shape = getShape(pieceId);
      const port = shape ? getPort(shape, portId) : undefined;
      const edgeId = port?.edgeId;
      issues.push(
        issue(modelId, `端口 ${pieceId}:${portId} 被多次使用 (连接 ${indices.join(', ')})`, 'error', {
          pieceId,
          portId,
          edgeId,
          code: ValidationIssueCode.PORT_REUSE,
        })
      );
    }
  }
}

function checkLoopResiduals(
  modelId: string,
  _model: PhysicalModel,
  residuals: ReturnType<typeof computeAllConnectionResiduals>,
  spanningTreeIndices: Set<number>,
  issues: ValidationIssue[]
) {
  for (const r of residuals) {
    if (spanningTreeIndices.has(r.connectionIndex)) continue;

    if (r.positionError > POSITION_ERROR_TOLERANCE) {
      issues.push(
        issue(modelId, `闭环连接[${r.connectionIndex}]位置误差过大: ${r.positionError.toFixed(4)} (阈值 ${POSITION_ERROR_TOLERANCE})`, 'error', {
          connectionIndex: r.connectionIndex,
          pieceId: r.pieceA,
          code: ValidationIssueCode.LOOP_POSITION_ERROR,
        })
      );
    }

    if (r.directionDot < DIRECTION_DOT_TOLERANCE) {
      issues.push(
        issue(modelId, `闭环连接[${r.connectionIndex}]方向对齐不良: 点积=${r.directionDot.toFixed(6)} (阈值 ${DIRECTION_DOT_TOLERANCE})`, 'error', {
          connectionIndex: r.connectionIndex,
          pieceId: r.pieceA,
          code: ValidationIssueCode.LOOP_DIRECTION_ERROR,
        })
      );
    }

    if (r.dihedralError > DIHEDRAL_ERROR_TOLERANCE) {
      issues.push(
        issue(modelId, `闭环连接[${r.connectionIndex}]二面角误差过大: ${r.dihedralError.toFixed(4)}° (阈值 ${DIHEDRAL_ERROR_TOLERANCE}°)`, 'error', {
          connectionIndex: r.connectionIndex,
          pieceId: r.pieceA,
          code: ValidationIssueCode.LOOP_DIHEDRAL_ERROR,
        })
      );
    }
  }
}

function checkPortLengthCompatibility(
  modelId: string,
  connections: Connection[],
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  connections.forEach((conn, idx) => {
    const shapeA = getShape(conn.pieceA);
    const shapeB = getShape(conn.pieceB);
    if (!shapeA || !shapeB) return;

    const portA = getPort(shapeA, conn.portA);
    const portB = getPort(shapeB, conn.portB);

    if (!portA) {
      issues.push(issue(modelId, `Connection[${idx}] 引用了不存在的端口 ${conn.pieceA}:${conn.portA}`, 'error', { connectionIndex: idx, pieceId: conn.pieceA, code: ValidationIssueCode.PORT_MISSING }));
      return;
    }
    if (!portB) {
      issues.push(issue(modelId, `Connection[${idx}] 引用了不存在的端口 ${conn.pieceB}:${conn.portB}`, 'error', { connectionIndex: idx, pieceId: conn.pieceB, code: ValidationIssueCode.PORT_MISSING }));
      return;
    }

    const lenDiff = Math.abs(portA.length - portB.length);
    const avgLen = (portA.length + portB.length) / 2;
    const ratio = avgLen > 0 ? lenDiff / avgLen : 0;

    if (ratio > PORT_LENGTH_TOLERANCE_RATIO) {
      issues.push(
        issue(modelId, `Connection[${idx}] 端口长度不兼容: ${conn.pieceA}:${conn.portA}=${portA.length.toFixed(4)}, ${conn.pieceB}:${conn.portB}=${portB.length.toFixed(4)}, 差异率 ${(ratio * 100).toFixed(2)}%`, 'error', {
          connectionIndex: idx,
          pieceId: conn.pieceA,
          code: ValidationIssueCode.PORT_LENGTH,
        })
      );
    }
  });
}

function checkSingleConnectedComponent(
  modelId: string,
  pieces: PieceRef[],
  connections: Connection[],
  issues: ValidationIssue[]
) {
  if (pieces.length <= 1) return;

  const adj: Record<string, string[]> = {};
  for (const c of connections) {
    if (!adj[c.pieceA]) adj[c.pieceA] = [];
    if (!adj[c.pieceB]) adj[c.pieceB] = [];
    adj[c.pieceA].push(c.pieceB);
    adj[c.pieceB].push(c.pieceA);
  }

  const visited = new Set<string>();
  const queue = [pieces[0].id];
  visited.add(pieces[0].id);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj[cur] || []) {
      if (!visited.has(nxt)) {
        visited.add(nxt);
        queue.push(nxt);
      }
    }
  }

  if (visited.size !== pieces.length) {
    const missing = pieces.filter((p) => !visited.has(p.id)).map((p) => p.id);
    issues.push(issue(modelId, `模型存在多个不连通分量，未连通的零件: ${missing.join(', ')}`, 'error', { code: ValidationIssueCode.UNCONNECTED }));
  }
}

function checkStepReachability(
  modelId: string,
  model: PhysicalModel,
  issues: ValidationIssue[]
) {
  const presentPieces = new Set<string>();

  for (const step of model.steps) {
    const before = new Set(presentPieces);

    const reachable = new Set(before);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of step.addedConnections) {
        if (reachable.has(c.pieceA) && !reachable.has(c.pieceB)) {
          reachable.add(c.pieceB);
          changed = true;
        }
        if (reachable.has(c.pieceB) && !reachable.has(c.pieceA)) {
          reachable.add(c.pieceA);
          changed = true;
        }
      }
    }

    for (const pid of step.addedPieceIds) {
      if (!reachable.has(pid) && before.size > 0) {
        issues.push(
          issue(modelId, `步骤 ${step.id} 中的零件 ${pid} 没有通过本步骤新增的连接连接到已有结构`, 'error', { stepId: step.id, pieceId: pid, code: ValidationIssueCode.STEP })
        );
      }
    }

    for (const pid of step.addedPieceIds) presentPieces.add(pid);
  }
}

function checkDihedralDegRange(
  modelId: string,
  connections: Connection[],
  issues: ValidationIssue[]
) {
  for (const conn of connections) {
    if (!isFinite(conn.dihedralDeg)) {
      issues.push(issue(modelId, `连接中 dihedralDeg 不是有限数: ${conn.dihedralDeg}`, 'error', { code: ValidationIssueCode.DIHEDRAL_INVALID }));
      continue;
    }
    const normalized = ((conn.dihedralDeg % 360) + 360) % 360;
    const signedNormalized = normalized > 180 ? normalized - 360 : normalized;
    if (Math.abs(signedNormalized) > 180 + EPS) {
      issues.push(issue(modelId, `连接中 dihedralDeg 超出合理范围 [-180, 180]: ${conn.dihedralDeg}`, 'error', { code: ValidationIssueCode.DIHEDRAL_INVALID }));
    }
  }
}

function checkPieceAddedOnce(
  modelId: string,
  model: PhysicalModel,
  issues: ValidationIssue[]
) {
  const addedPieces: Record<string, number[]> = {};
  for (const step of model.steps) {
    for (const pid of step.addedPieceIds) {
      if (!addedPieces[pid]) addedPieces[pid] = [];
      addedPieces[pid].push(step.id);
    }
  }

  for (const [pid, stepIds] of Object.entries(addedPieces)) {
    if (stepIds.length > 1) {
      issues.push(issue(modelId, `零件 ${pid} 在多个步骤中被重复加入: 步骤 ${stepIds.join(', ')}`, 'error', { pieceId: pid, code: ValidationIssueCode.STEP }));
    }
  }
}

function checkConnectionStepCoverage(
  modelId: string,
  model: PhysicalModel,
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  const presentPieces = new Set<string>();
  const introducedConnections = new Set<string>();

  function connectionKey(c: Connection): string {
    return c.pieceA < c.pieceB
      ? `${c.pieceA}:${c.pieceB}:${c.portA}:${c.portB}`
      : `${c.pieceB}:${c.pieceA}:${c.portB}:${c.portA}`;
  }

  for (const step of model.steps) {
    for (const c of step.addedConnections) {
      const key = connectionKey(c);
      if (introducedConnections.has(key)) {
        issues.push(issue(modelId, `连接 ${key} 在步骤 ${step.id} 中重复引入`, 'error', { stepId: step.id, code: ValidationIssueCode.STEP }));
      }

      if (!presentPieces.has(c.pieceA) && !step.addedPieceIds.includes(c.pieceA)) {
        issues.push(issue(modelId, `步骤 ${step.id} 的连接引用了未来零件 ${c.pieceA}`, 'error', { stepId: step.id, pieceId: c.pieceA, code: ValidationIssueCode.STEP }));
      }
      if (!presentPieces.has(c.pieceB) && !step.addedPieceIds.includes(c.pieceB)) {
        issues.push(issue(modelId, `步骤 ${step.id} 的连接引用了未来零件 ${c.pieceB}`, 'error', { stepId: step.id, pieceId: c.pieceB, code: ValidationIssueCode.STEP }));
      }

      const shapeA = getShape(c.pieceA);
      const shapeB = getShape(c.pieceB);
      if (shapeA && !getPort(shapeA, c.portA)) {
        issues.push(issue(modelId, `步骤 ${step.id} 的连接引用了不存在的端口 ${c.pieceA}:${c.portA}`, 'error', { stepId: step.id, pieceId: c.pieceA, portId: c.portA, code: ValidationIssueCode.PORT_MISSING }));
      }
      if (shapeB && !getPort(shapeB, c.portB)) {
        issues.push(issue(modelId, `步骤 ${step.id} 的连接引用了不存在的端口 ${c.pieceB}:${c.portB}`, 'error', { stepId: step.id, pieceId: c.pieceB, portId: c.portB, code: ValidationIssueCode.PORT_MISSING }));
      }

      const inModel = model.connections.some((mc) => {
        const mcKey = connectionKey(mc);
        return mcKey === key;
      });
      if (!inModel) {
        issues.push(issue(modelId, `步骤 ${step.id} 的连接 ${key} 不属于 model.connections`, 'error', { stepId: step.id, code: ValidationIssueCode.STEP }));
      }

      introducedConnections.add(key);
    }

    for (const pid of step.addedPieceIds) presentPieces.add(pid);
  }

  for (const c of model.connections) {
    const key = connectionKey(c);
    if (!introducedConnections.has(key)) {
      issues.push(issue(modelId, `连接 ${key} 未在任何步骤中引入`, 'error', { code: ValidationIssueCode.STEP }));
    }
  }
}

function checkIntersectionsSAT(
  modelId: string,
  pieces: PieceRef[],
  connections: Connection[],
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  const connectionMap = new Map<string, Connection>();
  for (const c of connections) {
    const key = c.pieceA < c.pieceB ? `${c.pieceA}:${c.pieceB}` : `${c.pieceB}:${c.pieceA}`;
    connectionMap.set(key, c);
  }

  const prisms: Record<string, ConvexPrism> = {};
  for (const p of pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;
    prisms[p.id] = buildConvexPrism(shape, tf);
  }

  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i].id;
      const b = pieces[j].id;
      const pairKey = a < b ? `${a}:${b}` : `${b}:${a}`;
      const conn = connectionMap.get(pairKey);

      const prismA = prisms[a];
      const prismB = prisms[b];
      const shapeA = getShape(a);
      const shapeB = getShape(b);
      if (!prismA || !prismB || !shapeA || !shapeB) continue;

      const result = satConvexPrismIntersection(prismA, prismB);
      if (!result.intersects) continue;

      const avgThickness = (shapeA.thickness + shapeB.thickness) / 2;

      const tfA = transforms[a];
      const tfB = transforms[b];
      if (tfA && tfB) {
        const posDist = tfA.position.distanceTo(tfB.position);
        const rotDist = 1 - Math.abs(tfA.quaternion.dot(tfB.quaternion));
        if (posDist < 0.01 && rotDist < 0.01) {
        issues.push(
          issue(modelId, `零件 ${a} 与 ${b} 发生穿透 (完全重叠)`, 'error', {
            pieceId: a,
            code: ValidationIssueCode.INTERSECTION,
          })
        );
        continue;
      }
      }

      if (conn) {
        const portInfoA = getPortWorldEndpoints(a, conn.pieceA === a ? conn.portA : conn.portB, transforms, getShape, false);
        const portInfoB = getPortWorldEndpoints(b, conn.pieceB === b ? conn.portB : conn.portA, transforms, getShape, conn.flip || false);

        if (portInfoA && portInfoB) {
          const portDist = pointToSegmentDistance(portInfoA.p0, portInfoB.p0, portInfoB.p1);
          const isSeamPenetration = result.penetrationDepth < avgThickness * 1.5 &&
            portDist < avgThickness * 2;

          if (isSeamPenetration) {
            continue;
          }
        }

        if (result.penetrationDepth < 0.005) {
          continue;
        }
      }

      if (result.penetrationDepth > PENETRATION_DEPTH_TOLERANCE) {
        issues.push(
          issue(modelId, `零件 ${a} 与 ${b} 发生穿透 (穿透深度 ${result.penetrationDepth.toFixed(4)})`, 'error', {
            pieceId: a,
            code: ValidationIssueCode.INTERSECTION,
          })
        );
      }
    }
  }
}

function checkGroundPlaneWithThickness(
  modelId: string,
  _buildMode: string,
  pieces: PieceRef[],
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  for (const p of pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    const halfThick = shape.thickness / 2;
    let hasBelowGround = false;
    let lowestY = Infinity;

    for (const v of shape.vertices) {
      for (const z of [-halfThick, 0, halfThick]) {
        const world = new Vector3(v.x, v.y, z).applyMatrix4(matrix);
        if (world.y < lowestY) lowestY = world.y;
        if (world.y < -EPS) {
          hasBelowGround = true;
        }
      }
    }

    if (hasBelowGround) {
      issues.push(issue(modelId, `零件 ${p.id} 的顶点低于地面 (最低 y=${lowestY.toFixed(4)})`, 'error', { pieceId: p.id, code: ValidationIssueCode.GROUND }));
    }
  }
}

function checkSupportAndStabilityConvexHull(
  modelId: string,
  model: PhysicalModel,
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  const grounded = new Set<string>();
  const up = new Vector3(0, 1, 0);

  for (const p of model.pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;

    const normal = new Vector3(0, 0, 1).applyQuaternion(tf.quaternion).normalize();
    const isHorizontal = Math.abs(normal.dot(up)) > 0.95;
    if (!isHorizontal) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    let touchesGround = false;
    const halfThick = shape.thickness / 2;
    for (const v of shape.vertices) {
      for (const z of [-halfThick, halfThick]) {
        const world = new Vector3(v.x, v.y, z).applyMatrix4(matrix);
        if (world.y < GROUND_TOUCH_TOLERANCE) {
          touchesGround = true;
          break;
        }
      }
      if (touchesGround) break;
    }
    if (touchesGround) grounded.add(p.id);
  }

  if (grounded.size === 0) {
    issues.push(issue(modelId, '没有零件接触地面，模型缺乏支撑', 'error', { code: ValidationIssueCode.STABILITY }));
    return;
  }

  const adj: Record<string, string[]> = {};
  for (const c of model.connections) {
    if (!adj[c.pieceA]) adj[c.pieceA] = [];
    if (!adj[c.pieceB]) adj[c.pieceB] = [];
    adj[c.pieceA].push(c.pieceB);
    adj[c.pieceB].push(c.pieceA);
  }

  const supported = new Set<string>(grounded);
  const queue = Array.from(grounded);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj[cur] || []) {
      if (!supported.has(nxt)) {
        supported.add(nxt);
        queue.push(nxt);
      }
    }
  }

  const unsupported = model.pieces.filter((p) => !supported.has(p.id)).map((p) => p.id);
  if (unsupported.length > 0) {
    issues.push(issue(modelId, `以下零件缺乏到地面的支撑路径: ${unsupported.join(', ')}`, 'error', { code: ValidationIssueCode.STABILITY }));
  }

  let totalArea = 0;
  let weightedCenter = { x: 0, y: 0, z: 0 };

  for (const p of model.pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    const center = new Vector3(0, 0, 0).applyMatrix4(matrix);

    totalArea += shape.area;
    weightedCenter.x += center.x * shape.area;
    weightedCenter.y += center.y * shape.area;
    weightedCenter.z += center.z * shape.area;
  }

  if (totalArea > 0) {
    weightedCenter.x /= totalArea;
    weightedCenter.y /= totalArea;
    weightedCenter.z /= totalArea;
  }

  const groundProjectionPoints: Vec2[] = [];
  for (const pid of grounded) {
    const shape = getShape(pid);
    const tf = transforms[pid];
    if (!shape || !tf) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    const halfThick = shape.thickness / 2;
    for (const v of shape.vertices) {
      for (const z of [-halfThick, halfThick]) {
        const world = new Vector3(v.x, v.y, z).applyMatrix4(matrix);
        if (world.y < GROUND_TOUCH_TOLERANCE + 0.05) {
          groundProjectionPoints.push({ x: world.x, y: world.z });
        }
      }
    }
  }

  if (groundProjectionPoints.length < 3) {
    issues.push(issue(modelId, '接地零件不足以形成支撑多边形', 'warning', { code: ValidationIssueCode.STABILITY }));
    return;
  }

  const supportHull = convexHull2D(groundProjectionPoints);

  if (supportHull.length < 3) {
    issues.push(issue(modelId, '支撑区域凸包退化', 'warning', { code: ValidationIssueCode.STABILITY }));
    return;
  }

  const centroidProjection: Vec2 = { x: weightedCenter.x, y: weightedCenter.z };

  if (!pointInConvexPolygon(centroidProjection, supportHull)) {
    issues.push(
      issue(modelId, '加权重心投影在支撑凸包外，模型不稳定', 'error', { code: ValidationIssueCode.STABILITY })
    );
  } else {
    let minDist = Infinity;
    const n = supportHull.length;
    for (let i = 0; i < n; i++) {
      const a = supportHull[i];
      const b = supportHull[(i + 1) % n];
      const ab = sub2(b, a);
      const ap = sub2(centroidProjection, a);
      const abLen = len2(ab);
      if (abLen < EPS) continue;
      const t = Math.max(0, Math.min(1, dot2(ap, ab) / (abLen * abLen)));
      const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
      const dist = len2(sub2(centroidProjection, closest));
      if (dist < minDist) minDist = dist;
    }

    const hullSize = len2(sub2(supportHull[0], supportHull[Math.floor(n / 2)]));
    if (hullSize > 0 && minDist / hullSize < 0.1) {
      issues.push(
        issue(modelId, `加权重心接近支撑边界 (距离 ${minDist.toFixed(3)})，存在倾倒风险`, 'warning', { code: ValidationIssueCode.STABILITY })
      );
    }
  }
}

function checkPlanarityAllVertices(
  modelId: string,
  pieces: PieceRef[],
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  issues: ValidationIssue[]
) {
  if (pieces.length === 0) return;

  const allPoints: Vector3[] = [];
  for (const p of pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    for (const v of shape.vertices) {
      allPoints.push(new Vector3(v.x, v.y, 0).applyMatrix4(matrix));
    }
  }

  if (allPoints.length < 3) return;

  const p0 = allPoints[0];
  let p1 = allPoints[1];
  let p2 = allPoints[2];

  let maxDist = 0;
  for (let i = 1; i < allPoints.length; i++) {
    const d = allPoints[i].distanceTo(p0);
    if (d > maxDist) {
      maxDist = d;
      p1 = allPoints[i];
    }
  }

  const dir1 = new Vector3().subVectors(p1, p0).normalize();
  maxDist = 0;
  for (let i = 2; i < allPoints.length; i++) {
    const v = new Vector3().subVectors(allPoints[i], p0);
    const proj = v.clone().projectOnVector(dir1);
    const perp = v.sub(proj);
    const d = perp.length();
    if (d > maxDist) {
      maxDist = d;
      p2 = allPoints[i];
    }
  }

  const v1 = new Vector3().subVectors(p1, p0);
  const v2 = new Vector3().subVectors(p2, p0);
  const normal = new Vector3().crossVectors(v1, v2).normalize();
  const d = -normal.dot(p0);

  for (const p of pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;

    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    let maxDistance = 0;

    for (const v of shape.vertices) {
      const world = new Vector3(v.x, v.y, 0).applyMatrix4(matrix);
      const dist = Math.abs(normal.dot(world) + d);
      if (dist > maxDistance) maxDistance = dist;
    }

    if (maxDistance > PLANAR_DISTANCE_TOLERANCE) {
      issues.push(issue(modelId, `零件 ${p.id} 顶点偏离公共平面 (最大距离 ${maxDistance.toFixed(4)})`, 'error', { pieceId: p.id, code: ValidationIssueCode.PLANARITY }));
    }
  }
}
