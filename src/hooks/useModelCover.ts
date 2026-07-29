/**
 * P0-6: 真实3D封面 hook — 运行时懒加载 coverRenderer 生成封面并缓存到 localStorage。
 *
 * 设计要点：
 * - 不在首页同步加载 Three.js：coverRenderer 通过动态 import 懒加载
 * - 生成结果缓存到 localStorage（key: magnet-cover:<modelId>），后续访问不再加载 Three.js
 * - localStorage 满或不可用时降级为每次运行时生成（不缓存）
 * - 生成失败时返回空字符串，由调用方显示占位符
 * - 支持并发请求合并：同一 modelId 的并发请求共享同一个 Promise
 */
import { useState, useEffect } from 'react';
import type { Model } from '../data/types';

const COVER_CACHE_PREFIX = 'magnet-cover:';
// 7个模型 * ~300KB ≈ 2MB，localStorage 上限通常 5MB
const COVER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30天

// 全局 Promise 缓存：防止同一 modelId 并发触发多次渲染
const inflightPromises = new Map<string, Promise<string>>();

function readCache(modelId: string): string | null {
  try {
    const raw = localStorage.getItem(COVER_CACHE_PREFIX + modelId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dataUrl: string; ts: number };
    if (Date.now() - parsed.ts > COVER_CACHE_TTL_MS) {
      localStorage.removeItem(COVER_CACHE_PREFIX + modelId);
      return null;
    }
    return parsed.dataUrl;
  } catch {
    return null;
  }
}

function writeCache(modelId: string, dataUrl: string): void {
  try {
    localStorage.setItem(COVER_CACHE_PREFIX + modelId, JSON.stringify({ dataUrl, ts: Date.now() }));
  } catch {
    // localStorage 满或不可用，静默降级（不缓存）
  }
}

async function generateCover(model: Model): Promise<string> {
  // 动态 import：只在首次生成封面时加载 Three.js + coverRenderer
  const [{ renderProjectCover }, { modelToProject }] = await Promise.all([
    import('../components/magnet3d/coverRenderer'),
    import('../editor/serialization'),
  ]);
  const project = modelToProject(model);
  const dataUrl = renderProjectCover(project, {
    width: 512,
    height: 512,
    background: '#f0f9ff',
  });
  if (dataUrl) {
    writeCache(model.id, dataUrl);
  }
  return dataUrl || '';
}

export function useModelCover(model: Model): { coverUrl: string; loading: boolean } {
  const [coverUrl, setCoverUrl] = useState<string>(() => {
    // 初始化：优先用缓存
    if (typeof window === 'undefined') return '';
    return readCache(model.id) ?? '';
  });
  const [loading, setLoading] = useState<boolean>(!coverUrl);

  useEffect(() => {
    if (coverUrl) return; // 已有缓存，不再生成

    let cancelled = false;

    // 复用进行中的 Promise（防止并发）
    let p = inflightPromises.get(model.id);
    if (!p) {
      p = generateCover(model).finally(() => {
        inflightPromises.delete(model.id);
      });
      inflightPromises.set(model.id, p);
    }

    setLoading(true);
    p.then((url) => {
      if (cancelled) return;
      setCoverUrl(url);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setCoverUrl('');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id]);

  return { coverUrl, loading };
}
