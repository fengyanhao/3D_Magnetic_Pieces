import { useRef } from 'react';

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
}

/** 顶部工具栏。 */
export function EditorToolbar({
  canUndo, canRedo, validationValid, existingModels,
  onNew, onUndo, onRedo, onImportExisting, onImportFile, onExport, onValidate, onPreview,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <header className="flex items-center gap-2 px-3 py-2 border-b bg-white flex-shrink-0">
      <span className="font-bold text-gray-800 mr-2">磁力片方案编辑器</span>

      <ToolButton onClick={onNew} title="新建方案">新建</ToolButton>
      <ToolButton onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)">撤销</ToolButton>
      <ToolButton onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Y)">重做</ToolButton>

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
