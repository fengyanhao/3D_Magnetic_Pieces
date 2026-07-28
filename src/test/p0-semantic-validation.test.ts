import { describe, it, expect } from 'vitest';
import { validatePhysicalModel } from '../engine/validator';
import { shapeLibrary } from '../engine/shapes';
import {
  PhysicalModel,
  BuildStepV2,
  ValidationIssueCode,
} from '../engine/types';

/* P0-4 语义校验测试 */
/* 通过构造最小可重复用例，逐项验证四类语义校验：
 * - 零件步骤覆盖完整性（每个零件必须被且仅被一个步骤引入）
 * - 最终步骤完整性（累积新增 = 完整模型）
 * - 零件数一致性（parts[*].count 与实际 pieces 数量匹配）
 * - 结构宣称一致性（文案宣称的屋顶/塔楼/底座/墙必须真实存在）
 */

function makeBaseModel(overrides: Partial<PhysicalModel> = {}): PhysicalModel {
  return {
    id: 'test-model',
    name: '测试模型',
    theme: 'other',
    difficulty: 'easy',
    ageRange: '3-6岁',
    minAge: 3,
    maxAge: 6,
    estimatedTime: '10分钟',
    coverImage: '',
    description: '',
    buildMode: 'solid',
    parts: [],
    skills: [],
    parentTips: [],
    pieces: [],
    connections: [],
    steps: [],
    ...overrides,
  };
}

function getShapeForPiece(pieceId: string, model: PhysicalModel) {
  const piece = model.pieces.find((p) => p.id === pieceId);
  if (!piece) return undefined;
  const part = model.parts.find((p) => p.id === piece.partId);
  if (!part) return undefined;
  return shapeLibrary[part.shape];
}

/** 构造一个简单的 2 片水平拼接模型（flat 模式），全部覆盖、最终步完整、parts 数量一致 */
function makeValidFlatModel(): PhysicalModel {
  return makeBaseModel({
    buildMode: 'flat',
    parts: [{ id: 'sq-red', name: '红色正方形', color: 'red', count: 2, shape: 'square' }],
    pieces: [
      { id: 'p1', partId: 'sq-red', isRoot: true },
      { id: 'p2', partId: 'sq-red' },
    ],
    connections: [
      { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0, flip: true },
    ],
    steps: [
      {
        id: 1,
        title: '步骤 1',
        description: '放两片正方形',
        parentGuide: '',
        addedPieceIds: ['p1', 'p2'],
        addedConnections: [
          { pieceA: 'p1', portA: 'e1-p0', pieceB: 'p2', portB: 'e3-p0', dihedralDeg: 0, flip: true },
        ],
      },
    ],
  });
}

describe('P0-4 语义校验', () => {
  describe('零件步骤覆盖完整性', () => {
    it('所有零件都被步骤引入 → 无 SEMANTIC_PIECE_NOT_COVERED 错误', () => {
      const model = makeValidFlatModel();
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const semanticErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_PIECE_NOT_COVERED
      );
      expect(semanticErrors).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it('零件未被任何步骤引入 → 报 SEMANTIC_PIECE_NOT_COVERED', () => {
      const model = makeValidFlatModel();
      // 增加一片未在步骤中引入的零件
      model.pieces.push({ id: 'p3', partId: 'sq-red' });
      model.parts[0].count = 3;
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const semanticErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_PIECE_NOT_COVERED
      );
      expect(semanticErrors.length).toBeGreaterThan(0);
      expect(semanticErrors[0].pieceId).toBe('p3');
      expect(result.valid).toBe(false);
    });
  });

  describe('最终步骤完整性', () => {
    it('累积新增 = 完整模型 → 无 SEMANTIC_FINAL_STEP_INCOMPLETE', () => {
      const model = makeValidFlatModel();
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const finalErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_FINAL_STEP_INCOMPLETE
      );
      expect(finalErrors).toHaveLength(0);
    });

    it('步骤累积少于 model.pieces → 报 SEMANTIC_FINAL_STEP_INCOMPLETE', () => {
      const model = makeValidFlatModel();
      // 在 model 中加一片零件，但不加入任何步骤
      model.pieces.push({ id: 'p3', partId: 'sq-red' });
      model.parts[0].count = 3;
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const finalErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_FINAL_STEP_INCOMPLETE
      );
      expect(finalErrors.length).toBeGreaterThan(0);
    });

    it('步骤引入了不属于模型的零件 → 报 SEMANTIC_FINAL_STEP_INCOMPLETE', () => {
      const model = makeValidFlatModel();
      // 在步骤中加入一个不存在的 piece id
      model.steps[0].addedPieceIds.push('p-ghost');
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const finalErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_FINAL_STEP_INCOMPLETE
      );
      expect(finalErrors.some((e) => e.message.includes('不属于模型的零件'))).toBe(true);
    });
  });

  describe('零件数一致性', () => {
    it('parts.count 与 pieces 实际数量一致 → 无 SEMANTIC_PARTS_COUNT_MISMATCH', () => {
      const model = makeValidFlatModel();
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const countErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_PARTS_COUNT_MISMATCH
      );
      expect(countErrors).toHaveLength(0);
    });

    it('parts.count 与 pieces 实际数量不一致 → 报 SEMANTIC_PARTS_COUNT_MISMATCH', () => {
      const model = makeValidFlatModel();
      model.parts[0].count = 99; // 故意写错
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const countErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_PARTS_COUNT_MISMATCH
      );
      expect(countErrors).toHaveLength(1);
      expect(countErrors[0].message).toContain('99');
      expect(countErrors[0].message).toContain('2');
    });
  });

  describe('结构宣称一致性', () => {
    it('文案无结构宣称时不触发校验', () => {
      const model = makeValidFlatModel();
      model.description = '一个普通的拼搭';
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const structureErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_STRUCTURE_CLAIM
      );
      expect(structureErrors).toHaveLength(0);
    });

    it('宣称"底座"且存在水平触地零件 → 通过', () => {
      const model = makeValidFlatModel();
      model.buildMode = 'flat';
      model.description = '一个有底座的拼搭';
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const structureErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_STRUCTURE_CLAIM
      );
      expect(structureErrors).toHaveLength(0);
    });

    it('宣称"墙"但零件全部水平放置 → 报 SEMANTIC_STRUCTURE_CLAIM', () => {
      const model = makeValidFlatModel();
      model.buildMode = 'flat';
      model.description = '有墙的模型';
      // flat 模式下两片零件都是水平，没有竖立零件
      const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const structureErrors = result.issues.filter(
        (i) => i.code === ValidationIssueCode.SEMANTIC_STRUCTURE_CLAIM
      );
      expect(structureErrors.length).toBeGreaterThan(0);
      expect(structureErrors[0].message).toContain('墙');
    });
  });

  describe('六个内置模型均通过语义校验', () => {
    it('所有内置模型的语义校验都通过（无 SEMANTIC_* error）', async () => {
      const { models } = await import('../data/models');
      for (const m of models) {
        const model: PhysicalModel = {
          id: m.id,
          name: m.name,
          theme: m.theme,
          difficulty: m.difficulty,
          ageRange: m.ageRange,
          minAge: m.minAge,
          maxAge: m.maxAge,
          estimatedTime: m.estimatedTime,
          coverImage: m.coverImage,
          description: m.description,
          buildMode: m.buildMode || 'flat',
          parts: m.parts,
          skills: m.skills,
          parentTips: m.parentTips,
          pieces: m.pieces || [],
          connections: m.connections || [],
          steps: (m.steps as BuildStepV2[]) || [],
        };
        const result = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
        const semanticErrors = result.issues.filter(
          (i) => i.code && i.code.startsWith('semantic-') && i.severity === 'error'
        );
        expect(semanticErrors).toHaveLength(0);
        expect(result.valid).toBe(true);
      }
    });
  });
});
