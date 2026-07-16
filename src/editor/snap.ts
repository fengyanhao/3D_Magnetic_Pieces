import { Vector3, Quaternion } from 'three';
import { Connection, ShapeDef, PieceTransform } from '../engine/types';
import { getPort, getShapeDef } from '../engine/shapes';
import { computeTransformFromConnection } from '../engine/solver';
import { EditorProject } from './types';
import { transformFromSerializable, resnapshotTransforms } from './serialization';

/**
 * 端口吸附与连接管理逻辑。
 * 复用 engine 的 computeTransformFromConnection / portWorldEndpoints,
 * 不使用"看起来靠在一起"的视觉吸附,而是创建真实 Connection 数据。
 */

const PORT_LENGTH_TOLERANCE_RATIO = 0.05;
const SNAP_DISTANCE = 0.6; // 世界单位,吸附触发距离

function makeGetShape(project: EditorProject) {
  const partMap = new Map(project.parts.map((p) => [p.id, p]));
  return (pid: string): ShapeDef | undefined => {
    const piece = project.pieces.find((pp) => pp.id === pid);
    if (!piece) return undefined;
    const part = partMap.get(piece.partId);
    return part ? getShapeDef(part.shape) : undefined;
  };
}

/** 某零件某端口是否已被任何连接占用。 */
export function isPortOccupied(pieceId: string, portId: string, connections: Connection[]): boolean {
  return connections.some(
    (c) =>
      (c.pieceA === pieceId && c.portA === portId) ||
      (c.pieceB === pieceId && c.portB === portId),
  );
}

/** 两个端口是否长度兼容(可连接)。 */
export function portsCompatible(portA: { length: number }, portB: { length: number }): boolean {
  const avg = (portA.length + portB.length) / 2;
  if (avg <= 0) return false;
  return Math.abs(portA.length - portB.length) / avg <= PORT_LENGTH_TOLERANCE_RATIO;
}

/**
 * 计算显示用变换:可由 solver 推导的零件用 solver 结果,
 * 浮动(未连通到根)的零件用 editor transforms 缓存。
 */
export function getDisplayTransforms(project: EditorProject): Record<string, PieceTransform> {
  const solverTfs = resnapshotTransforms(project);
  const out: Record<string, PieceTransform> = {};
  for (const p of project.pieces) {
    const s = solverTfs[p.id];
    if (s) {
      out[p.id] = transformFromSerializable(s);
    } else if (project.transforms[p.id]) {
      out[p.id] = transformFromSerializable(project.transforms[p.id]);
    } else {
      out[p.id] = { position: new Vector3(0, 0, 0), quaternion: new Quaternion() };
    }
  }
  return out;
}

export interface PortRef {
  pieceId: string;
  portId: string;
}

export interface CompatibleTarget {
  pieceId: string;
  portId: string;
  edgeId: string;
  length: number;
}

/** 列出与源端口兼容且未占用的目标端口。 */
export function findCompatibleTargets(source: PortRef, project: EditorProject): CompatibleTarget[] {
  const getShape = makeGetShape(project);
  const sourceShape = getShape(source.pieceId);
  if (!sourceShape) return [];
  const sourcePort = getPort(sourceShape, source.portId);
  if (!sourcePort) return [];

  const results: CompatibleTarget[] = [];
  for (const piece of project.pieces) {
    if (piece.id === source.pieceId) continue;
    const shape = getShape(piece.id);
    if (!shape) continue;
    for (const port of shape.ports) {
      if (isPortOccupied(piece.id, port.portId, project.connections)) continue;
      if (!portsCompatible(sourcePort, port)) continue;
      results.push({ pieceId: piece.id, portId: port.portId, edgeId: port.edgeId, length: port.length });
    }
  }
  return results;
}

export interface SnapProposal {
  connection: Connection;
  resultingTransform: PieceTransform;
  basePieceId: string;
  basePortId: string;
  attachPieceId: string;
  attachPortId: string;
}

/**
 * 计算将 attachPiece 的 attachPort 连接到 basePiece 的 basePort 上的结果变换。
 * 复用 computeTransformFromConnection。
 */
export function computeSnapTransform(
  basePieceId: string,
  basePortId: string,
  attachPieceId: string,
  attachPortId: string,
  dihedralDeg: number,
  flip: boolean,
  project: EditorProject,
): PieceTransform | null {
  const getShape = makeGetShape(project);
  const baseShape = getShape(basePieceId);
  const attachShape = getShape(attachPieceId);
  if (!baseShape || !attachShape) return null;

  const display = getDisplayTransforms(project);
  const baseTf = display[basePieceId];
  if (!baseTf) return null;

  return computeTransformFromConnection(
    baseTf,
    baseShape,
    basePortId,
    attachShape,
    attachPortId,
    dihedralDeg,
    flip,
  );
}

const DEFAULT_DIHEDRAL_CANDIDATES: { dihedralDeg: number; flip: boolean }[] = [
  { dihedralDeg: 0, flip: true },
  { dihedralDeg: 90, flip: false },
  { dihedralDeg: -90, flip: false },
  { dihedralDeg: 180, flip: true },
];

/**
 * 为一个待放置零件寻找最近的吸附候选(用于拖放时自动吸附)。
 */
export function findBestSnapCandidate(
  attachPieceId: string,
  project: EditorProject,
  candidates: { dihedralDeg: number; flip: boolean }[] = DEFAULT_DIHEDRAL_CANDIDATES,
): SnapProposal | null {
  const getShape = makeGetShape(project);
  const attachShape = getShape(attachPieceId);
  if (!attachShape) return null;

  const display = getDisplayTransforms(project);
  const attachTf = display[attachPieceId];
  if (!attachTf) return null;

  let best: SnapProposal | null = null;
  let bestDist = SNAP_DISTANCE;

  for (const attachPort of attachShape.ports) {
    if (isPortOccupied(attachPieceId, attachPort.portId, project.connections)) continue;

    for (const basePiece of project.pieces) {
      if (basePiece.id === attachPieceId) continue;
      const baseShape = getShape(basePiece.id);
      if (!baseShape) continue;
      for (const basePort of baseShape.ports) {
        if (isPortOccupied(basePiece.id, basePort.portId, project.connections)) continue;
        if (!portsCompatible(attachPort, basePort)) continue;

        for (const cand of candidates) {
          const tf = computeSnapTransform(
            basePiece.id,
            basePort.portId,
            attachPieceId,
            attachPort.portId,
            cand.dihedralDeg,
            cand.flip,
            project,
          );
          if (!tf) continue;
          const dist = tf.position.distanceTo(attachTf.position);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              connection: {
                pieceA: basePiece.id,
                portA: basePort.portId,
                pieceB: attachPieceId,
                portB: attachPort.portId,
                dihedralDeg: cand.dihedralDeg,
                flip: cand.flip,
              },
              resultingTransform: tf,
              basePieceId: basePiece.id,
              basePortId: basePort.portId,
              attachPieceId,
              attachPortId: attachPort.portId,
            };
          }
        }
      }
    }
  }

  return best;
}

/** 端口占用状态汇总(供 UI 渲染端口状态)。 */
export function buildPortUsage(project: EditorProject): Set<string> {
  const used = new Set<string>();
  for (const c of project.connections) {
    used.add(`${c.pieceA}:${c.portA}`);
    used.add(`${c.pieceB}:${c.portB}`);
  }
  return used;
}
