import { describe, it, expect } from 'vitest';
import { models } from '../data/models';
import { validatePhysicalModel, solveConnections, SolverContext } from '../engine';
import { shapeLibrary } from '../engine/shapes';
import { PhysicalModel, BuildStepV2 } from '../engine/types';

function convertToPhysicalModel(model: typeof models[0]): PhysicalModel {
  return {
    id: model.id,
    name: model.name,
    theme: model.theme,
    difficulty: model.difficulty,
    ageRange: model.ageRange,
    minAge: model.minAge,
    maxAge: model.maxAge,
    estimatedTime: model.estimatedTime,
    coverImage: model.coverImage,
    description: model.description,
    buildMode: model.buildMode || 'flat',
    parts: model.parts,
    skills: model.skills,
    parentTips: model.parentTips,
    pieces: model.pieces || [],
    connections: model.connections || [],
    steps: (model.steps as BuildStepV2[]) || [],
  };
}

function getShapeForPiece(pieceId: string, model: PhysicalModel) {
  const piece = model.pieces.find((p) => p.id === pieceId);
  if (!piece) return undefined;
  const part = model.parts.find((p) => p.id === piece.partId);
  if (!part) return undefined;
  return shapeLibrary[part.shape];
}

describe('models', () => {
  it('所有七个模型数据校验通过（六基础 + 一旗舰）', () => {
    expect(models.length).toBe(7);

    for (const modelData of models) {
      const model = convertToPhysicalModel(modelData);

      expect(model.pieces.length).toBeGreaterThan(0);
      expect(model.connections.length).toBeGreaterThan(0);
      expect(model.steps.length).toBeGreaterThan(0);

      const rootPiece = model.pieces.find((p) => p.isRoot) || model.pieces[0];
      const ctx: SolverContext = {
        pieces: model.pieces,
        connections: model.connections,
        rootPieceId: rootPiece.id,
        getShapeForPiece: (pid) => getShapeForPiece(pid, model),
      };

      const solverResult = solveConnections(ctx);
      expect(solverResult.error).toBeUndefined();
      expect(Object.keys(solverResult.transforms).length).toBe(model.pieces.length);

      const validationResult = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      expect(validationResult.issues).toBeDefined();
    }
  });

  it('零件数量与 parts.count 匹配', () => {
    for (const modelData of models) {
      const model = convertToPhysicalModel(modelData);
      const partUsage: Record<string, number> = {};

      for (const part of model.parts) {
        partUsage[part.id] = 0;
      }

      for (const piece of model.pieces) {
        if (partUsage[piece.partId] !== undefined) {
          partUsage[piece.partId]++;
        }
      }

      for (const part of model.parts) {
        expect(partUsage[part.id]).toBe(part.count);
      }
    }
  });

  describe('六个真实模型逐个 validation 断言', () => {
    for (const modelData of models) {
      it(`${modelData.id} (${modelData.name}) validation 通过`, () => {
        const model = convertToPhysicalModel(modelData);
        const validationResult = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));

        if (!validationResult.valid || validationResult.issues.filter((i) => i.severity === 'error').length > 0) {
          const errors = validationResult.issues.filter((i) => i.severity === 'error');
          console.error(`=== ${modelData.id} (${modelData.name}) 验证失败 ===`);
          console.error(`valid: ${validationResult.valid}`);
          console.error(`错误数量: ${errors.length}`);
          errors.forEach((issue, idx) => {
            console.error(`${idx + 1}. ${issue.message}`);
            if (issue.pieceId) console.error(`   pieceId: ${issue.pieceId}`);
            if (issue.portId) console.error(`   portId: ${issue.portId}`);
            if (issue.connectionIndex !== undefined) console.error(`   connectionIndex: ${issue.connectionIndex}`);
            if (issue.stepId) console.error(`   stepId: ${issue.stepId}`);
            if (issue.edgeId) console.error(`   edgeId: ${issue.edgeId}`);
          });
        }

        expect(validationResult.valid).toBe(true);
        expect(validationResult.issues.filter((i) => i.severity === 'error').length).toBe(0);
      });
    }
  });
});
