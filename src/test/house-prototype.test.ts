import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { solveConnections, SolverContext } from '../engine/solver';
import { validatePhysicalModel } from '../engine/validator';
import { shapeLibrary } from '../engine/shapes';
import { PhysicalModel, PieceRef, Connection, BuildStepV2 } from '../engine/types';

function getShapeForPiece(pieceId: string, pieces: PieceRef[]) {
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return undefined;
  if (piece.partId.startsWith('sq')) return shapeLibrary['square'];
  if (piece.partId.startsWith('tri')) return shapeLibrary['equilateral-triangle'];
  return shapeLibrary[piece.partId];
}

function buildHousePrototype(): {
  pieces: PieceRef[];
  connections: Connection[];
  steps: BuildStepV2[];
} {
  const pieces: PieceRef[] = [
    { id: 'base', partId: 'sq-red', isRoot: true },
    { id: 'wall-front', partId: 'sq-red' },
    { id: 'wall-back', partId: 'sq-red' },
    { id: 'wall-left', partId: 'sq-red' },
    { id: 'wall-right', partId: 'sq-red' },
  ];

  const connections: Connection[] = [
    { pieceA: 'base', portA: 'e0-p0', pieceB: 'wall-front', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base', portA: 'e2-p0', pieceB: 'wall-back', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base', portA: 'e3-p0', pieceB: 'wall-left', portB: 'e0-p0', dihedralDeg: -90 },
    { pieceA: 'base', portA: 'e1-p0', pieceB: 'wall-right', portB: 'e0-p0', dihedralDeg: -90 },
  ];

  const steps: BuildStepV2[] = [
    {
      id: 1,
      title: '搭底座',
      description: '',
      parentGuide: '',
      addedPieceIds: ['base'],
      addedConnections: [],
    },
    {
      id: 2,
      title: '建墙壁',
      description: '',
      parentGuide: '',
      addedPieceIds: ['wall-front', 'wall-back', 'wall-left', 'wall-right'],
      addedConnections: [
        { pieceA: 'base', portA: 'e0-p0', pieceB: 'wall-front', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base', portA: 'e2-p0', pieceB: 'wall-back', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base', portA: 'e3-p0', pieceB: 'wall-left', portB: 'e0-p0', dihedralDeg: -90 },
        { pieceA: 'base', portA: 'e1-p0', pieceB: 'wall-right', portB: 'e0-p0', dihedralDeg: -90 },
      ],
    },
  ];

  return { pieces, connections, steps };
}

describe('house-prototype', () => {
  it('四面墙竖立后法向水平（垂直于底座）', () => {
    const { pieces, connections } = buildHousePrototype();

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'base',
      getShapeForPiece: (pid) => getShapeForPiece(pid, pieces),
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeUndefined();

    const up = new Vector3(0, 1, 0);
    const wallIds = ['wall-front', 'wall-back', 'wall-left', 'wall-right'];

    for (const wallId of wallIds) {
      const tf = result.transforms[wallId];
      expect(tf).toBeDefined();

      const normal = new Vector3(0, 0, 1).applyQuaternion(tf.quaternion).normalize();
      const dotWithUp = Math.abs(normal.dot(up));
      expect(dotWithUp).toBeLessThan(0.05);
    }
  });

  it('validator 应通过房子模型', () => {
    const { pieces, connections, steps } = buildHousePrototype();

    const model: PhysicalModel = {
      id: 'house-test',
      name: '测试房子',
      theme: 'house',
      difficulty: 'easy',
      ageRange: '4-6岁',
      minAge: 4,
      maxAge: 6,
      estimatedTime: '10分钟',
      coverImage: '',
      description: '',
      buildMode: 'solid',
      parts: [
        { id: 'sq-red', name: '红色正方形', color: 'red', count: 5, shape: 'square' },
      ],
      skills: [],
      parentTips: [],
      pieces,
      connections,
      steps,
    };

    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBe(0);
    expect(result.valid).toBe(true);
  });
});
