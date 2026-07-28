import { describe, it } from 'vitest';
import { models } from '../data/models';
import { validatePhysicalModel, solveConnections } from '../engine';
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

describe('P0 真实清单', () => {
  it('生成六个模型的真实清单与校验结果', () => {
    console.log('\n========== P0 真实清单 ==========\n');

    const summary: Array<{
      id: string;
      name: string;
      theme: string;
      difficulty: string;
      buildMode: string;
      pieces: number;
      connections: number;
      steps: number;
      partsDeclared: number;
      partsUsed: number;
      shapes: string[];
      colors: string[];
      valid: boolean;
      errorCount: number;
      warningCount: number;
    }> = [];

    for (const modelData of models) {
      const model = convertToPhysicalModel(modelData);

      const partUsage: Record<string, number> = {};
      for (const part of model.parts) partUsage[part.id] = 0;
      for (const piece of model.pieces) {
        if (partUsage[piece.partId] !== undefined) partUsage[piece.partId]++;
      }

      const shapes = Array.from(new Set(model.parts.map((p) => p.shape)));
      const colors = Array.from(new Set(model.parts.map((p) => p.color)));

      const rootPiece = model.pieces.find((p) => p.isRoot) || model.pieces[0];
      const solverResult = solveConnections({
        pieces: model.pieces,
        connections: model.connections,
        rootPieceId: rootPiece.id,
        getShapeForPiece: (pid) => getShapeForPiece(pid, model),
      });

      const validationResult = validatePhysicalModel(model, (pid) => getShapeForPiece(pid, model));
      const errors = validationResult.issues.filter((i) => i.severity === 'error');
      const warnings = validationResult.issues.filter((i) => i.severity === 'warning');

      console.log(`--- ${model.id} (${model.name}) ---`);
      console.log(`  主题: ${model.theme}, 难度: ${model.difficulty}, 构建模式: ${model.buildMode}`);
      console.log(`  适合年龄: ${model.ageRange}, 预计时间: ${model.estimatedTime}`);
      console.log(`  零件实例数 (pieces): ${model.pieces.length}`);
      console.log(`  连接数 (connections): ${model.connections.length}`);
      console.log(`  步骤数 (steps): ${model.steps.length}`);
      console.log(`  形状: ${shapes.join(', ')}`);
      console.log(`  颜色: ${colors.join(', ')}`);
      console.log(`  零件清单 (parts):`);
      for (const part of model.parts) {
        console.log(`    - ${part.name}: 声明 ${part.count} 片, 实际使用 ${partUsage[part.id]} 片`);
      }
      console.log(`  步骤详情:`);
      model.steps.forEach((step, idx) => {
        const addedPieces = step.addedPieceIds?.length ?? 0;
        const addedConns = step.addedConnections?.length ?? 0;
        console.log(`    步骤 ${idx + 1} (${step.title}): 新增 ${addedPieces} 片, ${addedConns} 个连接`);
      });
      console.log(`  描述: ${model.description}`);
      console.log(`  求解器: ${solverResult.error ? `失败 - ${solverResult.error}` : '成功'}`);
      console.log(`  求解变换数: ${Object.keys(solverResult.transforms).length}`);
      console.log(`  物理校验: ${validationResult.valid ? '通过' : '失败'}`);
      console.log(`  错误数: ${errors.length}, 警告数: ${warnings.length}`);
      if (errors.length > 0) {
        console.log(`  错误列表:`);
        errors.forEach((e, i) => console.log(`    ${i + 1}. ${e.message}`));
      }
      if (warnings.length > 0) {
        console.log(`  警告列表:`);
        warnings.forEach((w, i) => console.log(`    ${i + 1}. ${w.message}`));
      }
      console.log('');

      // 步骤覆盖完整性:每片零件是否恰好被一个步骤引入
      const addedPieceSet: Record<string, number> = {};
      for (const step of model.steps) {
        for (const pid of step.addedPieceIds || []) {
          addedPieceSet[pid] = (addedPieceSet[pid] || 0) + 1;
        }
      }
      const uncoveredPieces = model.pieces.filter((p) => !addedPieceSet[p.id]).map((p) => p.id);
      const duplicatePieces = Object.entries(addedPieceSet).filter(([, c]) => c > 1);

      // 连接覆盖完整性
      const addedConnSet: Record<string, number> = {};
      for (const step of model.steps) {
        for (const c of step.addedConnections || []) {
          const key = c.pieceA < c.pieceB
            ? `${c.pieceA}:${c.pieceB}:${c.portA}:${c.portB}`
            : `${c.pieceB}:${c.pieceA}:${c.portB}:${c.portA}`;
          addedConnSet[key] = (addedConnSet[key] || 0) + 1;
        }
      }
      const uncoveredConns = model.connections.filter((c) => {
        const key = c.pieceA < c.pieceB
          ? `${c.pieceA}:${c.pieceB}:${c.portA}:${c.portB}`
          : `${c.pieceB}:${c.pieceA}:${c.portB}:${c.portA}`;
        return !addedConnSet[key];
      });

      console.log(`  步骤覆盖检查:`);
      console.log(`    未被步骤覆盖的零件: ${uncoveredPieces.length === 0 ? '无' : uncoveredPieces.join(', ')}`);
      console.log(`    被多个步骤重复引入的零件: ${duplicatePieces.length === 0 ? '无' : duplicatePieces.map(([k, v]) => `${k}(${v}次)`).join(', ')}`);
      console.log(`    未被步骤覆盖的连接: ${uncoveredConns.length === 0 ? '无' : uncoveredConns.length + '个'}`);
      console.log('');

      summary.push({
        id: model.id,
        name: model.name,
        theme: model.theme,
        difficulty: model.difficulty,
        buildMode: model.buildMode || 'flat',
        pieces: model.pieces.length,
        connections: model.connections.length,
        steps: model.steps.length,
        partsDeclared: model.parts.reduce((s, p) => s + p.count, 0),
        partsUsed: model.pieces.length,
        shapes,
        colors,
        valid: validationResult.valid,
        errorCount: errors.length,
        warningCount: warnings.length,
      });
    }

    console.log('========== 汇总表 ==========');
    console.log('ID        | 名称       | 主题   | 难度 | 模式   | 片数 | 连接 | 步骤 | 校验');
    console.log('----------|------------|--------|------|--------|------|------|------|------');
    for (const s of summary) {
      const id = s.id.padEnd(9);
      const name = s.name.padEnd(10);
      const theme = s.theme.padEnd(6);
      const diff = s.difficulty.padEnd(4);
      const mode = s.buildMode.padEnd(6);
      const pieces = String(s.pieces).padEnd(4);
      const conns = String(s.connections).padEnd(4);
      const steps = String(s.steps).padEnd(4);
      const valid = s.valid ? '通过' : '失败';
      console.log(`${id} | ${name} | ${theme} | ${diff} | ${mode} | ${pieces} | ${conns} | ${steps} | ${valid}`);
    }
    console.log('\n========== 与 README 比对 ==========');
    const readmeExpected = [
      { id: 'house-1', name: '温馨小房子', pieces: 12, steps: 3 },
      { id: 'car-1', name: '赛车', pieces: 5, steps: 4 },
      { id: 'rocket-1', name: '火箭', pieces: 6, steps: 4 },
      { id: 'cat-1', name: '小猫', pieces: 7, steps: 4 },
      { id: 'castle-1', name: '彩虹城堡', pieces: 20, steps: 5 },
      { id: 'penguin-1', name: '企鹅', pieces: 8, steps: 4 },
    ];
    for (const expected of readmeExpected) {
      const actual = summary.find((s) => s.id === expected.id);
      if (!actual) {
        console.log(`✗ ${expected.id}: 未找到`);
        continue;
      }
      const pieceMatch = actual.pieces === expected.pieces;
      const stepMatch = actual.steps === expected.steps;
      const status = pieceMatch && stepMatch ? '✓' : '✗';
      console.log(`${status} ${expected.id} (${expected.name}): README=${expected.pieces}片/${expected.steps}步, 实际=${actual.pieces}片/${actual.steps}步`);
    }
  });
});
