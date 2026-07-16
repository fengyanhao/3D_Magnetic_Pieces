import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  createInitialHistory, replaceProject, createEmptyProject,
  undo, redo, canUndo, canRedo,
  addPieceAction, deletePieceAction, duplicatePieceAction, setPieceColorAction,
  setPieceTransformAction, createConnectionAction, removeConnectionAction,
  updateConnectionAction, addStepAction, deleteStepAction, moveStepAction,
  updateStepAction, addPieceToStepAction, saveCameraPresetAction, updateMetadataAction,
  EditorHistory,
} from '../../editor/state';
import { runValidation, EditorValidationResult } from '../../editor/validate';
import { serializeProject, parseProject, integrityCheck, projectToModel } from '../../editor/serialization';
import { modelToProject } from '../../editor/serialization';
import { EditorProject } from '../../editor/types';
import { models } from '../../data/models';
import { Model } from '../../data/types';
import { MagnetScene3D } from '../MagnetScene3D';
import { EditorToolbar } from './EditorToolbar';
import { PartLibrary } from './PartLibrary';
import { EditorCanvas } from './EditorCanvas';
import { PropertyPanel } from './PropertyPanel';
import { StepTimeline } from './StepTimeline';
import { useDraftStore } from './draftStore';

export type Selection =
  | { kind: 'piece'; id: string }
  | { kind: 'connection'; index: number }
  | { kind: 'step'; id: number }
  | { kind: 'none' };

const DRAFT_KEY = 'editor-draft-default';
const VALIDATION_DEBOUNCE_MS = 400;

export function EditorWorkspace() {
  const [history, setHistory] = useState<EditorHistory>(() => createInitialHistory());
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [validation, setValidation] = useState<EditorValidationResult | null>(null);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ pieceId: string; ts: number } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const project = history.current;
  const draft = useDraftStore();

  // 首次加载:尝试恢复草稿
  useEffect(() => {
    draft.load(DRAFT_KEY).then((p) => {
      if (p) {
        setHistory(replaceProject(history, p));
        setMessage({ text: '已恢复上次草稿', type: 'info' });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动保存草稿(防抖)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      draft.save(DRAFT_KEY, project);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project, draft]);

  // 校验(防抖)
  const validationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => {
      setValidation(runValidation(project));
    }, VALIDATION_DEBOUNCE_MS);
    return () => {
      if (validationTimer.current) clearTimeout(validationTimer.current);
    };
  }, [project]);

  /* ----------------- 操作包装器 ----------------- */
  const apply = useCallback((fn: (h: EditorHistory) => EditorHistory) => {
    setHistory((h) => fn(h));
  }, []);

  const handleAddPiece = useCallback((shape: any, color: any) => {
    const { history: h, pieceId } = addPieceAction(history, shape, color);
    setHistory(h);
    setSelection({ kind: 'piece', id: pieceId });
    setFocusRequest({ pieceId, ts: Date.now() });
  }, [history]);

  const handleDeleteSelected = useCallback(() => {
    if (selection.kind === 'piece') {
      apply((h) => deletePieceAction(h, selection.id));
      setSelection({ kind: 'none' });
    } else if (selection.kind === 'connection') {
      apply((h) => removeConnectionAction(h, selection.index));
      setSelection({ kind: 'none' });
    } else if (selection.kind === 'step') {
      apply((h) => deleteStepAction(h, selection.id));
      setSelection({ kind: 'none' });
      if (currentStepId === selection.id) setCurrentStepId(null);
    }
  }, [selection, apply, currentStepId]);

  const handleDuplicate = useCallback(() => {
    if (selection.kind !== 'piece') return;
    const { history: h, newId } = duplicatePieceAction(history, selection.id);
    setHistory(h);
    setSelection({ kind: 'piece', id: newId });
    setFocusRequest({ pieceId: newId, ts: Date.now() });
  }, [selection, history]);

  const handleSetPieceColor = useCallback((pieceId: string, color: any) => {
    apply((h) => setPieceColorAction(h, pieceId, color));
  }, [apply]);

  const handleSetPieceTransform = useCallback((pieceId: string, tf: { position: [number, number, number]; quaternion: [number, number, number, number] }) => {
    apply((h) => setPieceTransformAction(h, pieceId, tf));
  }, [apply]);

  const handleCreateConnection = useCallback((conn: any) => {
    apply((h) => createConnectionAction(h, conn));
  }, [apply]);

  const handleUpdateConnection = useCallback((index: number, patch: any) => {
    apply((h) => updateConnectionAction(h, index, patch));
  }, [apply]);

  const handleRemoveConnection = useCallback((index: number) => {
    apply((h) => removeConnectionAction(h, index));
  }, [apply]);

  const handleAddStep = useCallback(() => {
    const { history: h, stepId } = addStepAction(history);
    setHistory(h);
    setCurrentStepId(stepId);
    setSelection({ kind: 'step', id: stepId });
  }, [history]);

  const handleDeleteStep = useCallback((stepId: number) => {
    apply((h) => deleteStepAction(h, stepId));
    if (currentStepId === stepId) setCurrentStepId(null);
  }, [apply, currentStepId]);

  const handleMoveStep = useCallback((from: number, to: number) => {
    apply((h) => moveStepAction(h, from, to));
  }, [apply]);

  const handleUpdateStep = useCallback((stepId: number, patch: any) => {
    apply((h) => updateStepAction(h, stepId, patch));
  }, [apply]);

  const handleAddPieceToStep = useCallback((stepId: number, pieceId: string) => {
    apply((h) => addPieceToStepAction(h, stepId, pieceId));
  }, [apply]);

  const handleSaveCameraPreset = useCallback((preset: any) => {
    apply((h) => saveCameraPresetAction(h, preset).history);
    setMessage({ text: '已保存镜头预设', type: 'success' });
  }, [apply]);

  const handleUpdateMetadata = useCallback((patch: any) => {
    apply((h) => updateMetadataAction(h, patch));
  }, [apply]);

  /* ----------------- 工具栏操作 ----------------- */
  const handleNew = useCallback(() => {
    if (!confirm('新建方案会清空当前编辑内容(已自动保存为草稿)。继续?')) return;
    setHistory(replaceProject(history, createEmptyProject()));
    setSelection({ kind: 'none' });
    setCurrentStepId(null);
    setValidation(null);
  }, [history]);

  const handleUndo = useCallback(() => setHistory((h) => undo(h)), []);
  const handleRedo = useCallback(() => setHistory((h) => redo(h)), []);

  const handleImportExisting = useCallback((modelId: string) => {
    const m = models.find((mm) => mm.id === modelId);
    if (!m) {
      setMessage({ text: `找不到模型: ${modelId}`, type: 'error' });
      return;
    }
    const p = modelToProject(m);
    setHistory(replaceProject(history, p));
    setSelection({ kind: 'none' });
    setCurrentStepId(null);
    setMessage({ text: `已导入现有模型: ${m.name}`, type: 'success' });
  }, [history]);

  const handleExport = useCallback(() => {
    const integrity = integrityCheck(project);
    const errors = integrity.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      setMessage({ text: `数据完整性检查未通过(${errors.length} 个错误),已阻止导出。请查看右侧校验面板。`, type: 'error' });
      return;
    }
    if (validation && !validation.valid) {
      if (!confirm('方案未通过物理校验,仅可作为草稿导出。继续?')) return;
    }
    const json = serializeProject(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.metadata.name || 'magnet-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: '已导出 JSON', type: 'success' });
  }, [project, validation]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const result = parseProject(text);
      if (result.errors.length > 0 || !result.project) {
        setMessage({ text: '导入失败: ' + (result.errors[0] || '无法解析'), type: 'error' });
        return;
      }
      setHistory(replaceProject(history, result.project));
      setSelection({ kind: 'none' });
      setCurrentStepId(null);
      const warnings = result.warnings.length;
      setMessage({
        text: warnings > 0 ? `已导入方案(${warnings} 条迁移警告)` : '已导入方案',
        type: 'success',
      });
    } catch (e) {
      setMessage({ text: '导入失败: ' + (e as Error).message, type: 'error' });
    }
  }, [history]);

  const handleValidateNow = useCallback(() => {
    setValidation(runValidation(project));
    setMessage({ text: '已完成物理校验', type: 'info' });
  }, [project]);

  /* ----------------- 错误定位 ----------------- */
  const handleFocusError = useCallback((target: { pieceId?: string; connectionIndex?: number }) => {
    if (target.pieceId) {
      setSelection({ kind: 'piece', id: target.pieceId });
      setFocusRequest({ pieceId: target.pieceId, ts: Date.now() });
    } else if (target.connectionIndex !== undefined) {
      setSelection({ kind: 'connection', index: target.connectionIndex });
    }
  }, []);

  // 预览模式
  if (previewMode) {
    return (
      <PreviewMode
        project={project}
        onExit={() => setPreviewMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 overflow-hidden">
      <EditorToolbar
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onNew={handleNew}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onImportExisting={handleImportExisting}
        onImportFile={handleImportFile}
        onExport={handleExport}
        onValidate={handleValidateNow}
        onPreview={() => setPreviewMode(true)}
        validationValid={validation?.valid}
        existingModels={models.map((m) => ({ id: m.id, name: m.name }))}
      />

      {message && (
        <div
          className={`px-4 py-2 text-sm border-b ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200'
            : message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-4 text-xs underline">关闭</button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* 左:零件库 */}
        <aside className="w-64 border-r bg-white overflow-y-auto flex-shrink-0">
          <PartLibrary onAddPiece={handleAddPiece} project={project} />
        </aside>

        {/* 中:3D 画布 */}
        <main className="flex-1 min-w-0 relative">
          <EditorCanvas
            project={project}
            selection={selection}
            onSelectPiece={(id) => setSelection({ kind: 'piece', id })}
            onSelectConnection={(idx) => setSelection({ kind: 'connection', index: idx })}
            onClearSelection={() => setSelection({ kind: 'none' })}
            focusRequest={focusRequest}
            onMovePiece={handleSetPieceTransform}
            onCreateConnection={handleCreateConnection}
          />
        </main>

        {/* 右:属性 + 校验 */}
        <aside className="w-80 border-l bg-white overflow-y-auto flex-shrink-0">
          <PropertyPanel
            project={project}
            selection={selection}
            validation={validation}
            onSetPieceColor={handleSetPieceColor}
            onDuplicatePiece={handleDuplicate}
            onDeleteSelected={handleDeleteSelected}
            onUpdateConnection={handleUpdateConnection}
            onRemoveConnection={handleRemoveConnection}
            onUpdateMetadata={handleUpdateMetadata}
            onFocusError={handleFocusError}
            onSaveCameraPreset={handleSaveCameraPreset}
            currentStepId={currentStepId}
            onAddPieceToStep={handleAddPieceToStep}
            onUpdateStep={handleUpdateStep}
          />
        </aside>
      </div>

      {/* 下:步骤时间轴 */}
      <div className="h-40 border-t bg-white flex-shrink-0">
        <StepTimeline
          project={project}
          currentStepId={currentStepId}
          onSelectStep={(id) => { setCurrentStepId(id); setSelection({ kind: 'step', id }); }}
          onAddStep={handleAddStep}
          onDeleteStep={handleDeleteStep}
          onMoveStep={handleMoveStep}
        />
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-gray-400 z-10">
        <Link to="/" className="underline">← 返回首页</Link>
      </div>
    </div>
  );
}

/* ----------------- 预览模式(复用 MagnetScene3D,把 EditorProject 转回 Model) ----------------- */
function PreviewMode({ project, onExit }: { project: EditorProject; onExit: () => void }) {
  const model = useMemo(() => projectToModel(project) as Model, [project]);
  const [stepIdx, setStepIdx] = useState(-1);

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-semibold">用户端预览 - {project.metadata.name}</span>
        <div className="flex gap-2">
          <button onClick={() => setStepIdx(Math.max(-1, stepIdx - 1))} className="px-3 py-1 bg-gray-100 rounded">上一步</button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {stepIdx < 0 ? '完成预览' : `${stepIdx + 1} / ${model.steps.length}`}
          </span>
          <button onClick={() => setStepIdx(Math.min(model.steps.length - 1, stepIdx + 1))} className="px-3 py-1 bg-gray-100 rounded">下一步</button>
          <button onClick={onExit} className="px-3 py-1 bg-blue-500 text-white rounded">退出预览</button>
        </div>
      </div>
      <div className="flex-1">
        <MagnetScene3D model={model} stepIndex={stepIdx} highlightNew interactive />
      </div>
      {stepIdx >= 0 && model.steps[stepIdx] && (
        <div className="p-4 border-t bg-gray-50">
          <h3 className="font-semibold">{model.steps[stepIdx].title}</h3>
          <p className="text-sm text-gray-600 mt-1">{model.steps[stepIdx].description}</p>
        </div>
      )}
    </div>
  );
}
