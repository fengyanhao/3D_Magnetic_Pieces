/**
 * P1: 缓动函数库 — 用于教学播放器的入场动画与镜头过渡。
 * 纯函数，无 React/Three.js 依赖，便于单元测试。
 */
import type { EasingName } from '../../engine/types';

/** 单变量缓动函数：t ∈ [0, 1] → 输出值（通常 ∈ [0, 1]） */
export type EasingFn = (t: number) => number;

export const easingFunctions: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) {
      t -= 1.5 / d1;
      return n1 * t * t + 0.75;
    }
    if (t < 2.5 / d1) {
      t -= 2.25 / d1;
      return n1 * t * t + 0.9375;
    }
    t -= 2.625 / d1;
    return n1 * t * t + 0.984375;
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export function getEasing(name: EasingName): EasingFn {
  return easingFunctions[name] ?? easingFunctions.easeOutCubic;
}

/** 把 t 限制在 [0, 1] */
export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
