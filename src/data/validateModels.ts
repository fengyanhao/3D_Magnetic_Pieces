import { models, themeLabels, difficultyLabels } from './models';

export interface ValidationError {
  modelId: string;
  modelName: string;
  message: string;
}

const validThemes = Object.keys(themeLabels);
const validDifficulties = Object.keys(difficultyLabels);
const validShapes = [
  'square', 'rectangle', 'equilateral-triangle', 'isosceles-triangle',
  'rhombus', 'trapezoid', 'hexagon', 'sector', 'pentagon',
];
const validColors = [
  'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple',
  'pink', 'white', 'black', 'clear',
];

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function validateModels(): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(models) || models.length === 0) {
    errors.push({ modelId: 'global', modelName: '全局', message: '模型列表为空' });
    return errors;
  }

  models.forEach((model) => {
    // 基本字段检查
    if (!model.id) {
      errors.push({ modelId: 'unknown', modelName: '未知', message: '模型缺少 id' });
      return;
    }
    if (!model.name) {
      errors.push({ modelId: model.id, modelName: model.id, message: '模型缺少 name' });
    }

    // 枚举值校验
    if (!validThemes.includes(model.theme)) {
      errors.push({ modelId: model.id, modelName: model.name, message: `theme "${model.theme}" 不在合法列表中` });
    }
    if (!validDifficulties.includes(model.difficulty)) {
      errors.push({ modelId: model.id, modelName: model.name, message: `difficulty "${model.difficulty}" 不在合法列表中` });
    }

    // 年龄范围校验
    if (!Number.isFinite(model.minAge) || !Number.isFinite(model.maxAge)) {
      errors.push({ modelId: model.id, modelName: model.name, message: 'minAge 或 maxAge 不是有效数字' });
    } else if (model.minAge > model.maxAge) {
      errors.push({ modelId: model.id, modelName: model.name, message: `minAge(${model.minAge}) 大于 maxAge(${model.maxAge})` });
    } else {
      const ageMatch = model.ageRange.match(/^(\d+)-(\d+)岁$/);
      if (!ageMatch) {
        errors.push({ modelId: model.id, modelName: model.name, message: `ageRange "${model.ageRange}" 格式不合法` });
      } else {
        const aMin = parseInt(ageMatch[1], 10);
        const aMax = parseInt(ageMatch[2], 10);
        if (aMin !== model.minAge || aMax !== model.maxAge) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `ageRange "${model.ageRange}" 与 minAge=${model.minAge}/maxAge=${model.maxAge} 不一致`,
          });
        }
      }
    }

    // 步骤校验
    if (!Array.isArray(model.steps) || model.steps.length === 0) {
      errors.push({ modelId: model.id, modelName: model.name, message: '模型 steps 为空' });
      return;
    }

    model.steps.forEach((step, stepIdx) => {
      if (step.id !== stepIdx + 1) {
        errors.push({
          modelId: model.id,
          modelName: model.name,
          message: `第 ${stepIdx + 1} 个步骤的 id 应为 ${stepIdx + 1}，实际为 ${step.id}`,
        });
      }
      const hasAddedPieces = Array.isArray(step.addedPieces) && step.addedPieces.length > 0;
      const hasAddedPieceIds = Array.isArray(step.addedPieceIds) && step.addedPieceIds.length > 0;
      if (!hasAddedPieces && !hasAddedPieceIds) {
        errors.push({
          modelId: model.id,
          modelName: model.name,
          message: `步骤 ${step.id} 没有新增零件`,
        });
      }
    });

    // 零件定义校验
    const partIdSet = new Set<string>();
    model.parts.forEach((part) => {
      if (partIdSet.has(part.id)) {
        errors.push({ modelId: model.id, modelName: model.name, message: `零件定义 id "${part.id}" 重复` });
      }
      partIdSet.add(part.id);

      if (!validShapes.includes(part.shape)) {
        errors.push({ modelId: model.id, modelName: model.name, message: `零件 ${part.name} 的 shape "${part.shape}" 不合法` });
      }
      if (!validColors.includes(part.color)) {
        errors.push({ modelId: model.id, modelName: model.name, message: `零件 ${part.name} 的 color "${part.color}" 不合法` });
      }
      if (!Number.isFinite(part.count) || part.count < 1) {
        errors.push({ modelId: model.id, modelName: model.name, message: `零件 ${part.name} 的 count 不合法: ${part.count}` });
      }
    });

    // 实例零件校验
    const pieceIds = new Set<string>();
    const partUsage: Record<string, number> = {};
    model.parts.forEach((p) => { partUsage[p.id] = 0; });

    const pieceMap: Record<string, { id: string; partId: string }> = {};
    model.pieces?.forEach((p) => { pieceMap[p.id] = p; });

    model.steps.forEach((step, stepIdx) => {
      // 旧格式
      step.addedPieces?.forEach((piece) => {
        if (!partIdSet.has(piece.partId)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `步骤 ${stepIdx + 1} 的零件 ${piece.partId} 不存在于零件清单中`,
          });
        }

        if (pieceIds.has(piece.id)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `零件实例 ${piece.id} 在模型中重复定义`,
          });
        }
        pieceIds.add(piece.id);

        if (partUsage[piece.partId] !== undefined) {
          partUsage[piece.partId]++;
        }

        // position/rotation 必须是有限数字
        if (!Array.isArray(piece.position) || piece.position.length !== 3 || !piece.position.every(isFiniteNumber)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `零件实例 ${piece.id} 的 position 不合法: [${piece.position?.join(', ')}]`,
          });
        }
        if (!Array.isArray(piece.rotation) || piece.rotation.length !== 3 || !piece.rotation.every(isFiniteNumber)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `零件实例 ${piece.id} 的 rotation 不合法: [${piece.rotation?.join(', ')}]`,
          });
        }
      });

      // v2 格式
      step.addedPieceIds?.forEach((pid) => {
        const piece = pieceMap[pid];
        if (!piece) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `步骤 ${stepIdx + 1} 的零件实例 ${pid} 未在 pieces 中定义`,
          });
          return;
        }
        if (!partIdSet.has(piece.partId)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `步骤 ${stepIdx + 1} 的零件 ${piece.partId} 不存在于零件清单中`,
          });
        }
        if (pieceIds.has(piece.id)) {
          errors.push({
            modelId: model.id,
            modelName: model.name,
            message: `零件实例 ${piece.id} 在模型中重复定义`,
          });
        }
        pieceIds.add(piece.id);
        if (partUsage[piece.partId] !== undefined) {
          partUsage[piece.partId]++;
        }
      });
    });

    model.parts.forEach((part) => {
      if (partUsage[part.id] !== part.count) {
        errors.push({
          modelId: model.id,
          modelName: model.name,
          message: `零件 ${part.name} 声明数量 ${part.count}，实际使用 ${partUsage[part.id]}`,
        });
      }
    });
  });

  return errors;
}

export function printValidationErrors(errors: ValidationError[]) {
  if (errors.length > 0) {
    console.error('模型数据校验失败：');
    errors.forEach((err) => {
      console.error(`  [${err.modelId}] ${err.modelName}: ${err.message}`);
    });
  } else {
    console.log('所有模型数据校验通过！');
  }
}

const errors = validateModels();
printValidationErrors(errors);

if (errors.length > 0) {
  throw new Error('模型数据校验失败，请检查上述错误');
}
