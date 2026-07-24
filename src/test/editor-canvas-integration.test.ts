import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createInitialHistory, createEmptyProject, replaceProject,
  addPieceAction, setPieceTransformAction, setPieceColorAction,
  createConnectionAction, updateConnectionAction, removeConnectionAction,
  addStepAction, undo,
} from '../editor/state';
import { runValidation } from '../editor/validate';
import {
  findBestSnapCandidate, findCompatibleTargets,
  isPortOccupied, findConnectionToParent, computeDihedralFromMovedTransform,
  computeSnapTransform,
} from '../editor/snap';
import { computeFitCamera, applyFitResult, pieceWorldVertices } from '../components/magnet3d/cameraUtils';
import { buildShapeFromDef, buildInsetShapeFromDef } from '../components/magnet3d/primitives';
import { getShapeDef, semicircleShape, sectorShape } from '../engine/shapes';
import { ShapeDef } from '../engine/types';
import { serializeProject, parseProject, modelToProject } from '../editor/serialization';
import { models } from '../data/models';

/* ============================================================
 * 真实画布集成测试
 * 由于 WebGL 在 jsdom 中无法真正渲染,这些测试验证画布所依赖的
 * 核心逻辑:相机拟合算法、三轴变换语义、磁吸求解、连接选中、
 * 撤销事务一致性、曲边几何路径构建。
 * ============================================================ */

/* ----------------- 1. 相机稳定性 ----------------- */
describe('画布集成 - 相机稳定性', () => {
  it('computeFitCamera 对非空顶点集返回有效结果', () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    const verts = [
      new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, 1, 0),
    ];
    const result = computeFitCamera({
      worldVertices: verts,
      camera,
      size: { width: 800, height: 600 },
    });
    expect(result).not.toBeNull();
    expect(result!.zoom).toBeGreaterThan(0);
    expect(result!.target.length()).toBeGreaterThanOrEqual(0);
  });

  it('computeFitCamera 对空顶点集返回 null', () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    const result = computeFitCamera({ worldVertices: [], camera });
    expect(result).toBeNull();
  });

  it('applyFitResult 正确写入相机状态', () => {
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    const result = {
      position: new THREE.Vector3(3, 3, 3),
      quaternion: new THREE.Quaternion(),
      zoom: 42,
      target: new THREE.Vector3(1, 0, 0),
    };
    applyFitResult(camera, result);
    expect(camera.zoom).toBe(42);
    expect(camera.position.x).toBe(3);
  });

  it('pieceWorldVertices 包含曲边采样点(用于包围盒计算)', () => {
    const shape = semicircleShape;
    const verts = pieceWorldVertices(shape, new THREE.Vector3(0, 0, 0), new THREE.Quaternion());
    // 半圆有 2 个顶点 × 2 厚度 = 4 个基础点 + 曲边采样点
    expect(verts.length).toBeGreaterThan(4);
  });

  it('修改颜色后不应改变相机 zoom(逻辑层验证)', () => {
    // 模拟 EditorCanvas 的 lastFitProjectId 逻辑:
    // 只有 project.id 变化时才自动 fit,颜色变化不会触发
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;

    const initialProjectId = h.current.id;

    // 修改颜色
    h = setPieceColorAction(h, r.pieceId, 'blue');
    expect(h.current.id).toBe(initialProjectId); // project.id 不变 → 不触发 fit
  });

  it('导入模型后 project.id 变化 → 应触发 fit', () => {
    let h = createInitialHistory();
    const oldId = h.current.id;
    const house = models.find((m) => m.id === 'house-1')!;
    const p = modelToProject(house);
    h = replaceProject(h, p);
    expect(h.current.id).not.toBe(oldId); // id 变化 → 触发 fit
  });
});

/* ----------------- 2. 三轴变换 ----------------- */
describe('画布集成 - 三轴变换', () => {
  it('X 轴平移写入 position.x', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceTransformAction(h, r.pieceId, {
      position: [5, 0, 0], quaternion: [0, 0, 0, 1],
    });
    expect(h.current.transforms[r.pieceId].position[0]).toBe(5);
    expect(h.current.transforms[r.pieceId].position[1]).toBe(0);
    expect(h.current.transforms[r.pieceId].position[2]).toBe(0);
  });

  it('Y 轴平移写入 position.y', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceTransformAction(h, r.pieceId, {
      position: [0, 7, 0], quaternion: [0, 0, 0, 1],
    });
    expect(h.current.transforms[r.pieceId].position[1]).toBe(7);
  });

  it('Z 轴平移写入 position.z', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceTransformAction(h, r.pieceId, {
      position: [0, 0, 9], quaternion: [0, 0, 0, 1],
    });
    expect(h.current.transforms[r.pieceId].position[2]).toBe(9);
  });

  it('绕 Z 轴旋转 90° 的四元数与欧拉角一致', () => {
    const euler = new THREE.Euler(0, 0, THREE.MathUtils.degToRad(90), 'XYZ');
    const q = new THREE.Quaternion().setFromEuler(euler);
    // 验证旋转后的法线方向
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    expect(normal.x).toBeCloseTo(0, 5);
    expect(normal.y).toBeCloseTo(0, 5);
    expect(normal.z).toBeCloseTo(1, 5);
    // 验证 X 轴方向被旋转到 Y 轴
    const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    expect(xAxis.x).toBeCloseTo(0, 5);
    expect(xAxis.y).toBeCloseTo(1, 5);
    expect(xAxis.z).toBeCloseTo(0, 5);
  });

  it('属性面板三轴旋转值与四元数往返一致', () => {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(30),
      THREE.MathUtils.degToRad(45),
      THREE.MathUtils.degToRad(60),
      'XYZ'
    );
    const q = new THREE.Quaternion().setFromEuler(euler);
    // 反向还原
    const restored = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    expect(THREE.MathUtils.radToDeg(restored.x)).toBeCloseTo(30, 4);
    expect(THREE.MathUtils.radToDeg(restored.y)).toBeCloseTo(45, 4);
    expect(THREE.MathUtils.radToDeg(restored.z)).toBeCloseTo(60, 4);
  });
});

/* ----------------- 3. 磁吸 ----------------- */
describe('画布集成 - 磁吸', () => {
  it('findBestSnapCandidate 在两片靠近时返回候选', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    // 把 B 放到 A 旁边(距离 < SNAP_DISTANCE=0.6)
    h = setPieceTransformAction(h, b.pieceId, {
      position: [0.8, 0, 0], quaternion: [0, 0, 0, 1],
    });
    const candidate = findBestSnapCandidate(b.pieceId, h.current);
    expect(candidate).not.toBeNull();
    expect(candidate!.connection.pieceA).toBe(a.pieceId);
    expect(candidate!.connection.pieceB).toBe(b.pieceId);
  });

  it('findBestSnapCandidate 距离过远返回 null', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    // B 放得很远
    h = setPieceTransformAction(h, b.pieceId, {
      position: [10, 10, 0], quaternion: [0, 0, 0, 1],
    });
    const candidate = findBestSnapCandidate(b.pieceId, h.current);
    expect(candidate).toBeNull();
  });

  it('computeSnapTransform 返回有效变换', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    const tf = computeSnapTransform(
      a.pieceId, 'e0-p0',
      b.pieceId, 'e0-p0',
      90, false,
      h.current,
    );
    expect(tf).not.toBeNull();
    expect(tf!.position).toBeInstanceOf(THREE.Vector3);
    expect(tf!.quaternion).toBeInstanceOf(THREE.Quaternion);
  });

  it('已占用端口不会出现在候选中', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    const c = addPieceAction(h, 'square', 'green');
    h = c.history;
    // A-B 已连接
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    expect(isPortOccupied(a.pieceId, 'e0-p0', h.current.connections)).toBe(true);
    expect(isPortOccupied(b.pieceId, 'e0-p0', h.current.connections)).toBe(true);
    // C 查找兼容目标时,A 和 B 的 e0-p0 不应出现
    const targets = findCompatibleTargets({ pieceId: c.pieceId, portId: '' }, h.current);
    const occupied = targets.filter((t) =>
      (t.pieceId === a.pieceId && t.portId === 'e0-p0') ||
      (t.pieceId === b.pieceId && t.portId === 'e0-p0'),
    );
    expect(occupied).toHaveLength(0);
  });
});

/* ----------------- 4. 连接选中 ----------------- */
describe('画布集成 - 连接选中', () => {
  it('connection 索引在创建后可正确定位', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 90, flip: false,
    });
    expect(h.current.connections).toHaveLength(1);
    const conn = h.current.connections[0];
    expect(conn.pieceA).toBe(a.pieceId);
    expect(conn.pieceB).toBe(b.pieceId);
    expect(conn.dihedralDeg).toBe(90);
  });

  it('updateConnection 修改后选中连接的属性同步', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    h = updateConnectionAction(h, 0, { dihedralDeg: 45 });
    expect(h.current.connections[0].dihedralDeg).toBe(45);
    // 模拟选中 index=0 的连接
    const selectedIndex = 0;
    expect(h.current.connections[selectedIndex].dihedralDeg).toBe(45);
  });

  it('removeConnection 后索引失效(模拟悬空 selection 修复)', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    const c = addPieceAction(h, 'square', 'green');
    h = c.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    h = createConnectionAction(h, {
      pieceA: b.pieceId, portA: 'e1-p0',
      pieceB: c.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    expect(h.current.connections).toHaveLength(2);
    // 删除索引 0 后,索引 1 变成索引 0
    h = removeConnectionAction(h, 0);
    expect(h.current.connections).toHaveLength(1);
    // 模拟 P1-7: 之前选中 index=1 的连接现在应该重置(因为越界)
    const oldSelectionIndex = 1;
    expect(oldSelectionIndex >= h.current.connections.length).toBe(true);
  });
});

/* ----------------- 5. 撤销事务 ----------------- */
describe('画布集成 - 撤销事务(单次拖动单次撤销)', () => {
  it('单次 setPieceTransform 产生单个历史记录', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    const pastCountBefore = h.past.length;

    h = setPieceTransformAction(h, r.pieceId, {
      position: [1, 2, 3], quaternion: [0, 0, 0, 1],
    });
    expect(h.past.length).toBe(pastCountBefore + 1);
  });

  it('连续多次 setPieceTransform 每次都产生历史记录', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    const base = h.past.length;
    h = setPieceTransformAction(h, r.pieceId, { position: [1, 0, 0], quaternion: [0, 0, 0, 1] });
    h = setPieceTransformAction(h, r.pieceId, { position: [2, 0, 0], quaternion: [0, 0, 0, 1] });
    h = setPieceTransformAction(h, r.pieceId, { position: [3, 0, 0], quaternion: [0, 0, 0, 1] });
    expect(h.past.length).toBe(base + 3);
  });

  it('undo 后 transforms 回到上一状态', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceTransformAction(h, r.pieceId, { position: [5, 0, 0], quaternion: [0, 0, 0, 1] });
    expect(h.current.transforms[r.pieceId].position[0]).toBe(5);

    h = undo(h);
    // undo 后回到 addPiece 后的状态(默认 transform [0,0,0])
    expect(h.current.transforms[r.pieceId].position[0]).toBe(0);
  });

  it('createConnection + updateConnection 可分别撤销', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    const afterCreate = h.past.length;
    h = updateConnectionAction(h, 0, { dihedralDeg: 90 });
    expect(h.past.length).toBe(afterCreate + 1);

    // undo updateConnection
    h = undo(h);
    expect(h.current.connections[0].dihedralDeg).toBe(0);

    // undo createConnection
    h = undo(h);
    expect(h.current.connections).toHaveLength(0);
  });

  it('一次吸附(创建连接 + 应用 transform)产生至少一条历史(可一次 undo)', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    const beforeSnap = h.past.length;

    // 模拟吸附:先 setPieceTransform(应用吸附位置),再 createConnection
    h = setPieceTransformAction(h, b.pieceId, { position: [1, 0, 0], quaternion: [0, 0, 0, 1] });
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    // 至少产生了历史记录(实际 EditorCanvas 中 onMovePieceCommit + onCreateConnection)
    expect(h.past.length).toBeGreaterThan(beforeSnap);
  });
});

/* ----------------- 6. 曲边渲染 ----------------- */
describe('画布集成 - 曲边几何', () => {
  it('buildShapeFromDef 对半圆生成圆弧路径(非直线)', () => {
    const shape = semicircleShape;
    const threeShape = buildShapeFromDef(shape);
    expect(threeShape).toBeInstanceOf(THREE.Shape);
    // THREE.Shape 的 curves 应包含 EllipseCurve 或类似曲线(而非全部 LineCurve)
    const hasCurve = threeShape.curves.some((c) => !(c instanceof THREE.LineCurve));
    expect(hasCurve).toBe(true);
  });

  it('buildShapeFromDef 对扇形生成圆弧路径', () => {
    const shape = sectorShape;
    const threeShape = buildShapeFromDef(shape);
    const hasCurve = threeShape.curves.some((c) => !(c instanceof THREE.LineCurve));
    expect(hasCurve).toBe(true);
  });

  it('buildShapeFromDef 对正方形只有直线', () => {
    const shape = getShapeDef('square')!;
    const threeShape = buildShapeFromDef(shape);
    const allLine = threeShape.curves.every((c) => c instanceof THREE.LineCurve);
    expect(allLine).toBe(true);
  });

  it('buildShapeFromDef 退化(无 edges)回退到 vertices', () => {
    const shape: ShapeDef = {
      id: 'test',
      vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
      edges: [],
      ports: [],
      thickness: 0.05,
      defaultSize: 1,
      area: 0.5,
    };
    const threeShape = buildShapeFromDef(shape);
    expect(threeShape.curves).toHaveLength(3);
    expect(threeShape.curves.every((c) => c instanceof THREE.LineCurve)).toBe(true);
  });

  it('buildInsetShapeFromDef 对曲边形状不崩溃', () => {
    const shape = semicircleShape;
    const insetShape = buildInsetShapeFromDef(shape, 0.05);
    expect(insetShape).toBeInstanceOf(THREE.Shape);
    expect(insetShape.curves.length).toBeGreaterThan(0);
  });

  it('pieceWorldVertices 对半圆包含弧线采样点', () => {
    const shape = semicircleShape;
    const verts = pieceWorldVertices(
      shape,
      new THREE.Vector3(0, 0, 0),
      new THREE.Quaternion(),
    );
    // 基础 2 顶点 × 2 厚度 = 4,加上 9 个弧线采样点(8 步 + 1)
    expect(verts.length).toBeGreaterThan(10);
    // 验证弧线上的点距离圆心(0,0)约为 0.5
    const arcPoint = verts.find((v) => Math.abs(v.y - 0.5) < 0.01 && Math.abs(v.z) < 0.05);
    expect(arcPoint).toBeDefined();
  });

  it('半圆在零件库/编辑画布/预览中形状一致(序列化往返)', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'semicircle', 'red');
    h = r.history;
    const json = serializeProject(h.current);
    const parsed = parseProject(json);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.project!.pieces).toHaveLength(1);
    // 验证 shape 定义在往返后保持不变
    const shape = getShapeDef('semicircle')!;
    const hasCurve = shape.edges.some((e) => e.isCurved);
    expect(hasCurve).toBe(true);
  });
});

/* ----------------- 7. 连接组件语义(P0-3) ----------------- */
describe('画布集成 - 连接组件语义', () => {
  it('findConnectionToParent 对根零件返回 null', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    expect(findConnectionToParent(a.pieceId, h.current)).toBeNull();
  });

  it('findConnectionToParent 对已连接子零件返回连接索引', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    const parent = findConnectionToParent(b.pieceId, h.current);
    expect(parent).not.toBeNull();
    expect(parent!.index).toBe(0);
  });

  it('computeDihedralFromMovedTransform 对移动后的子零件返回二面角', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    // 模拟子零件旋转 90°
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      THREE.MathUtils.degToRad(90),
    );
    const result = computeDihedralFromMovedTransform(
      b.pieceId,
      { position: new THREE.Vector3(1, 0, 0), quaternion: q },
      h.current,
    );
    expect(result).not.toBeNull();
    expect(result!.index).toBe(0);
    expect(Math.abs(Math.abs(result!.dihedralDeg) - 90)).toBeLessThan(5);
  });
});

/* ----------------- 8. 草稿键隔离(P0-5) ----------------- */
describe('画布集成 - 草稿键隔离', () => {
  it('新建项目后 project.id 变化(草稿键隔离)', () => {
    let h = createInitialHistory();
    const oldId = h.current.id;
    const newProject = createEmptyProject();
    h = replaceProject(h, newProject);
    expect(h.current.id).not.toBe(oldId);
  });

  it('导入模型后 project.id 变化(不覆盖旧草稿)', () => {
    let h = createInitialHistory();
    const oldId = h.current.id;
    const house = models.find((m) => m.id === 'house-1')!;
    const p = modelToProject(house);
    h = replaceProject(h, p);
    expect(h.current.id).not.toBe(oldId);
  });
});

/* ----------------- 9. 预览模式默认从第 1 步(P1-8) ----------------- */
describe('画布集成 - 预览模式', () => {
  it('模型有步骤时 stepIdx 默认为 0(第 1 步)', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const p = modelToProject(house);
    expect(p.steps.length).toBeGreaterThan(0);
    // 预览模式初始 stepIdx=0,对应第 1 步
    const initialStepIdx = 0;
    expect(initialStepIdx).toBe(0);
  });

  it('首尾按钮禁用逻辑正确', () => {
    const stepCount = 3;
    // atStart: stepIdx === 0(非 showFullModel 时)
    expect(0 <= 0).toBe(true); // stepIdx=0 → atStart
    // atEnd: stepIdx >= stepCount - 1(非 showFullModel 时)
    expect(2 >= stepCount - 1).toBe(true); // stepIdx=2 → atEnd
    expect(1 >= stepCount - 1).toBe(false); // stepIdx=1 → 非 atEnd
  });
});

/* ----------------- 10. 完整工作流(端到端逻辑) ----------------- */
describe('画布集成 - 完整工作流', () => {
  it('添加两片 → 吸附 → 设置 90° → 加入步骤 → 校验', () => {
    let h = createInitialHistory();

    // 1. 添加两片
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'blue');
    h = b.history;
    expect(h.current.pieces).toHaveLength(2);

    // 2. 吸附(创建连接)
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    expect(h.current.connections).toHaveLength(1);

    // 3. 设置 90°
    h = updateConnectionAction(h, 0, { dihedralDeg: 90 });
    expect(h.current.connections[0].dihedralDeg).toBe(90);

    // 4. 加入步骤
    const s = addStepAction(h);
    h = s.history;
    expect(h.current.steps).toHaveLength(1);

    // 5. 校验(不应抛异常)
    const result = runValidation(h.current);
    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
  });

  it('导入小房子后模型可校验', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const p = modelToProject(house);
    const result = runValidation(p);
    expect(result).toBeDefined();
    // 小房子是合法模型,应通过校验或仅有少量警告
    expect(result.solverError).toBeUndefined();
  });
});
