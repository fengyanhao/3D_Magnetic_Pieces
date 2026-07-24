import { lazy, Suspense } from 'react';

// 编辑器使用旧版完整工作区（恢复 undo/redo、草稿、校验、吸附等全部功能）
const EditorWorkspace = lazy(() => import('../components/editor/EditorWorkspace').then(m => ({ default: m.EditorWorkspace })));

export function EditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen text-gray-500">
        正在加载编辑器…
      </div>
    }>
      <EditorWorkspace />
    </Suspense>
  );
}

export default EditorPage;
