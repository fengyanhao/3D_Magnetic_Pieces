/**
 * P0-6: 模型封面组件 — 使用真实3D模型数据生成封面，替代手绘SVG。
 *
 * 行为：
 * - 首次渲染时显示占位符（不阻塞页面）
 * - 后台懒加载 coverRenderer 生成 512x512 PNG
 * - 生成后缓存到 localStorage，后续访问直接显示
 * - 加载失败时保持占位符
 */
import type { Model } from '../data/types';
import { useModelCover } from '../hooks/useModelCover';

interface ModelCoverProps {
  model: Model;
  /** 图片容器的 className（与原 <img> 一致） */
  className?: string;
  /** 占位符背景渐变（可选） */
  placeholderClassName?: string;
}

export function ModelCover({ model, className, placeholderClassName }: ModelCoverProps) {
  const { coverUrl, loading } = useModelCover(model);

  if (coverUrl) {
    return (
      <img
        src={coverUrl}
        alt={model.name}
        className={className}
        loading="lazy"
      />
    );
  }

  // 占位符：加载中或加载失败时显示
  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 ${placeholderClassName ?? ''}`}
      aria-label={loading ? `${model.name} 封面生成中` : `${model.name} 封面未生成`}
      role="img"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-400">{model.name.charAt(0)}</span>
        </div>
        <p className="text-xs text-gray-400">{loading ? '封面生成中…' : '未生成封面'}</p>
      </div>
    </div>
  );
}
