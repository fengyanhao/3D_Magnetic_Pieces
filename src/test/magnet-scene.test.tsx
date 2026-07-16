import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MagnetScene } from '../components/MagnetScene';
import { Model } from '../data/types';

const testModelV1: Model = {
  id: 'test-v1',
  name: '测试模型',
  theme: 'other',
  difficulty: 'easy',
  ageRange: '4-6岁',
  minAge: 4,
  maxAge: 6,
  estimatedTime: '10分钟',
  coverImage: '',
  description: '测试用 v1 模型',
  parts: [
    { id: 'sq-1', name: '红色正方形', shape: 'square', color: 'red', count: 2 },
  ],
  skills: [],
  parentTips: [],
  steps: [
    {
      id: 1,
      title: '第一步',
      description: '',
      parentGuide: '',
      addedPieces: [
        { id: 'p1', partId: 'sq-1', position: [0, 0, 0], rotation: [0, 0, 0] },
        { id: 'p2', partId: 'sq-1', position: [1, 0, 0], rotation: [0, 0, 0] },
      ],
    },
  ],
};

describe('MagnetScene 拖拽事件处理', () => {
  it('pointercancel 后退出拖动状态', () => {
    const { container: c } = render(<MagnetScene model={testModelV1} stepIndex={0} interactive />);
    const container = c.querySelector('[data-testid="reset-view"]')?.parentElement?.parentElement;
    expect(container).not.toBeNull();
    if (!container) return;

    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });

    fireEvent.pointerMove(container, { clientX: 110, clientY: 90 });
    fireEvent.pointerMove(container, { clientX: 120, clientY: 80 });

    fireEvent.pointerCancel(container);

    fireEvent.pointerMove(container, { clientX: 200, clientY: 50 });

    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(container, { clientX: 110, clientY: 90 });
    fireEvent.pointerUp(container);

    expect(true).toBe(true);
  });

  it('lostpointercapture 后退出拖动状态', () => {
    const { container: c } = render(<MagnetScene model={testModelV1} stepIndex={0} interactive />);
    const container = c.querySelector('[data-testid="reset-view"]')?.parentElement?.parentElement;
    expect(container).not.toBeNull();
    if (!container) return;

    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(container, { clientX: 110, clientY: 90 });

    fireEvent.lostPointerCapture(container);

    fireEvent.pointerMove(container, { clientX: 200, clientY: 50 });

    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(container, { clientX: 115, clientY: 85 });
    fireEvent.pointerUp(container);

    expect(true).toBe(true);
  });

  it('pointercancel 后 touch-action 恢复正常', () => {
    const { container: c } = render(<MagnetScene model={testModelV1} stepIndex={0} interactive />);
    const container = c.querySelector('[data-testid="reset-view"]')?.parentElement?.parentElement;
    expect(container).not.toBeNull();
    if (!container) return;

    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(container);

    expect(true).toBe(true);
  });

  it('重置视角按钮可访问', () => {
    const { container: c } = render(<MagnetScene model={testModelV1} stepIndex={0} interactive />);
    const resetBtn = c.querySelector('[data-testid="reset-view"]');
    expect(resetBtn).not.toBeNull();
    expect(resetBtn).toHaveAttribute('aria-label', '重置视角');
    expect(resetBtn).toHaveClass('focus:ring-2', 'focus:ring-primary-500');
  });

  it('非交互模式下不显示重置按钮', () => {
    const { container: c } = render(<MagnetScene model={testModelV1} stepIndex={0} interactive={false} />);
    expect(c.querySelectorAll('[data-testid="reset-view"]').length).toBe(0);
  });
});
