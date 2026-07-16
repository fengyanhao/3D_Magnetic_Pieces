import { Vector3, Quaternion, Matrix4 } from 'three';
import { Connection, PieceRef, PieceTransform, SolverResult, ShapeDef, LoopResidual } from './types';
import { getPort } from './shapes';

export interface SolverContext {
  pieces: PieceRef[];
  connections: Connection[];
  rootPieceId: string;
  getShapeForPiece: (pieceId: string) => ShapeDef | undefined;
}

const Q_GROUND = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

export function solveConnections(ctx: SolverContext): SolverResult {
  const { pieces, connections, rootPieceId, getShapeForPiece } = ctx;

  const transforms: Record<string, PieceTransform> = {};
  const visited = new Set<string>();
  const spanningTreeConnectionIndices = new Set<number>();

  const rootShape = getShapeForPiece(rootPieceId);
  if (!rootShape) {
    return { transforms, error: `根零件 ${rootPieceId} 缺少形状定义`, spanningTreeConnectionIndices, loopResiduals: [] };
  }
  transforms[rootPieceId] = {
    position: new Vector3(0, 0, 0),
    quaternion: Q_GROUND.clone(),
  };
  visited.add(rootPieceId);

  const adj: Record<string, { conn: Connection; neighbor: string; connIndex: number }[]> = {};
  connections.forEach((conn, idx) => {
    if (!adj[conn.pieceA]) adj[conn.pieceA] = [];
    if (!adj[conn.pieceB]) adj[conn.pieceB] = [];
    adj[conn.pieceA].push({ conn, neighbor: conn.pieceB, connIndex: idx });
    adj[conn.pieceB].push({ conn, neighbor: conn.pieceA, connIndex: idx });
  });

  const queue = [rootPieceId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentTf = transforms[currentId];

    for (const { conn, neighbor, connIndex } of adj[currentId] || []) {
      if (visited.has(neighbor)) continue;

      const isA = conn.pieceA === currentId;
      const basePieceId = currentId;
      const attachPieceId = neighbor;
      const basePortId = isA ? conn.portA : conn.portB;
      const attachPortId = isA ? conn.portB : conn.portA;
      const flip = conn.flip || false;

      const baseShape = getShapeForPiece(basePieceId);
      const attachShape = getShapeForPiece(attachPieceId);

      if (!baseShape) {
        return { transforms, error: `Piece ${basePieceId} 缺少形状定义`, spanningTreeConnectionIndices, loopResiduals: [] };
      }
      if (!attachShape) {
        return { transforms, error: `Piece ${attachPieceId} 缺少形状定义`, spanningTreeConnectionIndices, loopResiduals: [] };
      }

      const nextTf = computeTransformFromConnection(
        currentTf,
        baseShape,
        basePortId,
        attachShape,
        attachPortId,
        conn.dihedralDeg,
        flip
      );

      if (!nextTf) {
        return { transforms, error: `连接 ${conn.pieceA}:${conn.portA} <-> ${conn.pieceB}:${conn.portB} 中引用了不存在的端口`, spanningTreeConnectionIndices, loopResiduals: [] };
      }

      transforms[attachPieceId] = nextTf;
      visited.add(attachPieceId);
      spanningTreeConnectionIndices.add(connIndex);
      queue.push(attachPieceId);
    }
  }

  const minY = computeMinWorldY(pieces, transforms, getShapeForPiece);
  if (minY !== 0) {
    const offset = new Vector3(0, -minY, 0);
    for (const p of pieces) {
      const tf = transforms[p.id];
      if (tf) tf.position.add(offset);
    }
  }

  const loopResiduals = computeAllConnectionResiduals(
    connections,
    transforms,
    getShapeForPiece,
    spanningTreeConnectionIndices
  );

  return { transforms, spanningTreeConnectionIndices, loopResiduals };
}

export function computeMinWorldY(
  pieces: PieceRef[],
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined
): number {
  let minY = Infinity;
  for (const p of pieces) {
    const shape = getShape(p.id);
    const tf = transforms[p.id];
    if (!shape || !tf) continue;
    const matrix = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
    const halfThick = shape.thickness / 2;
    for (const v of shape.vertices) {
      for (const z of [-halfThick, halfThick]) {
        const world = new Vector3(v.x, v.y, z).applyMatrix4(matrix);
        if (world.y < minY) minY = world.y;
      }
    }
  }
  return minY === Infinity ? 0 : minY;
}

export function computeTransformFromConnection(
  baseTf: PieceTransform,
  baseShape: ShapeDef,
  basePortId: string,
  attachShape: ShapeDef,
  attachPortId: string,
  dihedralDeg: number,
  flip: boolean
): PieceTransform | null {
  const basePort = getPort(baseShape, basePortId);
  const attachPort = getPort(attachShape, attachPortId);
  if (!basePort) return null;
  if (!attachPort) return null;

  const baseMatrix = new Matrix4().compose(baseTf.position, baseTf.quaternion, new Vector3(1, 1, 1));
  const baseP0 = new Vector3(basePort.p0.x, basePort.p0.y, 0).applyMatrix4(baseMatrix);
  const baseP1 = new Vector3(basePort.p1.x, basePort.p1.y, 0).applyMatrix4(baseMatrix);
  const baseDir = new Vector3().subVectors(baseP1, baseP0).normalize();

  let attachP0 = new Vector3(attachPort.p0.x, attachPort.p0.y, 0);
  let attachP1 = new Vector3(attachPort.p1.x, attachPort.p1.y, 0);
  if (flip) {
    const tmp = attachP0.clone();
    attachP0 = attachP1.clone();
    attachP1 = tmp;
  }
  const attachDir = new Vector3().subVectors(attachP1, attachP0).normalize();

  const baseNormal = new Vector3(0, 0, 1).applyQuaternion(baseTf.quaternion).normalize();
  const attachNormal = new Vector3(0, 0, 1);

  const qDir = new Quaternion().setFromUnitVectors(attachDir, baseDir);

  const attachNormalAfterDir = attachNormal.clone().applyQuaternion(qDir);
  const cosAngle = attachNormalAfterDir.dot(baseNormal);
  const sinAngle = new Vector3().crossVectors(attachNormalAfterDir, baseNormal).dot(baseDir);
  const angle = Math.atan2(sinAngle, cosAngle);
  const qOrtho = new Quaternion().setFromAxisAngle(baseDir, angle);

  const qCoplanar = new Quaternion().multiplyQuaternions(qOrtho, qDir);

  const dihedralRad = (dihedralDeg * Math.PI) / 180;
  const qDihedral = new Quaternion().setFromAxisAngle(baseDir, dihedralRad);

  const finalQuaternion = new Quaternion().multiplyQuaternions(qDihedral, qCoplanar);

  const rotatedAttachP0 = attachP0.clone().applyQuaternion(finalQuaternion);
  const finalPosition = new Vector3().subVectors(baseP0, rotatedAttachP0);

  return { position: finalPosition, quaternion: finalQuaternion };
}

/**
 * 计算所有连接的残差（位置误差、方向误差、二面角误差）。
 * 用于闭环检查和验证。
 */
export function computeAllConnectionResiduals(
  connections: Connection[],
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  _spanningTreeIndices?: Set<number>
): LoopResidual[] {
  const residuals: LoopResidual[] = [];

  connections.forEach((conn, idx) => {
    const shapeA = getShape(conn.pieceA);
    const shapeB = getShape(conn.pieceB);
    const tfA = transforms[conn.pieceA];
    const tfB = transforms[conn.pieceB];

    if (!shapeA || !shapeB || !tfA || !tfB) return;

    const portA = getPort(shapeA, conn.portA);
    const portB = getPort(shapeB, conn.portB);
    if (!portA || !portB) return;

    const mA = new Matrix4().compose(tfA.position, tfA.quaternion, new Vector3(1, 1, 1));
    const mB = new Matrix4().compose(tfB.position, tfB.quaternion, new Vector3(1, 1, 1));

    const pA0 = new Vector3(portA.p0.x, portA.p0.y, 0).applyMatrix4(mA);
    const pA1 = new Vector3(portA.p1.x, portA.p1.y, 0).applyMatrix4(mA);
    const dirA = new Vector3().subVectors(pA1, pA0).normalize();

    let pB0 = new Vector3(portB.p0.x, portB.p0.y, 0).applyMatrix4(mB);
    let pB1 = new Vector3(portB.p1.x, portB.p1.y, 0).applyMatrix4(mB);
    if (conn.flip) {
      const tmp = pB0.clone();
      pB0 = pB1.clone();
      pB1 = tmp;
    }
    const dirB = new Vector3().subVectors(pB1, pB0).normalize();

    const avgPosError = (pA0.distanceTo(pB0) + pA1.distanceTo(pB1)) / 2;

    const directionDot = dirA.dot(dirB);

    const normalA = new Vector3(0, 0, 1).applyQuaternion(tfA.quaternion).normalize();
    const normalB = new Vector3(0, 0, 1).applyQuaternion(tfB.quaternion).normalize();

    const dihedralAngleRad = Math.acos(Math.max(-1, Math.min(1, normalA.dot(normalB))));
    const dihedralDegActual = (dihedralAngleRad * 180) / Math.PI;
    const dihedralError = Math.abs(dihedralDegActual - conn.dihedralDeg);

    const crossCheck = new Vector3().crossVectors(normalA, normalB).dot(dirA);
    const signedDihedral = crossCheck >= 0 ? dihedralDegActual : -dihedralDegActual;
    const signedError = Math.abs(signedDihedral - conn.dihedralDeg);
    const finalDihedralError = Math.min(dihedralError, signedError, 360 - dihedralError);

    residuals.push({
      connectionIndex: idx,
      pieceA: conn.pieceA,
      pieceB: conn.pieceB,
      portA: conn.portA,
      portB: conn.portB,
      positionError: avgPosError,
      directionDot,
      dihedralError: finalDihedralError,
    });
  });

  return residuals;
}

export function portWorldEndpoints(
  pieceId: string,
  portId: string,
  transforms: Record<string, PieceTransform>,
  getShape: (pid: string) => ShapeDef | undefined,
  flip: boolean = false
): { p0: Vector3; p1: Vector3; dir: Vector3; normal: Vector3 } | null {
  const shape = getShape(pieceId);
  const tf = transforms[pieceId];
  if (!shape || !tf) return null;

  const port = getPort(shape, portId);
  if (!port) return null;

  const m = new Matrix4().compose(tf.position, tf.quaternion, new Vector3(1, 1, 1));
  const p0 = new Vector3(port.p0.x, port.p0.y, 0).applyMatrix4(m);
  const p1 = new Vector3(port.p1.x, port.p1.y, 0).applyMatrix4(m);

  let rp0 = p0, rp1 = p1;
  if (flip) {
    rp0 = p1;
    rp1 = p0;
  }

  const dir = new Vector3().subVectors(rp1, rp0).normalize();
  const normal = new Vector3(0, 0, 1).applyQuaternion(tf.quaternion).normalize();

  return { p0: rp0, p1: rp1, dir, normal };
}
