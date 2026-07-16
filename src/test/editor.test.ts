import { describe, it, expect } from 'vitest';
import {
  createInitialHistory, createEmptyProject, replaceProject,
  addPieceAction, deletePieceAction, duplicatePieceAction, setPieceColorAction,
  setPieceTransformAction, createConnectionAction, removeConnectionAction,
  updateConnectionAction, addStepAction, deleteStepAction, moveStepAction,
  updateStepAction, addPieceToStepAction, saveCameraPresetAction,
  updateMetadataAction, undo, redo, canUndo, canRedo,
} from '../editor/state';
import {
  serializeProject, parseProject, migrateProject, integrityCheck,
  modelToProject, projectToModel, normalizeProject, isSupportedSchema,
  buildMaterialInventory,
} from '../editor/serialization';
import { uid, uniqueId } from '../editor/id';
import { isPortOccupied, portsCompatible, findCompatibleTargets, buildPortUsage } from '../editor/snap';
import { runValidation } from '../editor/validate';
import { SCHEMA_VERSION } from '../editor/types';
import { models } from '../data/models';
import { Model } from '../data/types';

/* ----------------- 稳定 ID ----------------- */
describe('editor/id', () => {
  it('uid 返回带前缀的字符串', () => {
    const id = uid('piece');
    expect(id.startsWith('piece-')).toBe(true);
    expect(id.length).toBeGreaterThan('piece-'.length + 8);
  });

  it('uniqueId 在已知集合中保证不冲突', () => {
    const existing = new Set<string>(['piece-1', 'piece-2']);
    const id = uniqueId('piece', existing);
    expect(existing.has(id)).toBe(false);
    expect(id.startsWith('piece-')).toBe(true);
  });

  it('uid 多次调用不重复', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(uid('p'));
    expect(ids.size).toBe(100);
  });
});

/* ----------------- 撤销 / 重做 ----------------- */
describe('editor/state undo/redo', () => {
  it('初始状态不能 undo / redo', () => {
    const h = createInitialHistory();
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('addPiece 后能 undo,undo 后能 redo', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    expect(h.current.pieces).toHaveLength(1);
    expect(canUndo(h)).toBe(true);

    h = undo(h);
    expect(h.current.pieces).toHaveLength(0);
    expect(canRedo(h)).toBe(true);

    h = redo(h);
    expect(h.current.pieces).toHaveLength(1);
  });

  it('新操作清空 future 栈', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    h = undo(h);
    expect(canRedo(h)).toBe(true);
    // 重新做一次新操作
    h = addPieceAction(h, 'square', 'blue').history;
    expect(canRedo(h)).toBe(false);
  });

  it('历史栈上限 100', () => {
    let h = createInitialHistory();
    for (let i = 0; i < 150; i++) {
      h = addPieceAction(h, 'square', 'red').history;
    }
    expect(h.past.length).toBeLessThanOrEqual(100);
    expect(h.current.pieces.length).toBe(150);
  });
});

/* ----------------- 零件操作 ----------------- */
describe('editor/state 零件操作', () => {
  it('addPiece 创建 part 和 piece,并自动同步 count', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    expect(h.current.parts).toHaveLength(1);
    expect(h.current.parts[0].shape).toBe('square');
    expect(h.current.parts[0].color).toBe('red');
    expect(h.current.parts[0].count).toBe(1);

    h = addPieceAction(h, 'square', 'red').history;
    expect(h.current.parts).toHaveLength(1); // 复用
    expect(h.current.parts[0].count).toBe(2);
    expect(h.current.pieces).toHaveLength(2);
  });

  it('addPiece 第一片自动 isRoot', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    expect(h.current.pieces[0].isRoot).toBe(true);
    const r2 = addPieceAction(h, 'square', 'blue');
    h = r2.history;
    expect(h.current.pieces[1].isRoot).toBe(false);
  });

  it('duplicatePiece 创建独立 ID 的副本', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    const originalId = r.pieceId;
    const d = duplicatePieceAction(h, originalId);
    h = d.history;
    expect(h.current.pieces).toHaveLength(2);
    expect(d.newId).not.toBe(originalId);
    expect(h.current.pieces.find((p) => p.id === d.newId)).toBeDefined();
  });

  it('setPieceColor 切换 partId,移除空 part', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceColorAction(h, r.pieceId, 'blue');
    expect(h.current.parts).toHaveLength(1);
    expect(h.current.parts[0].color).toBe('blue');
  });

  it('deletePiece 级联清理连接和步骤引用', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red');
    h = a.history;
    const b = addPieceAction(h, 'square', 'red');
    h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 90, flip: false,
    });
    const s = addStepAction(h);
    h = s.history;
    h = addPieceToStepAction(h, s.stepId, a.pieceId);

    h = deletePieceAction(h, a.pieceId);
    expect(h.current.pieces.find((p) => p.id === a.pieceId)).toBeUndefined();
    expect(h.current.connections).toHaveLength(0);
    expect(h.current.steps[0].addedPieceIds).not.toContain(a.pieceId);
  });

  it('setPieceTransform 写入 transforms', () => {
    let h = createInitialHistory();
    const r = addPieceAction(h, 'square', 'red');
    h = r.history;
    h = setPieceTransformAction(h, r.pieceId, {
      position: [3, 2, 1], quaternion: [0, 0, 0, 1],
    });
    expect(h.current.transforms[r.pieceId]).toEqual({
      position: [3, 2, 1], quaternion: [0, 0, 0, 1],
    });
  });
});

/* ----------------- 连接操作 ----------------- */
describe('editor/state 连接操作', () => {
  it('createConnection 后 transforms 被重算', () => {
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
    expect(h.current.connections).toHaveLength(1);
    expect(h.current.transforms[b.pieceId]).toBeDefined();
  });

  it('removeConnection 移除连接并重算 transforms', () => {
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
    h = removeConnectionAction(h, 0);
    expect(h.current.connections).toHaveLength(0);
  });

  it('updateConnection 修改 dihedral/flip', () => {
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
    h = updateConnectionAction(h, 0, { dihedralDeg: 90, flip: false });
    expect(h.current.connections[0].dihedralDeg).toBe(90);
    expect(h.current.connections[0].flip).toBe(false);
  });
});

/* ----------------- 步骤操作 ----------------- */
describe('editor/state 步骤操作', () => {
  it('addStep 默认标题非空', () => {
    let h = createInitialHistory();
    const r = addStepAction(h);
    h = r.history;
    expect(h.current.steps).toHaveLength(1);
    expect(h.current.steps[0].title).not.toBe('');
  });

  it('deleteStep 删除指定步骤', () => {
    let h = createInitialHistory();
    const r1 = addStepAction(h);
    h = r1.history;
    const r2 = addStepAction(h);
    h = r2.history;
    expect(h.current.steps).toHaveLength(2);
    h = deleteStepAction(h, r1.stepId);
    expect(h.current.steps).toHaveLength(1);
    expect(h.current.steps.find((s) => s.id === r1.stepId)).toBeUndefined();
  });

  it('moveStep 重排序并重新编号', () => {
    let h = createInitialHistory();
    const r1 = addStepAction(h); h = r1.history;
    const r2 = addStepAction(h); h = r2.history;
    const r3 = addStepAction(h); h = r3.history;
    expect(h.current.steps.map((s) => s.id)).toEqual([1, 2, 3]);
    h = moveStepAction(h, 0, 2);
    expect(h.current.steps.map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('updateStep 修改标题/说明', () => {
    let h = createInitialHistory();
    const r = addStepAction(h); h = r.history;
    h = updateStepAction(h, r.stepId, { title: '搭底座', description: '先放一片正方形' });
    expect(h.current.steps[0].title).toBe('搭底座');
    expect(h.current.steps[0].description).toBe('先放一片正方形');
  });

  it('addPieceToStep 去重', () => {
    let h = createInitialHistory();
    const p = addPieceAction(h, 'square', 'red');
    h = p.history;
    const s = addStepAction(h);
    h = s.history;
    h = addPieceToStepAction(h, s.stepId, p.pieceId);
    h = addPieceToStepAction(h, s.stepId, p.pieceId);
    expect(h.current.steps[0].addedPieceIds).toEqual([p.pieceId]);
  });
});

/* ----------------- 镜头预设 ----------------- */
describe('editor/state 镜头预设', () => {
  it('saveCameraPreset 添加到 cameraPresets', () => {
    let h = createInitialHistory();
    const initialCount = h.current.cameraPresets.length;
    const r = saveCameraPresetAction(h, {
      label: '侧视', position: [5, 0, 0], target: [0, 0, 0], zoom: 50,
    });
    h = r.history;
    expect(h.current.cameraPresets).toHaveLength(initialCount + 1);
    expect(r.presetId).toBeTruthy();
  });
});

/* ----------------- 端口占用与吸附 ----------------- */
describe('editor/snap 端口逻辑', () => {
  it('isPortOccupied 正确检测占用', () => {
    const conn = { pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0, flip: true };
    expect(isPortOccupied('p1', 'e0-p0', [conn])).toBe(true);
    expect(isPortOccupied('p2', 'e0-p0', [conn])).toBe(true);
    expect(isPortOccupied('p1', 'e1-p0', [conn])).toBe(false);
  });

  it('portsCompatible 长度差太大不兼容', () => {
    expect(portsCompatible({ length: 1 }, { length: 1 })).toBe(true);
    expect(portsCompatible({ length: 1 }, { length: 1.04 })).toBe(true);
    expect(portsCompatible({ length: 1 }, { length: 2 })).toBe(false);
  });

  it('buildPortUsage 汇总所有被占用端口', () => {
    const project = {
      ...createEmptyProject(),
      connections: [
        { pieceA: 'a', portA: 'e0-p0', pieceB: 'b', portB: 'e0-p0', dihedralDeg: 0, flip: true },
        { pieceA: 'c', portA: 'e0-p0', pieceB: 'd', portB: 'e0-p0', dihedralDeg: 0, flip: true },
      ],
    };
    const used = buildPortUsage(project);
    expect(used.has('a:e0-p0')).toBe(true);
    expect(used.has('b:e0-p0')).toBe(true);
    expect(used.has('c:e0-p0')).toBe(true);
    expect(used.has('d:e0-p0')).toBe(true);
    expect(used.size).toBe(4);
  });

  it('findCompatibleTargets 排除源零件自身和已占用端口', () => {
    let h = createInitialHistory();
    const a = addPieceAction(h, 'square', 'red'); h = a.history;
    const b = addPieceAction(h, 'square', 'blue'); h = b.history;
    h = createConnectionAction(h, {
      pieceA: a.pieceId, portA: 'e0-p0',
      pieceB: b.pieceId, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    const targets = findCompatibleTargets({ pieceId: a.pieceId, portId: 'e1-p0' }, h.current);
    expect(targets.find((t) => t.pieceId === b.pieceId && t.portId === 'e0-p0')).toBeUndefined();
  });
});

/* ----------------- 序列化与导入导出 ----------------- */
describe('editor/serialization 往返一致', () => {
  it('serialize -> parse 往复保持一致', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    h = addPieceAction(h, 'square', 'blue').history;
    h = createConnectionAction(h, {
      pieceA: h.current.pieces[0].id, portA: 'e0-p0',
      pieceB: h.current.pieces[1].id, portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    const s = addStepAction(h); h = s.history;

    const json = serializeProject(h.current);
    const r = parseProject(json);
    expect(r.errors).toHaveLength(0);
    expect(r.project).not.toBeNull();
    const p = r.project!;

    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.pieces).toHaveLength(2);
    expect(p.connections).toHaveLength(1);
    expect(p.steps).toHaveLength(1);
    expect(p.pieces[0].id).toBe(h.current.pieces[0].id);
    expect(p.pieces[1].id).toBe(h.current.pieces[1].id);
    expect(p.connections[0].dihedralDeg).toBe(0);
  });

  it('round-trip 后 transforms 可还原', () => {
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
    const before = h.current.transforms[b.pieceId];
    expect(before).toBeDefined();

    const r = parseProject(serializeProject(h.current));
    expect(r.project!.transforms[b.pieceId]).toEqual(before);
  });
});

/* ----------------- schemaVersion 迁移 ----------------- */
describe('editor/serialization schemaVersion 迁移', () => {
  it('isSupportedSchema 只接受 1', () => {
    expect(isSupportedSchema(1)).toBe(true);
    expect(isSupportedSchema(0)).toBe(false);
    expect(isSupportedSchema(2)).toBe(false);
  });

  it('migrateProject v0(无 schemaVersion)按 Model 迁移到 v1', () => {
    const houseModel = models[0];
    const r = migrateProject(houseModel);
    expect(r.project).not.toBeNull();
    expect(r.project!.schemaVersion).toBe(SCHEMA_VERSION);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('migrateProject 不支持的版本返回 null', () => {
    const r = migrateProject({ schemaVersion: 999 });
    expect(r.project).toBeNull();
  });

  it('parseProject 处理非法 JSON', () => {
    const r = parseProject('not a json');
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.project).toBeNull();
  });

  it('parseProject 处理 null', () => {
    const r = parseProject('null');
    expect(r.project).toBeNull();
  });

  it('parseProject 处理非对象 JSON', () => {
    const r = parseProject('"string"');
    expect(r.project).toBeNull();
  });

  it('normalizeProject 补全缺失字段,不白屏', () => {
    const p = normalizeProject({} as any);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Array.isArray(p.pieces)).toBe(true);
    expect(Array.isArray(p.connections)).toBe(true);
    expect(p.metadata.name).toBeTruthy();
  });
});

/* ----------------- 完整性检查 ----------------- */
describe('editor/serialization integrityCheck', () => {
  it('空方案无问题', () => {
    const p = createEmptyProject();
    const issues = integrityCheck(p);
    expect(issues).toHaveLength(0);
  });

  it('检测 partId 悬空', () => {
    const p = createEmptyProject();
    p.pieces.push({ id: 'x', partId: 'no-such-part' });
    const issues = integrityCheck(p);
    expect(issues.some((i) => i.message.includes('不存在的 partId'))).toBe(true);
  });

  it('检测连接引用不存在的零件', () => {
    const p = createEmptyProject();
    p.connections.push({
      pieceA: 'no', portA: 'e0-p0', pieceB: 'no2', portB: 'e0-p0',
      dihedralDeg: 0, flip: true,
    });
    const issues = integrityCheck(p);
    expect(issues.some((i) => i.message.includes('连接引用了不存在的零件'))).toBe(true);
  });

  it('检测未被步骤引用的零件(警告)', () => {
    const p = createEmptyProject();
    p.parts.push({ id: 'part-1', name: '正方形', shape: 'square', color: 'red', count: 1 });
    p.pieces.push({ id: 'p-1', partId: 'part-1' });
    const issues = integrityCheck(p);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('未被任何步骤引用'))).toBe(true);
  });
});

/* ----------------- 导入现有模型 ----------------- */
describe('editor/serialization modelToProject', () => {
  it('把 house 模型转成 EditorProject', () => {
    const house = models.find((m) => m.id === 'house-1') as Model;
    expect(house).toBeTruthy();
    const p = modelToProject(house);
    expect(p.schemaVersion).toBe(SCHEMA_VERSION);
    expect(p.pieces.length).toBeGreaterThan(0);
    expect(p.metadata.name).toBe(house.name);
    expect(p.steps.length).toBe(house.steps.length);
    for (const s of p.steps) {
      expect(s.title).toBeTruthy();
    }
  });

  it('projectToModel 与原 Model 字段对齐', () => {
    const house = models.find((m) => m.id === 'house-1') as Model;
    const p = modelToProject(house);
    const m = projectToModel(p);
    expect(m.name).toBe(house.name);
    expect(m.pieces?.length).toBe(house.pieces?.length);
    expect(m.connections?.length).toBe(house.connections?.length);
    expect(m.steps.length).toBe(house.steps.length);
  });
});

/* ----------------- 材料清单 ----------------- */
describe('editor/serialization buildMaterialInventory', () => {
  it('按 shape+color 汇总', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    h = addPieceAction(h, 'square', 'red').history;
    h = addPieceAction(h, 'square', 'blue').history;
    const inv = buildMaterialInventory(h.current);
    const redSquare = inv.find((i) => i.shape === 'square' && i.color === 'red');
    expect(redSquare?.count).toBe(2);
    const blueSquare = inv.find((i) => i.shape === 'square' && i.color === 'blue');
    expect(blueSquare?.count).toBe(1);
  });
});

/* ----------------- 校验集成 ----------------- */
describe('editor/validate runValidation', () => {
  it('空方案校验不抛异常', () => {
    const p = createEmptyProject();
    const r = runValidation(p);
    expect(r).toBeDefined();
    expect(typeof r.valid).toBe('boolean');
  });

  it('未连接零件会报告 unconnected', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    h = addPieceAction(h, 'square', 'blue').history;
    const r = runValidation(h.current);
    expect(r.issues.length).toBeGreaterThan(0);
    const unconn = r.issues.find((i) => i.category === 'unconnected');
    expect(unconn).toBeDefined();
  });

  it('校验结果 message 非空', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    h = addPieceAction(h, 'square', 'blue').history;
    const r = runValidation(h.current);
    for (const issue of r.issues) {
      expect(issue.message).toBeTruthy();
    }
  });
});

/* ----------------- metadata 更新 ----------------- */
describe('editor/state updateMetadata', () => {
  it('更新 name 等字段', () => {
    let h = createInitialHistory();
    h = updateMetadataAction(h, { name: '我的小房子', difficulty: 'hard' });
    expect(h.current.metadata.name).toBe('我的小房子');
    expect(h.current.metadata.difficulty).toBe('hard');
  });
});

/* ----------------- replaceProject ----------------- */
describe('editor/state replaceProject', () => {
  it('替换 current 并清空历史', () => {
    let h = createInitialHistory();
    h = addPieceAction(h, 'square', 'red').history;
    expect(h.past.length).toBeGreaterThan(0);
    const newP = createEmptyProject();
    h = replaceProject(h, newP);
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(0);
    expect(h.current.pieces).toHaveLength(0);
  });
});
