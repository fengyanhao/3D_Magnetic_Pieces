/**
 * P1: 编辑器小屏提示页
 *
 * 当视口宽度 < 1024px 时显示,告知用户编辑器是电脑端专业工具。
 * 提供"返回首页"入口,避免在小屏上挤压工作台造成糟糕体验。
 *
 * 移动端用户仍可正常浏览用户端教学(/tutorial/:id)。
 */
import { Link } from 'react-router-dom';
import { Monitor, Smartphone, Home, ArrowLeft } from 'lucide-react';

interface EditorSmallScreenProps {
  /** 当前视口宽度,用于在提示中展示 */
  currentWidth?: number;
}

export function EditorSmallScreen({ currentWidth }: EditorSmallScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-6 py-12"
      data-testid="editor-small-screen"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <Monitor className="w-10 h-10 text-blue-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-3">
          请使用电脑编辑
        </h1>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          编辑器是面向电脑端的专业工具,需要更宽的屏幕来同时展示零件库、3D 画布、属性面板和步骤时间轴。
          手机端可预览教学,但不适合编辑。
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">当前屏幕宽度</span>
            <span className="font-mono text-gray-800">
              {currentWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 0)}px
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">最低要求</span>
            <span className="font-mono text-gray-800">1024px</span>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((currentWidth ?? 0) / 1024) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full bg-primary-500 text-white py-3 rounded-xl font-medium transition-colors hover:bg-primary-600"
          >
            <Home className="w-5 h-5" />
            返回首页
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium transition-colors hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            返回上一页
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Smartphone className="w-4 h-4" />
            <span>手机端可预览教学,但编辑请在电脑端进行</span>
          </div>
        </div>
      </div>
    </div>
  );
}
