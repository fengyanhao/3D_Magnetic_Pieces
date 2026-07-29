/**
 * P0-7: 模型数据一致性测试 + "继续第0步"回归测试
 *
 * 验证：
 * 1. 模型ID唯一
 * 2. 温馨小房子（基础案例）和梦幻立体小屋（旗舰案例）数据口径正确
 * 3. parts.count 与 pieces 实际数量一致（单一数据源）
 * 4. steps 中 addedPieceIds 引用的 pieceId 都在 pieces 中存在
 * 5. coverImage 不再是手绘 SVG（P0-6 迁移验证）
 * 6. "继续第0步"回归：currentStep=0 时应显示"开始搭建"
 */
import { describe, it, expect } from 'vitest';
import { models } from '../data/models';

/* ----------------- P0-2: 进度判定逻辑（与 ModelDetailPage 保持一致） ----------------- */

export type ProgressState = 'none' | 'in-progress' | 'completed';

/**
 * 计算进度状态。与 ModelDetailPage 中的判定逻辑保持同步。
 *
 * - none: 无进度或 currentStep === 0 → 显示「开始搭建」
 * - in-progress: 0 < currentStep < steps.length → 显示「继续第N步」
 * - completed: currentStep >= steps.length → 显示「查看成品/再次搭建」
 */
export function getProgressState(
  progress: { currentStep: number } | null,
  totalSteps: number,
): ProgressState {
  if (!progress) return 'none';
  if (progress.currentStep >= totalSteps) return 'completed';
  if (progress.currentStep > 0) return 'in-progress';
  return 'none'; // currentStep === 0 视为无进度，不允许"继续第0步"
}

/**
 * 根据进度状态返回应显示的按钮文案。
 */
export function getProgressButtonText(
  progress: { currentStep: number } | null,
  totalSteps: number,
): string[] {
  const state = getProgressState(progress, totalSteps);
  switch (state) {
    case 'none':
      return ['开始搭建'];
    case 'in-progress':
      return [`继续第${progress!.currentStep}步`, '重新开始'];
    case 'completed':
      return ['查看成品', '再次搭建'];
  }
}

/* ----------------- 数据一致性测试 ----------------- */

describe('P0-7 模型数据一致性', () => {
  it('模型ID唯一', () => {
    const ids = models.map((m) => m.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(duplicates).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('模型数量为7（六基础 + 一旗舰）', () => {
    expect(models.length).toBe(7);
  });

  it('温馨小房子是基础案例：12片、3步', () => {
    const house = models.find((m) => m.id === 'house-1');
    expect(house).toBeDefined();
    expect(house!.name).toBe('温馨小房子');
    const totalParts = house!.parts.reduce((sum, p) => sum + p.count, 0);
    expect(totalParts).toBe(12);
    expect(house!.pieces?.length).toBe(12);
    expect(house!.steps.length).toBe(3);
  });

  it('梦幻立体小屋是复杂旗舰案例：29片、9步', () => {
    const flagship = models.find((m) => m.id === 'flagship-house-1');
    expect(flagship).toBeDefined();
    expect(flagship!.name).toBe('梦幻立体小屋');
    const totalParts = flagship!.parts.reduce((sum, p) => sum + p.count, 0);
    expect(totalParts).toBe(29);
    expect(flagship!.pieces?.length).toBe(29);
    expect(flagship!.steps.length).toBe(9);
  });

  it('温馨小房子和梦幻立体小屋是独立模型，ID不同', () => {
    const house = models.find((m) => m.id === 'house-1');
    const flagship = models.find((m) => m.id === 'flagship-house-1');
    expect(house).toBeDefined();
    expect(flagship).toBeDefined();
    expect(house!.id).not.toBe(flagship!.id);
    expect(house!.pieces?.length).not.toBe(flagship!.pieces?.length);
    expect(house!.steps.length).not.toBe(flagship!.steps.length);
  });

  it('每个模型的 parts.count 总和与 pieces 数量一致（单一数据源）', () => {
    for (const model of models) {
      const declaredTotal = model.parts.reduce((sum, p) => sum + p.count, 0);
      const actualTotal = model.pieces?.length ?? 0;
      expect(actualTotal).toBe(declaredTotal);
    }
  });

  it('每个 part 的 count 与 pieces 中引用该 partId 的数量一致', () => {
    for (const model of models) {
      const usage: Record<string, number> = {};
      for (const part of model.parts) usage[part.id] = 0;
      for (const piece of model.pieces ?? []) {
        if (usage[piece.partId] !== undefined) usage[piece.partId]++;
      }
      for (const part of model.parts) {
        expect(usage[part.id]).toBe(part.count);
      }
    }
  });

  it('所有 steps 中 addedPieceIds 引用的 pieceId 都在 pieces 中存在', () => {
    for (const model of models) {
      const pieceIds = new Set((model.pieces ?? []).map((p) => p.id));
      for (const step of model.steps) {
        if (!step.addedPieceIds) continue;
        for (const pid of step.addedPieceIds) {
          expect(pieceIds.has(pid)).toBe(true);
        }
      }
    }
  });

  it('所有步骤的 addedPieceIds 并集等于 pieces 全集（每个零件都被某步引入）', () => {
    for (const model of models) {
      const allPieceIds = new Set((model.pieces ?? []).map((p) => p.id));
      const referenced = new Set<string>();
      for (const step of model.steps) {
        if (!step.addedPieceIds) continue;
        for (const pid of step.addedPieceIds) referenced.add(pid);
      }
      // 旧格式 addedPieces 兼容
      for (const step of model.steps) {
        if (!step.addedPieces) continue;
        for (const p of step.addedPieces) referenced.add(p.id);
      }
      expect(referenced.size).toBe(allPieceIds.size);
    }
  });

  it('所有模型 coverImage 不再是手绘 SVG（P0-6 迁移验证）', () => {
    for (const model of models) {
      // coverImage 应为空字符串（由 useModelCover 运行时生成）
      // 不应包含 data:image/svg+xml
      expect(model.coverImage).not.toContain('data:image/svg+xml');
    }
  });

  it('每个模型至少有1个步骤、1个零件、1个连接', () => {
    for (const model of models) {
      expect(model.steps.length).toBeGreaterThanOrEqual(1);
      expect(model.pieces?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(model.connections?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });
});

/* ----------------- "继续第0步"回归测试 ----------------- */

describe('P0-2 "继续第0步"回归测试', () => {
  const totalSteps = 3; // 以温馨小房子为例

  it('无进度时显示"开始搭建"', () => {
    expect(getProgressState(null, totalSteps)).toBe('none');
    expect(getProgressButtonText(null, totalSteps)).toEqual(['开始搭建']);
  });

  it('currentStep=0 时显示"开始搭建"，不允许"继续第0步"', () => {
    // 这是回归核心：currentStep=0 不应触发 in-progress 状态
    expect(getProgressState({ currentStep: 0 }, totalSteps)).toBe('none');
    expect(getProgressButtonText({ currentStep: 0 }, totalSteps)).toEqual(['开始搭建']);
    // 确保不出现"继续第0步"字样
    const text = getProgressButtonText({ currentStep: 0 }, totalSteps).join('');
    expect(text).not.toContain('继续第0步');
  });

  it('currentStep=1 时显示"继续第1步"和"重新开始"', () => {
    expect(getProgressState({ currentStep: 1 }, totalSteps)).toBe('in-progress');
    const text = getProgressButtonText({ currentStep: 1 }, totalSteps);
    expect(text).toContain('继续第1步');
    expect(text).toContain('重新开始');
  });

  it('currentStep=2 时显示"继续第2步"和"重新开始"', () => {
    expect(getProgressState({ currentStep: 2 }, totalSteps)).toBe('in-progress');
    const text = getProgressButtonText({ currentStep: 2 }, totalSteps);
    expect(text).toContain('继续第2步');
  });

  it('currentStep>=totalSteps 时显示"查看成品"和"再次搭建"', () => {
    expect(getProgressState({ currentStep: 3 }, totalSteps)).toBe('completed');
    expect(getProgressState({ currentStep: 5 }, totalSteps)).toBe('completed');
    const text = getProgressButtonText({ currentStep: 3 }, totalSteps);
    expect(text).toContain('查看成品');
    expect(text).toContain('再次搭建');
  });

  it('所有模型的步骤切换都不应产生"继续第0步"', () => {
    for (const model of models) {
      for (let step = 0; step <= model.steps.length; step++) {
        const text = getProgressButtonText({ currentStep: step }, model.steps.length).join('');
        expect(text).not.toContain('继续第0步');
      }
    }
  });
});
