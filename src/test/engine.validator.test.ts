import { describe, it, expect } from 'vitest';
import { validatePhysicalModel } from '../engine/validator';
import { shapeLibrary } from '../engine/shapes';
import { PhysicalModel, PieceRef, Connection, BuildStepV2 } from '../engine/types';

function getShapeForPiece(pieceId: string, pieces: PieceRef[]) {
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return undefined;
  const shapeId = piece.partId.startsWith('sq') ? 'square' : piece.partId;
  return shapeLibrary[shapeId];
}

function makeSimpleModel(
  id: string,
  buildMode: 'flat' | 'standing' | 'solid',
  pieces: PieceRef[],
  connections: Connection[],
  steps: BuildStepV2[] = []
): PhysicalModel {
  return {
    id,
    name: id,
    theme: 'other',
    difficulty: 'easy',
    ageRange: '4-6岁',
    minAge: 4,
    maxAge: 6,
    estimatedTime: '5分钟',
    coverImage: '',
    description: '',
    buildMode,
    parts: [{ id: 'sq-red', name: '红色正方形', color: 'red', count: pieces.length, shape: 'square' }],
    skills: [],
    parentTips: [],
    pieces,
    connections,
    steps,
  };
}

describe('engine.validator', () => {
  it('合法 flat 双正方形模型通过校验', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-flat', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error').length).toBe(0);
  });

  it('空零件列表报错', () => {
    const model = makeSimpleModel('test-empty', 'flat', [], []);
    const result = validatePhysicalModel(model, () => shapeLibrary.square);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('没有定义任何零件'))).toBe(true);
  });

  it('端口长度不兼容报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'hexagon' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-port-len', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('端口长度不兼容'))).toBe(true);
  });

  it('端口复用报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
      { id: 'p3', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p3', portB: 'e3-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2', 'p3'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-port-reuse', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('被多次使用'))).toBe(true);
  });

  it('多个不连通分量报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: [],
      },
    ];

    const model = makeSimpleModel('test-disconnected', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('不连通分量'))).toBe(true);
  });

  it('步骤中零件未连接到已有结构报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1'],
        addedConnections: [],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p2'],
        addedConnections: [],
      },
    ];

    const model = makeSimpleModel('test-step-reach', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('没有通过本步骤新增的连接连接到已有结构'))).toBe(true);
  });

  it('flat 模型零件不共面报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 90 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-planar', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('偏离公共平面'))).toBe(true);
  });

  it('不存在的端口必须返回 ValidationIssue，不能抛 TypeError', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e99-p99', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-missing-port', 'flat', pieces, connections, steps);
    expect(() => {
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes('不存在的端口'))).toBe(true);
    }).not.toThrow();
  });

  it('两块磁力片完全重叠必须判定为穿透', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e1-p0', dihedralDeg: 0 },
      { pieceA: 'p1', portA: 'e2-p0', pieceB: 'p2', portB: 'e2-p0', dihedralDeg: 0 },
      { pieceA: 'p1', portA: 'e3-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-overlap', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes('穿透'))).toBe(true);
  });

  it('dihedralDeg 必须为有限数且限定到统一范围', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: NaN },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-dihedral-nan', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('dihedralDeg 超出范围报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 1000 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
    ];

    const model = makeSimpleModel('test-dihedral-out-of-range', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('每个 piece 只能在步骤中加入一次', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: connections,
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p2'],
        addedConnections: [],
      },
    ];

    const model = makeSimpleModel('test-piece-added-twice', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('model.connections 必须在步骤中恰好引入一次', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
      { id: 'p3', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
      { pieceA: 'p2', portA: 'e0-p0', pieceB: 'p3', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: [connections[0]],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p3'],
        addedConnections: [],
      },
    ];

    const model = makeSimpleModel('test-connection-missing-in-steps', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('连接在步骤中重复引入报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1'],
        addedConnections: [],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p2'],
        addedConnections: [connections[0], connections[0]],
      },
    ];

    const model = makeSimpleModel('test-connection-duplicate-in-step', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('step.addedConnections 使用假端口报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1'],
        addedConnections: [],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p2'],
        addedConnections: [
          { pieceA: 'p1', portA: 'e99-p99', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
        ],
      },
    ];

    const model = makeSimpleModel('test-step-fake-port', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('step.addedConnections 使用未来零件报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
      { id: 'p3', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
      { pieceA: 'p2', portA: 'e0-p0', pieceB: 'p3', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: [connections[0], connections[1]],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p3'],
        addedConnections: [],
      },
    ];

    const model = makeSimpleModel('test-step-future-piece', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });

  it('step.addedConnections 使用不属于 model.connections 的连接报错', () => {
    const pieces: PieceRef[] = [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ];
    const connections: Connection[] = [
      { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0 },
    ];
    const steps: BuildStepV2[] = [
      {
        id: 1,
        title: 'step1',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p1'],
        addedConnections: [],
      },
      {
        id: 2,
        title: 'step2',
        description: '',
        parentGuide: '',
        addedPieceIds: ['p2'],
        addedConnections: [
          { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e1-p0', dihedralDeg: 90 },
        ],
      },
    ];

    const model = makeSimpleModel('test-step-connection-not-in-model', 'flat', pieces, connections, steps);
    const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, pieces));

    expect(result.valid).toBe(false);
  });
});
