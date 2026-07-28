/**
 * P1: 教学编排 React Hook
 *
 * 把 orchestrator.ts 的纯状态机包装为可用的 React Hook，
 * 通过 requestAnimationFrame 驱动每帧 tick。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { BuildStepV2 } from '../../engine/types';
import {
  OrchestratorState,
  OrchestratorAction,
  createOrchestratorState,
  tick,
  reduce,
} from './orchestrator';

export interface UseOrchestratorOptions {
  /** 初始步骤索引 */
  initialStep?: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 是否启用 reduced-motion（默认自动检测 prefers-reduced-motion） */
  reducedMotion?: boolean;
  /** 自动播放下一步的延迟（毫秒，0 = 不自动播放） */
  autoNextMs?: number;
}

export interface UseOrchestratorResult {
  state: OrchestratorState;
  /** 当前步骤数据（由调用方提供） */
  setStep: (step: BuildStepV2 | undefined) => void;
  /** 派发动作 */
  dispatch: (action: OrchestratorAction) => void;
  /** 跳转到指定步骤 */
  seek: (stepIndex: number) => void;
  /** 便捷方法 */
  play: () => void;
  pause: () => void;
  replayStep: () => void;
  next: () => void;
  prev: () => void;
  toggleLockView: () => void;
}

export function useTutorialOrchestrator(
  steps: BuildStepV2[],
  options: UseOrchestratorOptions,
): UseOrchestratorResult {
  const { initialStep = 0, totalSteps, autoNextMs = 0 } = options;

  // 自动检测 prefers-reduced-motion
  const prefersReducedMotion = useRef(false);
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion.current;

  const [stepRef, setStepRef] = useState<BuildStepV2 | undefined>(undefined);
  const [state, setState] = useState<OrchestratorState>(() =>
    createOrchestratorState(initialStep, steps[initialStep], reducedMotion),
  );

  // 同步 step 数据到 ref
  const setStep = useCallback((step: BuildStepV2 | undefined) => {
    setStepRef(step);
  }, []);

  // 当 steps 或 initialStep 变化时重置
  useEffect(() => {
    setState(createOrchestratorState(initialStep, steps[initialStep], reducedMotion));
    setStepRef(steps[initialStep]);
  }, [steps, initialStep, reducedMotion]);

  // RAF 循环
  const lastTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (state.playState !== 'playing') {
      lastTimeRef.current = null;
      return;
    }
    let rafId = 0;
    const loop = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setState((s) => tick(s, dt, stepRef, totalSteps));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [state.playState, stepRef, totalSteps]);

  // 自动播放下一步（仅当 autoNextMs > 0 且当前步骤完成）
  useEffect(() => {
    if (autoNextMs <= 0) return;
    if (state.playState !== 'idle') return;
    if (state.elapsedInStepMs < state.stepTotalMs) return;
    if (state.currentStep >= totalSteps - 1) return;
    const timer = setTimeout(() => {
      setState((s) =>
        reduce(s, { type: 'next' }, totalSteps, stepRef),
      );
    }, autoNextMs);
    return () => clearTimeout(timer);
  }, [state.playState, state.elapsedInStepMs, state.stepTotalMs, state.currentStep, autoNextMs, totalSteps, stepRef]);

  const dispatch = useCallback((action: OrchestratorAction) => {
    setState((s) => reduce(s, action, totalSteps, stepRef));
  }, [totalSteps, stepRef]);

  const seek = useCallback((stepIndex: number) => {
    setState((s) => reduce(s, { type: 'seek', stepIndex }, totalSteps, stepRef));
  }, [totalSteps, stepRef]);

  const play = useCallback(() => dispatch({ type: 'play' }), [dispatch]);
  const pause = useCallback(() => dispatch({ type: 'pause' }), [dispatch]);
  const replayStep = useCallback(() => dispatch({ type: 'replay-step' }), [dispatch]);
  const next = useCallback(() => dispatch({ type: 'next' }), [dispatch]);
  const prev = useCallback(() => dispatch({ type: 'prev' }), [dispatch]);
  const toggleLockView = useCallback(() => {
    setState((s) => reduce(s, { type: 'lock-view', locked: !s.lockedView }, totalSteps, stepRef));
  }, [totalSteps, stepRef]);

  // 当 currentStep 变化时，更新 stepRef
  useEffect(() => {
    if (steps[state.currentStep] !== stepRef) {
      setStepRef(steps[state.currentStep]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStep, steps]);

  return {
    state,
    setStep,
    dispatch,
    seek,
    play,
    pause,
    replayStep,
    next,
    prev,
    toggleLockView,
  };
}
