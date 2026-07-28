import { useRef } from 'react';
import type { ToolMode } from './EditorCanvas';

interface ExistingModel {
  id: string;
  name: string;
}

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  validationValid?: boolean;
  existingModels: ExistingModel[];
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onImportExisting: (modelId: string) => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onValidate: () => void;
  onPreview: () => void;
  onFitAll: () => void;
  onShowDrafts: () => void;
  onSaveAs: () => void;
  autoSaved: boolean;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  /** P2: 生成真实 3D 渲染封面 */
  onGenerateCover: () => void;
  /** P2: 是否正在生成封面(禁用按钮) */
  generatingCover?: boolean;
  /** P2: 是否已有封面 */
  hasCover?: boolean;
}

const TOOL_MODES: { mode: ToolMode; label: string; title: string }[] = [
  { mode: 'select', label: '选择', title: '选择模式 (默认)' },
  { mode: 'move', label: '移动', title: '移动模式:三轴 Gizmo 平移' },
  { mode: 'rotate', label: '旋转', title: '旋转模式:三轴 Gizmo 旋转' },
  { mode: 'snap', label: '磁吸', title: '磁吸模式:拖动靠近兼容端口自动吸附' },
];

/** 顶部工具栏。 */
export function EditorToolbar({
  canUndo, canRedo, validationValid, existingModels,
  onNew, onUndo, onRedo, onImportExisting, onImportFile, onExport, onValidate, onPreview,
  onFitAll, onShowDrafts, onSaveAs, autoSaved, toolMode, onToolModeChange,
  onGenerateCover, generatingCover, hasCover,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b bg-white flex-shrink-0">
      <span className="font-bold text-gray-800 mr-2">磁力片方案编辑器</span>

      <ToolButton onClick={onNew} title="新建方案">新建</ToolButton>
      <ToolButton onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">撤销</ToolButton>
      <ToolButton onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Y)">重做</ToolButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* 工具模式切换(P0-2):选择/移动/旋转/磁吸 */}
      <div className="flex items-center gap-0.5" role="group" aria-label="工具模式">
        {TOOL_MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => onToolModeChange(m.mode)}
            title={m.title}
            aria-pressed={toolMode === m.mode}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              toolMode === m.mode
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <ToolButton onClick={onFitAll} title="全部入镜 (fit)">入镜</ToolButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      {/* P0-5: 草稿管理 */}
      <ToolButton onClick={onShowDrafts} title="查看最近草稿列表">草稿</ToolButton>
      <ToolButton onClick={onSaveAs} title="另存为新草稿">另存为</ToolButton>
      {autoSaved && (
        <span className="text-xs text-green-600 px-1" role="status" aria-live="polite">
          草稿已自动保存
        </span>
      )}

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <select
        className="text-xs px-2 py-1 border rounded"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            onImportExisting(e.target.value);
            e.target.value = '';
          }
        }}
        title="导入现有立体模型"
      >
        <option value="" disabled>导入现有模型…</option>
        {existingModels.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <ToolButton onClick={() => fileInput.current?.click()} title="从 JSON 文件导入">导入</ToolButton>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.target.value = '';
        }}
      />

      <ToolButton onClick={onExport} title="导出为 JSON">导出</ToolButton>

      {/* P2: 生成真实 3D 渲染封面 */}
      <ToolButton
        onClick={onGenerateCover}
        disabled={generatingCover}
        title={hasCover ? '重新生成 3D 渲染封面(替换现有封面)' : '生成 3D 渲染封面(用于方案库/首页展示)'}
      >
        {generatingCover ? '生成中…' : hasCover ? '重生成封面' : '生成封面'}
      </ToolButton>

      <div className="w-px h-5 bg-gray-300 mx-1" />

      <ToolButton onClick={onValidate} title="立即执行完整校验">校验</ToolButton>
      {validationValid !== undefined && (
        <span className={`text-xs px-2 py-1 rounded ${validationValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {validationValid ? '通过' : '未通过'}
        </span>
      )}

      <ToolButton onClick={onPreview} title="用户端预览" primary>预览</ToolButton>
    </header>
  );
}

function ToolButton({
  children, onClick, disabled, title, primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-2 py-1 text-xs rounded border transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200'
        : primary ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
