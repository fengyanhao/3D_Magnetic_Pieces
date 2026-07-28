/**
 * P1: 视口尺寸监听 Hook
 *
 * 用于编辑器判断屏幕宽度是否满足桌面端最低要求(≥1024px)。
 * 监听 window resize 事件,返回当前视口宽高。
 */
import { useState, useEffect } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
}

const SSR_DEFAULT: ViewportSize = { width: 1280, height: 720 };

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') return SSR_DEFAULT;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * 监听视口尺寸变化。默认节流到 100ms,避免高频 resize 触发重渲染。
 */
export function useViewportSize(throttleMs: number = 100): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(getViewportSize);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastUpdate = 0;
    let frame = 0;
    const onResize = () => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          lastUpdate = Date.now();
          setSize(getViewportSize());
        });
        return;
      }
      lastUpdate = now;
      setSize(getViewportSize());
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [throttleMs]);

  return size;
}

/** 编辑器桌面端最低宽度(px),小于此值显示小屏提示。 */
export const EDITOR_MIN_DESKTOP_WIDTH = 1024;

/** 是否满足编辑器桌面端宽度要求。 */
export function useEditorDesktopEligible(): boolean {
  const { width } = useViewportSize();
  return width >= EDITOR_MIN_DESKTOP_WIDTH;
}
