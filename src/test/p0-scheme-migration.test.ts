import { describe, it, expect } from 'vitest';
import {
  createEmptyScheme,
  serializeScheme,
  deserializeScheme,
  normalizeScheme,
  migrateV1ToV3,
  parseScheme,
  schemeToEditorProject,
  projectToScheme,
  serializeProjectAsScheme,
} from '../engine/scheme';
import { EditorProject } from '../editor/types';
import { models } from '../data/models';
import { modelToProject } from '../editor/serialization';
import { resnapshotTransforms } from '../editor/serialization';
import { validatePhysicalModel } from '../engine/validator';
import { shapeLibrary } from '../engine/shapes';
import { PhysicalModel } from '../engine/types';

/* ----------------- 基础格式 ----------------- */

describe('P0-3 SchemeDef v3 基础格式', () => {
  it('createEmptyScheme 返回 formatVersion=3', () => {
    const s = createEmptyScheme('test-1', '测试方案');
    expect(s.formatVersion).toBe(3);
    expect(s.meta.id).toBe('test-1');
    expect(s.meta.name).toBe('测试方案');
    expect(Array.isArray(s.parts)).toBe(true);
    expect(Array.isArray(s.pieces)).toBe(true);
    expect(Array.isArray(s.connections)).toBe(true);
    expect(Array.isArray(s.steps)).toBe(true);
    expect(Array.isArray(s.cameraPresets)).toBe(true);
    expect(s.thumbnail).toBeDefined();
  });

  it('serializeScheme -> deserializeScheme 往返一致', () => {
    const s = createEmptyScheme('rt-1', '往返测试');
    s.parts.push({ id: 'sq-red', name: '红色正方形', shape: 'square', color: 'red', count: 2 });
    s.pieces.push({ id: 'p1', partId: 'sq-red', isRoot: true });
    s.pieces.push({ id: 'p2', partId: 'sq-red' });
    s.connections.push({
      pieceA: 'p1', portA: 'e0-p0', pieceB: 'p2', portB: 'e0-p0', dihedralDeg: 0, flip: true,
    });
    s.steps.push({
      id: 1, title: '步骤 1', description: '', parentGuide: '',
      addedPieceIds: ['p1', 'p2'],
      addedConnections: [...s.connections],
    });

    const json = serializeScheme(s);
    const parsed = deserializeScheme(json);

    expect(parsed.formatVersion).toBe(3);
    expect(parsed.meta.id).toBe('rt-1');
    expect(parsed.meta.name).toBe('往返测试');
    expect(parsed.parts).toHaveLength(1);
    expect(parsed.pieces).toHaveLength(2);
    expect(parsed.connections).toHaveLength(1);
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0].addedPieceIds).toEqual(['p1', 'p2']);
  });

  it('deserializeScheme 拒绝错误版本号', () => {
    const bad = JSON.stringify({ formatVersion: 99, meta: { id: 'x' } });
    expect(() => deserializeScheme(bad)).toThrow();
  });

  it('normalizeScheme 补全缺失字段', () => {
    const n = normalizeScheme({ formatVersion: 3, meta: { id: 'x', name: 'n' } });
    expect(n.display.theme).toBe('other');
    expect(n.display.difficulty).toBe('easy');
    expect(n.thumbnail.source).toBe('auto');
  });
});

/* ----------------- v1 → v3 迁移器 ----------------- */

describe('P0-3 v1 → v3 迁移器', () => {
  it('migrateV1ToV3 把 EditorProject v1 升级为 SchemeDef v3', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const project: EditorProject = modelToProject(house);

    const scheme = migrateV1ToV3(project);
    expect(scheme.formatVersion).toBe(3);
    expect(scheme.meta.id).toBe(project.id);
    expect(scheme.meta.name).toBe(project.metadata.name);
    expect(scheme.meta.description).toBe(project.metadata.description);
    expect(scheme.meta.author).toBe(project.metadata.author || undefined);

    expect(scheme.display.theme).toBe(project.metadata.theme);
    expect(scheme.display.difficulty).toBe(project.metadata.difficulty);
    expect(scheme.display.ageRange).toBe(project.metadata.ageRange);
    expect(scheme.display.buildMode).toBe(project.metadata.buildMode);
    expect(scheme.display.skills).toEqual(project.metadata.tags);
    expect(scheme.display.parentTips).toEqual(project.metadata.teachingTips);

    expect(scheme.parts).toEqual(project.parts);
    expect(scheme.pieces).toEqual(project.pieces);
    expect(scheme.connections).toEqual(project.connections);
    expect(scheme.steps).toHaveLength(project.steps.length);
    expect(scheme.cameraPresets).toEqual(project.cameraPresets);
    expect(scheme.thumbnail).toEqual(project.thumbnail);
  });

  it('migrateV1ToV3 丢弃 transforms / validationInfo（运行时派生）', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const project: EditorProject = modelToProject(house);
    // 手动塞入 transforms 与 validationInfo
    project.transforms = { 'base-00': { position: [9, 9, 9], quaternion: [0, 0, 0, 1] } };
    (project as any).validationInfo = {
      checkedAt: '2024-01-01', valid: true, errorCount: 0, warningCount: 0,
    };

    const scheme = migrateV1ToV3(project);
    const json = serializeScheme(scheme);
    // v3 JSON 不应包含 transforms / validationInfo 字段
    expect(json).not.toContain('transforms');
    expect(json).not.toContain('validationInfo');
    expect(json).not.toContain('9, 9, 9');
  });

  it('parseScheme 自动识别 v1 并迁移到 v3', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const project: EditorProject = modelToProject(house);
    // 模拟旧 v1 JSON
    const v1Json = JSON.stringify(project);
    expect(v1Json).toContain('"schemaVersion":1');

    const scheme = parseScheme(v1Json);
    expect(scheme.formatVersion).toBe(3);
    expect(scheme.meta.name).toBe(house.name);
    expect(scheme.pieces).toHaveLength(house.pieces!.length);
  });

  it('parseScheme 自动识别 v3', () => {
    const s = createEmptyScheme('v3-test', 'v3 测试');
    const v3Json = serializeScheme(s);
    const parsed = parseScheme(v3Json);
    expect(parsed.formatVersion).toBe(3);
    expect(parsed.meta.id).toBe('v3-test');
  });

  it('parseScheme 兜底处理 v0 Model', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    // 去掉 schemaVersion/formatVersion，模拟无版本号的旧 Model 导出
    const v0: any = JSON.parse(JSON.stringify(house));
    delete v0.schemaVersion;
    delete v0.formatVersion;
    const v0Json = JSON.stringify(v0);

    const scheme = parseScheme(v0Json);
    expect(scheme.formatVersion).toBe(3);
    expect(scheme.meta.name).toBe(house.name);
  });

  it('parseScheme 拒绝无法识别的格式', () => {
    expect(() => parseScheme('null')).toThrow();
    expect(() => parseScheme('"string"')).toThrow();
    expect(() => parseScheme('42')).toThrow();
    expect(() => parseScheme(JSON.stringify({ schemaVersion: 999 }))).toThrow();
  });
});

/* ----------------- EditorProject ↔ SchemeDef 往返 ----------------- */

describe('P0-3 EditorProject ↔ SchemeDef v3 往返', () => {
  function makeProjectWithModel(): EditorProject {
    const house = models.find((m) => m.id === 'house-1')!;
    return modelToProject(house);
  }

  it('projectToScheme → schemeToEditorProject 字段对齐', () => {
    const project = makeProjectWithModel();
    const scheme = projectToScheme(project);
    const back = schemeToEditorProject(scheme);

    expect(back.schemaVersion).toBe(1); // 运行时视图保留 v1 标记
    expect(back.id).toBe(project.id);
    expect(back.metadata.name).toBe(project.metadata.name);
    expect(back.metadata.description).toBe(project.metadata.description);
    expect(back.metadata.theme).toBe(project.metadata.theme);
    expect(back.metadata.difficulty).toBe(project.metadata.difficulty);
    expect(back.metadata.ageRange).toBe(project.metadata.ageRange);
    expect(back.metadata.minAge).toBe(project.metadata.minAge);
    expect(back.metadata.maxAge).toBe(project.metadata.maxAge);
    expect(back.metadata.estimatedTime).toBe(project.metadata.estimatedTime);
    expect(back.metadata.buildMode).toBe(project.metadata.buildMode);
    expect(back.metadata.tags).toEqual(project.metadata.tags);
    expect(back.metadata.teachingTips).toEqual(project.metadata.teachingTips);
    expect(back.metadata.safetyTips).toEqual(project.metadata.safetyTips);
    expect(back.metadata.author).toBe(project.metadata.author);

    expect(back.parts).toEqual(project.parts);
    expect(back.pieces).toEqual(project.pieces);
    expect(back.connections).toEqual(project.connections);
    expect(back.steps).toHaveLength(project.steps.length);
    expect(back.cameraPresets).toEqual(project.cameraPresets);
    expect(back.thumbnail).toEqual(project.thumbnail);
  });

  it('serializeProjectAsScheme 输出 formatVersion=3', () => {
    const project = makeProjectWithModel();
    const json = serializeProjectAsScheme(project);
    const data = JSON.parse(json);
    expect(data.formatVersion).toBe(3);
    expect(data.schemaVersion).toBeUndefined();
  });

  it('完整往返：保存 → 加载 → 校验一致', () => {
    const project = makeProjectWithModel();
    // 模拟 transforms（原 modelToProject 已计算）
    expect(Object.keys(project.transforms).length).toBeGreaterThan(0);

    // 持久化为 v3
    const json = serializeProjectAsScheme(project);
    // 加载回 EditorProject
    const scheme = parseScheme(json);
    const loaded = schemeToEditorProject(scheme);
    // transforms 需要重新求解
    loaded.transforms = resnapshotTransforms(loaded);

    // 校验 transforms 与原始一致
    expect(Object.keys(loaded.transforms).length).toBe(Object.keys(project.transforms).length);
    for (const pieceId of Object.keys(project.transforms)) {
      const a = project.transforms[pieceId];
      const b = loaded.transforms[pieceId];
      expect(b).toBeDefined();
      // 位置误差 < 1e-4
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(a.position[i] - b.position[i])).toBeLessThan(1e-4);
      }
    }

    // 校验物理模型仍然通过
    const pm: PhysicalModel = {
      id: loaded.id, name: loaded.metadata.name, theme: loaded.metadata.theme,
      difficulty: loaded.metadata.difficulty, ageRange: loaded.metadata.ageRange,
      minAge: loaded.metadata.minAge, maxAge: loaded.metadata.maxAge,
      estimatedTime: loaded.metadata.estimatedTime, coverImage: '',
      description: loaded.metadata.description, buildMode: loaded.metadata.buildMode,
      parts: loaded.parts, skills: loaded.metadata.tags, parentTips: loaded.metadata.teachingTips,
      pieces: loaded.pieces, connections: loaded.connections, steps: loaded.steps,
    };
    const partMap = new Map(loaded.parts.map((p) => [p.id, p]));
    const pieceMap = new Map(loaded.pieces.map((p) => [p.id, p]));
    const getShape = (pid: string) => {
      const piece = pieceMap.get(pid);
      if (!piece) return undefined;
      const part = partMap.get(piece.partId);
      return part ? shapeLibrary[part.shape] : undefined;
    };
    const result = validatePhysicalModel(pm, getShape);
    expect(result.valid).toBe(true);
  });
});

/* ----------------- 双 Schema 收口验证 ----------------- */

describe('P0-3 双 Schema 收口：v3 为唯一持久化真值', () => {
  it('所有 6 个内置模型都能通过 v1→v3 迁移并保持校验通过', () => {
    for (const model of models) {
      const project = modelToProject(model);
      const scheme = migrateV1ToV3(project);
      expect(scheme.formatVersion).toBe(3);
      expect(scheme.pieces).toHaveLength(model.pieces!.length);
      expect(scheme.connections).toHaveLength(model.connections!.length);
      expect(scheme.steps).toHaveLength(model.steps.length);

      // 反向派生为 EditorProject 并校验
      const back = schemeToEditorProject(scheme);
      back.transforms = resnapshotTransforms(back);
      const pm: PhysicalModel = {
        id: back.id, name: back.metadata.name, theme: back.metadata.theme,
        difficulty: back.metadata.difficulty, ageRange: back.metadata.ageRange,
        minAge: back.metadata.minAge, maxAge: back.metadata.maxAge,
        estimatedTime: back.metadata.estimatedTime, coverImage: '',
        description: back.metadata.description, buildMode: back.metadata.buildMode,
        parts: back.parts, skills: back.metadata.tags, parentTips: back.metadata.teachingTips,
        pieces: back.pieces, connections: back.connections, steps: back.steps,
      };
      const partMap = new Map(back.parts.map((p) => [p.id, p]));
      const pieceMap = new Map(back.pieces.map((p) => [p.id, p]));
      const getShape = (pid: string) => {
        const piece = pieceMap.get(pid);
        if (!piece) return undefined;
        const part = partMap.get(piece.partId);
        return part ? shapeLibrary[part.shape] : undefined;
      };
      const result = validatePhysicalModel(pm, getShape);
      expect(result.valid).toBe(true);
    }
  });

  it('v3 JSON 不包含 schemaVersion / transforms / validationInfo', () => {
    const house = models.find((m) => m.id === 'house-1')!;
    const project = modelToProject(house);
    const json = serializeProjectAsScheme(project);
    expect(json).not.toContain('"schemaVersion"');
    expect(json).not.toContain('"transforms"');
    expect(json).not.toContain('"validationInfo"');
    expect(json).toContain('"formatVersion": 3');
  });
});
