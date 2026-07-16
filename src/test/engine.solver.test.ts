import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { solveConnections, SolverContext } from '../engine/solver';
import { squareShape } from '../engine/shapes';
import { PieceRef, Connection } from '../engine/types';

function makeShapeMap(shape: typeof squareShape, pieces: PieceRef[]) {
  return (pieceId: string) => {
    const p = pieces.find((p) => p.id === pieceId);
    if (!p) return undefined;
    return shape;
  };
}

describe('engine.solver', () => {
  it('单根零件求解成功', () => {
    const pieces: PieceRef[] = [{ id: 'p1', partId: 'sq', isRoot: true }];
    const connections: Connection[] = [];

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'p1',
      getShapeForPiece: makeShapeMap(squareShape, pieces),
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeUndefined();
    expect(result.transforms['p1']).toBeDefined();
    expect(result.transforms['p1'].position).toBeDefined();
    expect(result.transforms['p1'].quaternion).toBeDefined();
    expect(result.spanningTreeConnectionIndices.size).toBe(0);
  });

  it('两个正方形平接（dihedralDeg=0）位置正确', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq', isRoot: true },
      { id: 'p2', partId: 'sq' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
    ];

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'p1',
      getShapeForPiece: makeShapeMap(squareShape, pieces),
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeUndefined();
    expect(result.transforms['p1']).toBeDefined();
    expect(result.transforms['p2']).toBeDefined();

    const normal1 = new Vector3(0, 0, 1).applyQuaternion(result.transforms['p1'].quaternion).normalize();
    const normal2 = new Vector3(0, 0, 1).applyQuaternion(result.transforms['p2'].quaternion).normalize();
    const dot = normal1.dot(normal2);
    expect(Math.abs(dot)).toBeGreaterThan(0.95);

    expect(result.loopResiduals.length).toBe(1);
    const residual = result.loopResiduals[0];
    expect(residual.positionError).toBeLessThan(0.01);
    expect(residual.directionDot).toBeGreaterThan(0.99);
  });

  it('两个正方形垂直连接（dihedralDeg=90）法向正确', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq', isRoot: true },
      { id: 'p2', partId: 'sq' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 90 },
    ];

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'p1',
      getShapeForPiece: makeShapeMap(squareShape, pieces),
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeUndefined();
    expect(result.transforms['p1']).toBeDefined();
    expect(result.transforms['p2']).toBeDefined();

    const normal1 = new Vector3(0, 0, 1).applyQuaternion(
      result.transforms['p1'].quaternion
    );
    const normal2 = new Vector3(0, 0, 1).applyQuaternion(
      result.transforms['p2'].quaternion
    );

    const dot = normal1.dot(normal2);
    expect(Math.abs(dot)).toBeLessThan(0.05);
  });

  it('缺失根零件报错', () => {
    const pieces: PieceRef[] = [{ id: 'p1', partId: 'sq', isRoot: true }];
    const connections: Connection[] = [];

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'nonexistent',
      getShapeForPiece: () => undefined,
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('根零件');
  });

  it('BFS 生成树边数量正确', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq', isRoot: true },
      { id: 'p2', partId: 'sq' },
      { id: 'p3', partId: 'sq' },
      { id: 'p4', partId: 'sq' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
      { pieceA: 'p2', portA: 'e1-p0', pieceB: 'p3', portB: 'e3-p0', dihedralDeg: 0 },
      { pieceA: 'p3', portA: 'e1-p0', pieceB: 'p4', portB: 'e3-p0', dihedralDeg: 0 },
      { pieceA: 'p1', portA: 'e2-p0', pieceB: 'p4', portB: 'e0-p0', dihedralDeg: 0 },
    ];

    const ctx: SolverContext = {
      pieces,
      connections,
      rootPieceId: 'p1',
      getShapeForPiece: makeShapeMap(squareShape, pieces),
    };

    const result = solveConnections(ctx);

    expect(result.error).toBeUndefined();
    expect(result.spanningTreeConnectionIndices.size).toBe(pieces.length - 1);
  });
});
