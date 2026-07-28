/**
 * P1: 教学编排状态机 — 纯逻辑，无 React/Three.js 依赖。
 *
 * 职责：
 * - 跟踪当前步骤、播放状态、步骤内时间轴
 * - 计算每片零件的入场动画进度（0..1）和阶段
 * - 计算镜头过渡进度
 * - 处理 play/pause/replay/prev/next/seek 命令
 * - 兼容 prefers-reduced-motion
 *
 * 设计原则：
 * - 状态机是纯函数：输入 (state, action, dt) → 新 state
 * - 宿主（React Hook）负责调用 tick(state, dtMs) 推进时间
 * - 入场参数从 BuildStepV2.entrance 读取，缺失则使用默认值
 */
import type { BuildStepV2, PieceEntranceConfig, EntranceType } from '../../engine/types';
import { getEasing, clamp01 } from './easing';

/** 默认入场参数 */
export const DEFAULT_ENTRANCE: PieceEntranceConfig = {
  type: 'drop',
  delayMs: 0,
  durationMs: 800,
  easing: 'easeOutCubic',
};

/** 同批次零件的默认间隔（毫秒） */
export const DEFAULT_BATCH_INTERVAL_MS = 150;

/** 默认单片动画时长下限/上限（毫秒） */
export const DEFAULT_DURATION_MIN_MS = 700;
export const DEFAULT_DURATION_MAX_MS = 1000;

/** 默认高亮时间（毫秒） */
export const DEFAULT_HIGHLIGHT_MS = 600;

/** 默认镜头过渡时长（毫秒） */
export const DEFAULT_CAMERA_TRANSITION_MS = 800;

/** 零件动画阶段 */
export type PiecePhase = 'pending' | 'entering' | 'highlight' | 'done';

/** 零件在某时刻的动画状态 */
export interface PieceAnimationState {
  pieceId: string;
  phase: PiecePhase;
  /** 0..1 入场进度（phase='entering' 时有意义） */
  progress: number;
  /** 是否为新零件（本步新增） */
  isNew: boolean;
}

/** 播放状态 */
export type PlayState = 'idle' | 'playing' | 'paused';

/** 编排器状态 */
export interface OrchestratorState {
  /** 当前步骤索引（0-based） */
  currentStep: number;
  /** 播放状态 */
  playState: PlayState;
  /** 当前步骤内已流逝时间（毫秒），步骤切换时归零 */
  elapsedInStepMs: number;
  /** 本步总时长（毫秒，所有零件动画 + 高亮结束） */
  stepTotalMs: number;
  /** 镜头过渡进度 0..1 */
  cameraTransitionProgress: number;
  /** 是否锁定视角（用户手动锁定后，步骤切换不再移动相机） */
  lockedView: boolean;
  /** 是否启用减少动态 */
  reducedMotion: boolean;
  /** 本步零件动画状态（按 pieceId 索引） */
  pieceStates: Record<string, PieceAnimationState>;
}

/** 编排器动作 */
export type OrchestratorAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'replay-step' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; stepIndex: number }
  | { type: 'lock-view'; locked: boolean }
  | { type: 'set-reduced-motion'; reduced: boolean };

/* ----------------- 工具函数 ----------------- */

/** 为一片零件解析入场配置（合并默认值） */
export function resolveEntrance(
  pieceId: string,
  step: BuildStepV2,
  indexInBatch: number,
): PieceEntranceConfig {
  const cfg = step.entrance?.[pieceId];
  if (cfg) {
    return {
      type: cfg.type,
      delayMs: cfg.delayMs ?? 0,
      durationMs: clamp(cfg.durationMs, DEFAULT_DURATION_MIN_MS, DEFAULT_DURATION_MAX_MS),
      easing: cfg.easing,
      startOffset: cfg.startOffset,
      startRotation: cfg.startRotation,
    };
  }
  // 默认：按批次顺序错开 delay
  return {
    ...DEFAULT_ENTRANCE,
    delayMs: indexInBatch * DEFAULT_BATCH_INTERVAL_MS,
    durationMs: 800,
  };
}

/** 计算步骤总时长（最后一片零件动画结束 + 高亮时间） */
export function computeStepDuration(step: BuildStepV2): number {
  if (step.addedPieceIds.length === 0) {
    return DEFAULT_CAMERA_TRANSITION_MS + 100;
  }
  let maxEnd = 0;
  step.addedPieceIds.forEach((pid, idx) => {
    const cfg = resolveEntrance(pid, step, idx);
    const end = cfg.delayMs + cfg.durationMs;
    if (end > maxEnd) maxEnd = end;
  });
  const highlightMs = step.highlightMs ?? DEFAULT_HIGHLIGHT_MS;
  return maxEnd + highlightMs + 200; // 留 200ms 余量
}

/** 计算零件在某时刻的相位与进度 */
function computePiecePhase(
  pieceId: string,
  isNew: boolean,
  elapsedMs: number,
  step: BuildStepV2,
  indexInBatch: number,
  reducedMotion: boolean,
): PieceAnimationState {
  if (!isNew) {
    return { pieceId, phase: 'done', progress: 1, isNew: false };
  }

  // reduced-motion：直接显示在最终位置，但仍给一个短暂的轮廓提示
  if (reducedMotion) {
    return { pieceId, phase: 'done', progress: 1, isNew: true };
  }

  const cfg = resolveEntrance(pieceId, step, indexInBatch);
  const startAt = cfg.delayMs;
  const endAt = cfg.delayMs + cfg.durationMs;
  const highlightMs = step.highlightMs ?? DEFAULT_HIGHLIGHT_MS;

  if (elapsedMs < startAt) {
    return { pieceId, phase: 'pending', progress: 0, isNew: true };
  }
  if (elapsedMs < endAt) {
    const raw = (elapsedMs - startAt) / cfg.durationMs;
    const t = clamp01(raw);
    const eased = getEasing(cfg.easing)(t);
    return { pieceId, phase: 'entering', progress: eased, isNew: true };
  }
  if (elapsedMs < endAt + highlightMs) {
    const hlT = clamp01((elapsedMs - endAt) / highlightMs);
    return { pieceId, phase: 'highlight', progress: 1 - hlT, isNew: true };
  }
  return { pieceId, phase: 'done', progress: 1, isNew: true };
}

/* ----------------- 状态机 ----------------- */

/** 创建初始状态 */
export function createOrchestratorState(
  stepIndex: number,
  step: BuildStepV2 | undefined,
  reducedMotion: boolean = false,
): OrchestratorState {
  const stepTotalMs = step ? computeStepDuration(step) : 0;
  return {
    currentStep: stepIndex,
    playState: 'idle',
    elapsedInStepMs: 0,
    stepTotalMs,
    cameraTransitionProgress: 1,
    lockedView: false,
    reducedMotion,
    pieceStates: {},
  };
}

/** 推进时间（每帧调用） */
export function tick(
  state: OrchestratorState,
  dtMs: number,
  step: BuildStepV2 | undefined,
  totalSteps: number,
): OrchestratorState {
  // totalSteps 保留为 API 契约参数,用于未来"自动连续播放下一步"扩展;当前仅校验非负
  void totalSteps;
  if (state.playState !== 'playing' || !step) return state;

  const newElapsed = state.elapsedInStepMs + dtMs;
  const stepDone = newElapsed >= state.stepTotalMs;

  // 镜头过渡推进
  const cameraProgress = state.reducedMotion
    ? 1
    : clamp01(newElapsed / DEFAULT_CAMERA_TRANSITION_MS);

  // 计算每片零件状态
  const pieceStates: Record<string, PieceAnimationState> = {};
  // 累积可见的零件集合（之前步骤 + 本步骤）
  // 这里只关心本步骤新增的零件，旧零件直接 done
  for (const pid of step.addedPieceIds) {
    const idx = step.addedPieceIds.indexOf(pid);
    pieceStates[pid] = computePiecePhase(pid, true, newElapsed, step, idx, state.reducedMotion);
  }

  if (stepDone) {
    // 本步播放完成，进入 idle 等待用户操作
    return {
      ...state,
      playState: 'idle',
      elapsedInStepMs: state.stepTotalMs,
      cameraTransitionProgress: 1,
      pieceStates,
    };
  }

  return {
    ...state,
    elapsedInStepMs: newElapsed,
    cameraTransitionProgress: cameraProgress,
    pieceStates,
  };
}

/** 处理动作 */
export function reduce(
  state: OrchestratorState,
  action: OrchestratorAction,
  totalSteps: number,
  step: BuildStepV2 | undefined,
): OrchestratorState {
  switch (action.type) {
    case 'play':
      return { ...state, playState: 'playing' };
    case 'pause':
      return { ...state, playState: 'paused' };
    case 'replay-step':
      return {
        ...createOrchestratorState(state.currentStep, step, state.reducedMotion),
        playState: 'playing',
        lockedView: state.lockedView,
      };
    case 'next': {
      const next = Math.min(state.currentStep + 1, totalSteps - 1);
      return {
        ...createOrchestratorState(next, step, state.reducedMotion),
        playState: 'playing',
        lockedView: state.lockedView,
      };
    }
    case 'prev': {
      const prev = Math.max(state.currentStep - 1, 0);
      return {
        ...createOrchestratorState(prev, step, state.reducedMotion),
        playState: 'playing',
        lockedView: state.lockedView,
      };
    }
    case 'seek':
      return {
        ...createOrchestratorState(action.stepIndex, step, state.reducedMotion),
        playState: 'playing',
        lockedView: state.lockedView,
      };
    case 'lock-view':
      return { ...state, lockedView: action.locked };
    case 'set-reduced-motion':
      return { ...state, reducedMotion: action.reduced };
    default:
      return state;
  }
}

/** 获取某片零件在该时刻的入场变换偏移（位置和旋转偏移） */
export function getEntranceOffset(
  pieceId: string,
  state: OrchestratorState,
  step: BuildStepV2,
): { positionOffset: [number, number, number]; rotationOffset: [number, number, number]; opacity: number } {
  const ps = state.pieceStates[pieceId];
  if (!ps || ps.phase === 'done') {
    return { positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0], opacity: 1 };
  }
  if (ps.phase === 'pending') {
    // 还未开始入场，隐藏
    return { positionOffset: [0, 0, 0], rotationOffset: [0, 0, 0], opacity: 0 };
  }

  const cfg = resolveEntrance(pieceId, step, step.addedPieceIds.indexOf(pieceId));
  const t = ps.progress;
  const inv = 1 - t;

  // 起始偏移
  const so = cfg.startOffset ?? defaultStartOffset(cfg.type);
  const ro = cfg.startRotation ?? [0, 0, 0];

  const positionOffset: [number, number, number] = [
    so[0] * inv,
    so[1] * inv,
    so[2] * inv,
  ];
  const rotationOffset: [number, number, number] = [
    ro[0] * inv,
    ro[1] * inv,
    ro[2] * inv,
  ];

  // fade 类型：透明度随进度变化
  const opacity = cfg.type === 'fade' ? t : 1;

  return { positionOffset, rotationOffset, opacity };
}

/** 根据入场类型给出默认起始偏移 */
function defaultStartOffset(type: EntranceType): [number, number, number] {
  switch (type) {
    case 'drop': return [0, 8, 0];     // 从上方 8 单位下落
    case 'side': return [6, 0, 0];     // 从右侧 6 单位飞入
    case 'fold': return [0, 0, 0];     // 折叠用旋转，不用位移
    case 'fade': return [0, 0, 0];     // 原位淡入
    case 'none': return [0, 0, 0];
    default: return [0, 0, 0];
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
