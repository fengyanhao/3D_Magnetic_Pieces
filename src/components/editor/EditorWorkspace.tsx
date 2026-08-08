import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import {
  createInitialHistory, replaceProject, createEmptyProject,
  undo, redo, canUndo, canRedo,
  addPieceAction, deletePieceAction, duplicatePieceAction, setPieceColorAction,
  setPieceTransformAction, createConnectionAction, removeConnectionAction,
  updateConnectionAction, addStepAction, deleteStepAction, moveStepAction,
  updateStepAction, addPieceToStepAction, addConnectionToStepAction,
  removeConnectionFromStepAction, saveCameraPresetAction, updateMetadataAction,
  // P1: 教学编排 actions
  setStepCameraAction, captureCurrentViewAsStepCameraAction,
  setPieceEntranceAction, batchSetEntranceTypeAction, patchPieceEntranceAction,
  setStepHintAction, setStepFocusPointsAction, setPieceAnnotationAction,
  removePieceFromStepAction,
  // P2: 封面生成 action
  setThumbnailDataUrlAction,
  EditorHistory, updateCurrent, MAX_HISTORY,
} from '../../editor/state';
import { runValidation, EditorValidationResult } from '../../editor/validate';
import { parseProject, integrityCheck, projectToModel } from '../../editor/serialization';
import { modelToProject } from '../../editor/serialization';
import { resnapshotTransforms } from '../../editor/serialization';
import {
  serializeProjectAsScheme,
  parseScheme,
  schemeToEditorProject,
} from '../../engine/scheme';
import { EditorProject, SerializableTransform } from '../../editor/types';
import { findConnectionToParent, computeDihedralFromMovedTransform } from '../../editor/snap';
import {
  PieceTransform, StepCamera, PieceEntranceConfig, EntranceType, Connection,
} from '../../engine/types';
import { models } from '../../data/models';
import { Model } from '../../data/types';
import { TutorialPlayer } from '../tutorial/TutorialPlayer';
import { EditorToolbar } from './EditorToolbar';
import { PartLibrary } from './PartLibrary';
import { EditorCanvas, type ToolMode } from './EditorCanvas';
import { PropertyPanel } from './PropertyPanel';
import { StepTimeline } from './StepTimeline';
import { DraftManagerModal } from './DraftManagerModal';
import { TutorialOrchestrationPanel } from './TutorialOrchestrationPanel';
import { EditorSmallScreen } from './EditorSmallScreen';
import { useViewportSize, EDITOR_MIN_DESKTOP_WIDTH } from '../../hooks/useViewportSize';
import { useDraftStore } from './draftStore';
import { renderProjectCover } from '../magnet3d/coverRenderer';
import { Video, Box, Play } from 'lucide-react';

export type Selection =
  | { kind: 'piece'; id: string }
  | { kind: 'connection'; index: number }
  | { kind: 'step'; id: number }
  | { kind: 'none' };

/** P1: 编辑器工作模式 */
export type EditorMode = 'structure' | 'tutorial';

// P0-5: 移除 VALIDATION_DEBOUNCE_MS — 校验改为用户主动触发，不再需要防抖常量

export function EditorWorkspace() {
  const [history, setHistory] = useState<EditorHistory>(() => createInitialHistory());
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [validation, setValidation] = useState<EditorValidationResult | null>(null);
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ pieceId: string; ts: number } | null>(null);
  const [fitRequest, setFitRequest] = useState<{ ts: number } | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  // P1: 双模式切换 + 全屏预览
  const [mode, setMode] = useState<EditorMode>('structure');
  const [previewMode, setPreviewMode] = useState(false);
  // P1: 教学编排 - 录制模式(新增零件/连接自动归入当前步骤)
  const [recordingStepId, setRecordingStepId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  // P0-5: 草稿管理面板 + 自动保存指示
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0); // 触发草稿列表刷新
  const [autoSaved, setAutoSaved] = useState(false);
  // P0-3: 拖拽期间的轻量级实时变换覆盖,只更新当前拖动 piece 的 transform,
  // 避免每次 setHistory 都触发 solver 重算 / 校验重排 / 自动保存重排。
  // commit 时清空,落回 history.transforms。
  const [liveTransformOverride, setLiveTransformOverride] = useState<{ pieceId: string; tf: SerializableTransform } | null>(null);
  // P1-五: 已连接零件被移动时弹出三选项弹窗(替代原生 confirm)
  const [pendingConnectedMove, setPendingConnectedMove] = useState<{
    pieceId: string;
    tf: SerializableTransform;
    parentConn: { index: number; connection: Connection; isPieceA: boolean };
  } | null>(null);
  // P1-七: 停止录制确认弹窗
  const [showStopRecordingConfirm, setShowStopRecordingConfirm] = useState(false);

  const project = history.current;
  const draft = useDraftStore();
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  // P1: 获取 EditorCanvas 当前相机视图(用于"设为本步镜头")
  const getCurrentViewRef = useRef<(() => { position: [number, number, number]; target: [number, number, number]; zoom: number } | null) | null>(null);
  // P1: 小屏检测
  const viewport = useViewportSize();
  const isDesktop = viewport.width >= EDITOR_MIN_DESKTOP_WIDTH;

  // P0-5: 草稿恢复确认 — 不自动加载，检测到草稿时提示用户选择
  const [pendingDraft, setPendingDraft] = useState<{ key: string; name: string } | null>(null);
  useEffect(() => {
    const drafts = draft.list();
    if (drafts.length > 0) {
      // 只提示，不自动加载
      setPendingDraft({ key: drafts[0].key, name: drafts[0].name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestoreDraft = useCallback(async () => {
    if (!pendingDraft) return;
    const proj = await draft.load(pendingDraft.key);
    if (proj) {
      setHistory(replaceProject(history, proj));
      setFitRequest({ ts: Date.now() });
      setMessage({ text: `已恢复草稿: ${proj.metadata.name}`, type: 'info' });
    }
    setPendingDraft(null);
  }, [pendingDraft, draft, history]);

  const handleDiscardDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  // P0-5: 校验状态 — 初始为 null（尚未校验），仅在用户点击校验时运行
  // handleValidateNow 已在下方定义，此处不再重复

  // 自动保存草稿(防抖,键为 project.id)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      draft.save(project.id, project);
      // P0-5: 显示准确的自动保存提示
      setAutoSaved(true);
      setDraftVersion((v) => v + 1);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [project, draft]);

  // P0-5: 校验不再在 mount/project 变化时自动运行，改为用户主动点击
  /* ----------------- 操作包装器 ----------------- */
  const apply = useCallback((fn: (h: EditorHistory) => EditorHistory) => {
    setHistory((h) => fn(h));
  }, []);

  // 更新 current 但不入栈(用于拖拽期间的实时视觉更新)
  // P0-3: 改为只更新轻量 liveTransformOverride,避免每帧 setHistory 触发 solver 重算
  const updatePieceTransformLive = useCallback((pieceId: string, tf: SerializableTransform) => {
    setLiveTransformOverride({ pieceId, tf });
  }, []);

  const handleAddPiece = useCallback((shape: any, color: any) => {
    // P0-四: 新零件放到视野中心构建平面,按已有零件数量在右方向错开,避免全部重叠
    const target = cameraTargetRef.current;
    const offsetIndex = project.pieces.length; // 第 N 个零件偏移 N 个单位
    const placePos: [number, number, number] = [
      target.x + offsetIndex * 1.2,
      target.y,
      target.z,
    ];
    const { history: h, pieceId } = addPieceAction(history, shape, color, placePos);
    // P1: 录制模式下,新零件自动归入当前录制步骤
    let finalHistory = h;
    if (recordingStepId !== null) {
      finalHistory = addPieceToStepAction(h, recordingStepId, pieceId);
      setMessage({ text: `已添加零件并自动加入步骤 #${recordingStepId}(录制中)`, type: 'success' });
    }
    setHistory(finalHistory);
    // P0-四.3: 新零件添加后自动选中并完整可见
    setSelection({ kind: 'piece', id: pieceId });
    setFocusRequest({ pieceId, ts: Date.now() });
  }, [history, recordingStepId, project.pieces.length]);

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

  const handleSetPieceTransform = useCallback((pieceId: string, tf: SerializableTransform) => {
    // P0-3: commit 时清空 live override,让 EditorCanvas 重新用 history.transforms
    setLiveTransformOverride(null);
    // P1-五: 移动已连接子零件时弹出三选项弹窗(替代原生 confirm)
    // 取消 = 完全不改变项目
    const parentConn = findConnectionToParent(pieceId, project);
    if (parentConn) {
      setPendingConnectedMove({ pieceId, tf, parentConn });
      return;
    }
    apply((h) => setPieceTransformAction(h, pieceId, tf));
  }, [apply, project]);

  // P1-五: 三选项弹窗 - 保持连接并调整角度
  const handleConnectedMoveKeep = useCallback(() => {
    const pending = pendingConnectedMove;
    if (!pending) return;
    const { pieceId, tf } = pending;
    const newTf: PieceTransform = {
      position: new THREE.Vector3(tf.position[0], tf.position[1], tf.position[2]),
      quaternion: new THREE.Quaternion(tf.quaternion[0], tf.quaternion[1], tf.quaternion[2], tf.quaternion[3]),
    };
    const result = computeDihedralFromMovedTransform(pieceId, newTf, project);
    if (result) {
      apply((h) => updateConnectionAction(h, result.index, { dihedralDeg: result.dihedralDeg }));
      setMessage({ text: `已调整连接角度为 ${result.dihedralDeg.toFixed(1)}°`, type: 'success' });
    } else {
      apply((h) => setPieceTransformAction(h, pieceId, tf));
    }
    setPendingConnectedMove(null);
  }, [pendingConnectedMove, project, apply]);

  // P1-五: 三选项弹窗 - 断开连接后移动
  const handleConnectedMoveDisconnect = useCallback(() => {
    const pending = pendingConnectedMove;
    if (!pending) return;
    const { pieceId, tf, parentConn } = pending;
    // P1-七: 录制中断开连接也同步移出当前步骤
    if (recordingStepId !== null) {
      apply((h) => removeConnectionFromStepAction(h, recordingStepId, parentConn.connection));
    }
    apply((h) => removeConnectionAction(h, parentConn.index));
    apply((h) => setPieceTransformAction(h, pieceId, tf));
    setMessage({ text: '已断开连接并移动零件', type: 'info' });
    setPendingConnectedMove(null);
  }, [pendingConnectedMove, recordingStepId, apply]);

  // P1-五: 三选项弹窗 - 取消(完全不改变项目)
  const handleConnectedMoveCancel = useCallback(() => {
    setPendingConnectedMove(null);
    setMessage({ text: '已取消移动', type: 'info' });
  }, []);

  const handleCreateConnection = useCallback((conn: any) => {
    apply((h) => createConnectionAction(h, conn));
    // P1-七: 录制模式下,新连接通过原子 action 自动归入当前录制步骤
    const targetStepId = recordingStepId ?? currentStepId;
    if (targetStepId !== null) {
      apply((h) => addConnectionToStepAction(h, targetStepId, conn));
      setMessage({ text: '已创建连接并加入当前步骤', type: 'success' });
    }
  }, [apply, currentStepId, recordingStepId]);

  const handleUpdateConnection = useCallback((index: number, patch: any) => {
    apply((h) => updateConnectionAction(h, index, patch));
  }, [apply]);

  // 滑块拖动预览：实时更新3D但不入栈，释放时一次性提交历史
  const previewOriginalRef = useRef<EditorProject | null>(null);
  const handlePreviewConnection = useCallback((index: number, patch: { dihedralDeg?: number; flip?: boolean }) => {
    setHistory((h) => {
      // 首次预览时保存原始快照引用（updateCurrent 返回新对象，不会修改旧引用）
      if (previewOriginalRef.current === null) {
        previewOriginalRef.current = h.current;
      }
      return updateCurrent(h, (p) => {
        const c = p.connections[index];
        if (!c) return p;
        if (patch.dihedralDeg !== undefined) c.dihedralDeg = patch.dihedralDeg;
        if (patch.flip !== undefined) c.flip = patch.flip;
        p.transforms = resnapshotTransforms(p);
        return p;
      });
    });
  }, []);

  const handleEndPreviewConnection = useCallback(() => {
    setHistory((h) => {
      const original = previewOriginalRef.current;
      previewOriginalRef.current = null;
      if (original && original !== h.current) {
        // 用原始快照作为历史记录，一次拖动只产生一条 undo
        return {
          past: [...h.past, original].slice(-MAX_HISTORY),
          current: h.current,
          future: [],
        };
      }
      return h;
    });
  }, []);

  const handleRemoveConnection = useCallback((index: number) => {
    // P1-七: 录制中断开连接,同步从当前步骤移除
    const conn = project.connections[index];
    if (recordingStepId !== null && conn) {
      apply((h) => removeConnectionFromStepAction(h, recordingStepId, conn));
    }
    apply((h) => removeConnectionAction(h, index));
  }, [apply, project.connections, recordingStepId]);

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

  /* ----------------- P1: 教学编排回调 ----------------- */

  const handleSetStepCamera = useCallback((stepId: number, camera: StepCamera | null) => {
    apply((h) => setStepCameraAction(h, stepId, camera));
    setMessage({ text: camera ? '已设置本步镜头' : '已清除本步镜头', type: 'success' });
  }, [apply]);

  const handleCaptureCurrentViewAsStepCamera = useCallback((stepId: number, transitionMs: number) => {
    const view = getCurrentViewRef.current?.();
    if (!view) {
      setMessage({ text: '无法获取当前视角,请先在 3D 画布中操作', type: 'error' });
      return;
    }
    apply((h) => captureCurrentViewAsStepCameraAction(h, stepId, view, transitionMs));
    setMessage({ text: '已将当前视角保存为本步镜头', type: 'success' });
  }, [apply]);

  const handlePatchPieceEntrance = useCallback((stepId: number, pieceId: string, patch: Partial<PieceEntranceConfig>) => {
    apply((h) => patchPieceEntranceAction(h, stepId, pieceId, patch));
  }, [apply]);

  const handleBatchSetEntranceType = useCallback((stepId: number, pieceIds: string[], type: EntranceType) => {
    apply((h) => batchSetEntranceTypeAction(h, stepId, pieceIds, type));
    setMessage({ text: `已批量设置 ${pieceIds.length} 片零件入场类型`, type: 'success' });
  }, [apply]);

  const handleClearPieceEntrance = useCallback((stepId: number, pieceId: string) => {
    apply((h) => setPieceEntranceAction(h, stepId, pieceId, null));
  }, [apply]);

  const handleSetStepHint = useCallback((stepId: number, hint: string) => {
    apply((h) => setStepHintAction(h, stepId, hint));
  }, [apply]);

  const handleSetStepFocusPoints = useCallback((stepId: number, points: string[]) => {
    apply((h) => setStepFocusPointsAction(h, stepId, points));
  }, [apply]);

  const handleSetStepHighlightMs = useCallback((stepId: number, ms: number) => {
    apply((h) => updateStepAction(h, stepId, { highlightMs: ms }));
  }, [apply]);

  const handleSetStepSnapFeedback = useCallback((stepId: number, feedback: 'none' | 'pulse' | 'glow') => {
    apply((h) => updateStepAction(h, stepId, { snapFeedback: feedback }));
  }, [apply]);

  const handleSetPieceAnnotation = useCallback((stepId: number, pieceId: string, text: string) => {
    apply((h) => setPieceAnnotationAction(h, stepId, pieceId, text));
  }, [apply]);

  const handleRemovePieceFromStep = useCallback((stepId: number, pieceId: string) => {
    apply((h) => removePieceFromStepAction(h, stepId, pieceId));
    setMessage({ text: '已将零件移出本步', type: 'info' });
  }, [apply]);

  // P1-七: 录制模式开关 - 开始录制直接生效;停止录制需显式确认
  const handleToggleRecording = useCallback((stepId: number) => {
    if (recordingStepId === stepId) {
      // 正在录制该步骤,点击即请求停止(弹出确认)
      setShowStopRecordingConfirm(true);
      return;
    }
    // 开始录制(或切换到录制另一个步骤)
    setRecordingStepId(stepId);
    setMessage({ text: `已开始录制到步骤 #${stepId},新零件和连接将自动加入`, type: 'success' });
  }, [recordingStepId]);

  // P1-七: 确认停止录制
  const handleConfirmStopRecording = useCallback(() => {
    const stoppedStep = recordingStepId;
    setRecordingStepId(null);
    setShowStopRecordingConfirm(false);
    if (stoppedStep !== null) {
      setMessage({ text: `已停止录制步骤 #${stoppedStep}`, type: 'info' });
    }
  }, [recordingStepId]);

  // P1-七: 取消停止录制(继续录制)
  const handleCancelStopRecording = useCallback(() => {
    setShowStopRecordingConfirm(false);
  }, []);

  // P1-七: 切换模式时不再静默停止录制,保持录制状态跨结构/教学模式
  const handleModeChange = useCallback((newMode: EditorMode) => {
    setMode(newMode);
  }, []);

  // P1: 当前编辑器视图(供 TutorialOrchestrationPanel 显示)
  const currentView = useMemo(() => {
    return getCurrentViewRef.current?.() ?? null;
  }, [project, mode]); // 依赖 project/mode 触发重新计算

  const handleUpdateMetadata = useCallback((patch: any) => {
    apply((h) => updateMetadataAction(h, patch));
  }, [apply]);

  /* ----------------- P0-5: 草稿管理 ----------------- */
  // 打开草稿(先保存当前,再加载目标)
  const handleOpenDraft = useCallback(async (key: string) => {
    await draft.save(project.id, project);
    const loaded = draft.load(key);
    Promise.resolve(loaded).then((p) => {
      if (p) {
        setHistory(replaceProject(history, p));
        setSelection({ kind: 'none' });
        setCurrentStepId(null);
        setFitRequest({ ts: Date.now() });
        setShowDrafts(false);
        setMessage({ text: `已打开草稿: ${p.metadata.name}`, type: 'info' });
      }
    });
  }, [draft, project, history]);

  // 另存为:用新名称和新 id 保存当前项目副本
  const handleSaveAs = useCallback(() => {
    const name = prompt('请输入新方案名称:', `${project.metadata.name} 副本`);
    if (!name?.trim()) return;
    // P0-4: structuredClone 比 JSON 往返快,且语义清晰
    const cloned = typeof structuredClone === 'function' ? structuredClone(project) : JSON.parse(JSON.stringify(project));
    const newProject: EditorProject = {
      ...cloned,
      id: `proj-${Date.now()}`,
      metadata: { ...project.metadata, name: name.trim() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.save(newProject.id, newProject);
    setDraftVersion((v) => v + 1);
    setMessage({ text: `已另存为草稿: ${name.trim()}`, type: 'success' });
  }, [draft, project]);

  // 删除草稿
  const handleDeleteDraft = useCallback((key: string, name: string) => {
    if (!confirm(`确定删除草稿"${name}"?此操作不可撤销。`)) return;
    draft.remove(key);
    setDraftVersion((v) => v + 1);
    setMessage({ text: `已删除草稿: ${name}`, type: 'info' });
  }, [draft]);

  // 草稿列表(响应 draftVersion 变化刷新)
  const draftsList = useMemo(() => draft.list(), [draft, draftVersion]);

  /* ----------------- 工具栏操作 ----------------- */
  const handleNew = useCallback(async () => {
    if (!confirm('新建方案会清空当前编辑内容(当前草稿已自动保存)。继续?')) return;
    // 先保存当前项目快照(确保不丢失)
    await draft.save(project.id, project);
    const newProject = createEmptyProject();
    setHistory(replaceProject(history, newProject));
    setSelection({ kind: 'none' });
    setCurrentStepId(null);
    setValidation(null);
    setFitRequest({ ts: Date.now() });
    setMessage({ text: '已新建方案,草稿已保存为独立条目', type: 'info' });
  }, [history, project, draft]);

  const handleUndo = useCallback(() => setHistory((h) => undo(h)), []);
  const handleRedo = useCallback(() => setHistory((h) => redo(h)), []);

  // P1-7: 撤销/重做后修复悬空 selection
  useEffect(() => {
    if (selection.kind === 'piece') {
      const exists = project.pieces.some((p) => p.id === selection.id);
      if (!exists) setSelection({ kind: 'none' });
    } else if (selection.kind === 'connection') {
      if (selection.index < 0 || selection.index >= project.connections.length) {
        setSelection({ kind: 'none' });
      }
    } else if (selection.kind === 'step') {
      const exists = project.steps.some((s) => s.id === selection.id);
      if (!exists) setSelection({ kind: 'none' });
    }
  }, [project, selection]);

  const handleImportExisting = useCallback(async (modelId: string) => {
    const m = models.find((mm) => mm.id === modelId);
    if (!m) {
      setMessage({ text: `找不到模型: ${modelId}`, type: 'error' });
      return;
    }
    // 先保存当前项目快照
    await draft.save(project.id, project);
    const p = modelToProject(m);
    setHistory(replaceProject(history, p));
    setSelection({ kind: 'none' });
    setCurrentStepId(null);
    setFitRequest({ ts: Date.now() });
    setMessage({ text: `已导入现有模型: ${m.name}`, type: 'success' });
  }, [history, project, draft]);

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
    // P0-3: 导出为 SchemeDef v3 JSON（唯一持久化格式）
    const json = serializeProjectAsScheme(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.metadata.name || 'magnet-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ text: '已导出 JSON (SchemeDef v3)', type: 'success' });
  }, [project, validation]);

  const handleImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      // P0-3: 统一用 parseScheme 识别 v3/v1/v0，输出 SchemeDef v3
      let importedProject: EditorProject;
      let migrated = false;
      try {
        const scheme = parseScheme(text);
        importedProject = schemeToEditorProject(scheme);
        // 重新求解 transforms（持久化层不再保存这个）
        importedProject.transforms = resnapshotTransforms(importedProject);
        // 检测是否发生了 v1 → v3 迁移
        migrated = text.includes('"schemaVersion":1') || text.includes('"schemaVersion": 1');
      } catch (parseErr) {
        // 兜底：尝试旧 parseProject（保留对历史格式的最大兼容）
        const result = parseProject(text);
        if (result.errors.length > 0 || !result.project) {
          setMessage({ text: '导入失败: ' + (result.errors[0] || (parseErr as Error).message), type: 'error' });
          return;
        }
        importedProject = result.project;
      }
      // 先保存当前项目快照
      await draft.save(project.id, project);
      setHistory(replaceProject(history, importedProject));
      setSelection({ kind: 'none' });
      setCurrentStepId(null);
      setFitRequest({ ts: Date.now() });
      setMessage({
        text: migrated ? '已导入方案(已从 v1 迁移到 v3)' : '已导入方案',
        type: 'success',
      });
    } catch (e) {
      setMessage({ text: '导入失败: ' + (e as Error).message, type: 'error' });
    }
  }, [history, project, draft]);

  const handleValidateNow = useCallback(() => {
    setValidation(runValidation(project));
    setMessage({ text: '已完成物理校验', type: 'info' });
  }, [project]);

  /* ----------------- P2: 生成真实 3D 渲染封面 ----------------- */
  const [generatingCover, setGeneratingCover] = useState(false);
  const handleGenerateCover = useCallback(async () => {
    if (project.pieces.length === 0) {
      setMessage({ text: '当前方案没有零件,无法生成封面', type: 'error' });
      return;
    }
    setGeneratingCover(true);
    try {
      // 找到封面镜头预设(若存在)
      const coverPresetId = project.metadata.coverCameraPresetId;
      const coverPreset = coverPresetId
        ? project.cameraPresets.find((p) => p.id === coverPresetId) ?? null
        : null;
      // 使用 requestAnimationFrame 让 UI 先更新到"生成中"状态
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const dataUrl = renderProjectCover(project, {
        width: 512,
        height: 512,
        cameraPreset: coverPreset,
        background: '#f0f9ff',
      });
      if (!dataUrl) {
        setMessage({ text: '封面生成失败,请检查浏览器 WebGL 支持', type: 'error' });
        return;
      }
      const newHistory = setThumbnailDataUrlAction(history, dataUrl, coverPresetId);
      setHistory(newHistory);
      setMessage({ text: '已生成 3D 渲染封面(512x512 PNG)', type: 'success' });
    } catch (err) {
      setMessage({ text: '封面生成失败: ' + (err as Error).message, type: 'error' });
    } finally {
      setGeneratingCover(false);
    }
  }, [history, project]);

  const hasCover = !!project.thumbnail?.dataUrl;

  /* ----------------- 错误定位 ----------------- */
  const handleFocusError = useCallback((target: { pieceId?: string; connectionIndex?: number }) => {
    if (target.pieceId) {
      setSelection({ kind: 'piece', id: target.pieceId });
      setFocusRequest({ pieceId: target.pieceId, ts: Date.now() });
    } else if (target.connectionIndex !== undefined) {
      setSelection({ kind: 'connection', index: target.connectionIndex });
    }
  }, []);

  // P1: 小屏检测 - 视口宽度 < 1024px 时显示提示页
  if (!isDesktop) {
    return <EditorSmallScreen currentWidth={viewport.width} />;
  }

  // P1: 全屏预览(复用 TutorialPlayer,与用户端同一组件同一数据)
  if (previewMode) {
    return (
      <TutorialPlayerFullscreenPreview
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
        onFitAll={() => setFitRequest({ ts: Date.now() })}
        onShowDrafts={() => setShowDrafts(true)}
        onSaveAs={handleSaveAs}
        autoSaved={autoSaved}
        validationValid={validation?.valid}
        existingModels={models.map((m) => ({ id: m.id, name: m.name }))}
        toolMode={toolMode}
        onToolModeChange={setToolMode}
        onGenerateCover={handleGenerateCover}
        generatingCover={generatingCover}
        hasCover={hasCover}
      />

      {/* P1: 模式切换栏 */}
      <div className="flex items-center gap-1 px-3 py-1 border-b bg-white flex-shrink-0">
        <button
          onClick={() => handleModeChange('structure')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
            mode === 'structure'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          data-testid="mode-structure"
        >
          <Box className="w-3.5 h-3.5" />
          结构编辑
        </button>
        <button
          onClick={() => handleModeChange('tutorial')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
            mode === 'tutorial'
              ? 'bg-purple-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          data-testid="mode-tutorial"
        >
          <Video className="w-3.5 h-3.5" />
          教学编排
        </button>
        <div className="ml-auto flex items-center gap-2">
          {/* P1-七: 录制按钮在两种模式下均可用(只要有选中步骤) */}
          {currentStepId !== null && (
            <button
              onClick={() => handleToggleRecording(currentStepId)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                recordingStepId === currentStepId
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
              data-testid="record-toggle"
              aria-pressed={recordingStepId === currentStepId}
            >
              <span className={`w-2 h-2 rounded-full ${recordingStepId === currentStepId ? 'bg-white' : 'bg-red-500'}`} />
              {recordingStepId === currentStepId ? '录制中(点击停止)' : '开始录制本步'}
            </button>
          )}
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            data-testid="preview-button"
          >
            <Play className="w-3.5 h-3.5" />
            全屏预览
          </button>
        </div>
      </div>

      {/* P1-七: 顶部始终显示的红色"正在录制第 N 步"状态条 + 停止录制按钮(跨模式可见) */}
      {recordingStepId !== null && (
        <div
          className="flex items-center gap-3 px-4 py-1.5 bg-red-600 text-white text-sm font-medium flex-shrink-0"
          data-testid="recording-status-bar"
          role="status"
          aria-live="polite"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
          <span>正在录制第 {recordingStepId} 步 — 新增零件、连接和断开操作会实时加入该步骤</span>
          <button
            onClick={() => setShowStopRecordingConfirm(true)}
            className="ml-auto px-3 py-0.5 bg-white text-red-600 rounded text-xs font-semibold hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            data-testid="stop-recording-button"
          >
            停止录制
          </button>
        </div>
      )}

      {/* P0-5: 草稿恢复确认 — 检测到草稿时提示用户选择，不自动加载 */}
      {pendingDraft && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-restore-title"
          data-testid="draft-restore-dialog"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 id="draft-restore-title" className="text-lg font-semibold text-gray-800 mb-2">
              发现未完成的草稿
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              上次有未完成的草稿：<span className="font-medium text-gray-800">{pendingDraft.name}</span>
            </p>
            <p className="text-xs text-gray-500 mb-5">是否恢复该草稿继续编辑？丢弃后将开始空白方案。</p>
            <div className="flex gap-3">
              <button
                onClick={handleRestoreDraft}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
                data-testid="draft-restore-confirm"
              >
                恢复草稿
              </button>
              <button
                onClick={handleDiscardDraft}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                data-testid="draft-restore-discard"
              >
                丢弃草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P0-5: 草稿管理面板 */}
      {showDrafts && (
        <DraftManagerModal
          drafts={draftsList}
          currentProjectId={project.id}
          onOpen={handleOpenDraft}
          onDelete={handleDeleteDraft}
          onClose={() => setShowDrafts(false)}
        />
      )}

      {/* P1-五: 已连接零件移动 - 三选项弹窗(替代原生 confirm) */}
      {pendingConnectedMove && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="connected-move-title"
          data-testid="connected-move-dialog"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 id="connected-move-title" className="text-lg font-semibold text-gray-800 mb-2">
              该零件是已连接组件的成员
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              移动该零件会影响其连接关系。请选择处理方式:
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConnectedMoveKeep}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
                data-testid="connected-move-keep"
              >
                <div className="font-semibold">保持连接并调整角度</div>
                <div className="text-xs text-blue-100 mt-0.5">根据新朝向自动更新二面角,连接关系不变</div>
              </button>
              <button
                onClick={handleConnectedMoveDisconnect}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
                data-testid="connected-move-disconnect"
              >
                <div className="font-semibold">断开连接后移动</div>
                <div className="text-xs text-amber-100 mt-0.5">移除该连接,零件变为自由状态可任意移动</div>
              </button>
              <button
                onClick={handleConnectedMoveCancel}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                data-testid="connected-move-cancel"
              >
                <div className="font-semibold">取消</div>
                <div className="text-xs text-gray-500 mt-0.5">不改变项目,零件回到原位</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* P1-七: 停止录制确认弹窗 */}
      {showStopRecordingConfirm && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stop-recording-title"
          data-testid="stop-recording-dialog"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 id="stop-recording-title" className="text-lg font-semibold text-gray-800 mb-2">
              确认停止录制?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              停止后,后续新增的零件和连接将不再自动加入步骤 #{recordingStepId}。已录制的内容会保留。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmStopRecording}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2"
                data-testid="stop-recording-confirm"
              >
                停止录制
              </button>
              <button
                onClick={handleCancelStopRecording}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                data-testid="stop-recording-cancel"
              >
                继续录制
              </button>
            </div>
          </div>
        </div>
      )}

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

      {mode === 'structure' ? (
        /* ============ 结构编辑模式 ============ */
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
              toolMode={toolMode}
              onSelectPiece={(id) => setSelection({ kind: 'piece', id })}
              onSelectConnection={(idx) => setSelection({ kind: 'connection', index: idx })}
              onClearSelection={() => setSelection({ kind: 'none' })}
              focusRequest={focusRequest}
              fitRequest={fitRequest}
              onMovePiece={updatePieceTransformLive}
              onMovePieceCommit={handleSetPieceTransform}
              onCreateConnection={handleCreateConnection}
              cameraTargetRef={cameraTargetRef}
              liveTransformOverride={liveTransformOverride}
              getCurrentViewRef={getCurrentViewRef}
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
              onPreviewConnection={handlePreviewConnection}
              onEndPreviewConnection={handleEndPreviewConnection}
              onRemoveConnection={handleRemoveConnection}
              onUpdateMetadata={handleUpdateMetadata}
              onFocusError={handleFocusError}
              onSaveCameraPreset={handleSaveCameraPreset}
              currentStepId={currentStepId}
              onAddPieceToStep={handleAddPieceToStep}
              onUpdateStep={handleUpdateStep}
              onSetPieceTransform={handleSetPieceTransform}
              onSelectPiece={(id) => setSelection({ kind: 'piece', id })}
              onSelectConnection={(idx) => setSelection({ kind: 'connection', index: idx })}
            />
          </aside>
        </div>
      ) : (
        /* ============ 教学编排模式 ============ */
        <div className="flex flex-1 min-h-0">
          {/* 左:TutorialPlayer 预览(复用正式播放器组件,同一份数据) */}
          <main className="flex-1 min-w-0 relative bg-gray-900">
            <TutorialPlayerInlinePreview
              project={project}
              initialStepIdx={(() => {
                const idx = project.steps.findIndex((s) => s.id === currentStepId);
                return idx >= 0 ? idx : 0;
              })()}
              onStepChange={(stepIdx: number) => {
                // 同步时间轴选中
                const step = project.steps[stepIdx];
                if (step) {
                  setCurrentStepId(step.id);
                  setSelection({ kind: 'step', id: step.id });
                }
              }}
            />
          </main>

          {/* 右:教学编排面板 */}
          <aside className="w-[400px] border-l bg-white overflow-y-auto flex-shrink-0">
            <TutorialOrchestrationPanel
              project={project}
              currentStepId={currentStepId}
              currentView={currentView ?? undefined}
              onSetStepCamera={handleSetStepCamera}
              onCaptureCurrentViewAsStepCamera={handleCaptureCurrentViewAsStepCamera}
              onPatchPieceEntrance={handlePatchPieceEntrance}
              onBatchSetEntranceType={handleBatchSetEntranceType}
              onClearPieceEntrance={handleClearPieceEntrance}
              onSetStepHint={handleSetStepHint}
              onSetStepFocusPoints={handleSetStepFocusPoints}
              onSetStepHighlightMs={handleSetStepHighlightMs}
              onSetStepSnapFeedback={handleSetStepSnapFeedback}
              onSetPieceAnnotation={handleSetPieceAnnotation}
              onRemovePieceFromStep={handleRemovePieceFromStep}
              onAddPieceToStep={handleAddPieceToStep}
              onSelectPiece={(id) => setSelection({ kind: 'piece', id })}
            />
          </aside>
        </div>
      )}

      {/* 下:步骤时间轴 */}
      <div className="h-44 border-t bg-white flex-shrink-0">
        <StepTimeline
          project={project}
          currentStepId={currentStepId}
          onSelectStep={(id) => { setCurrentStepId(id); setSelection({ kind: 'step', id }); }}
          onAddStep={handleAddStep}
          onDeleteStep={handleDeleteStep}
          onMoveStep={handleMoveStep}
          validation={validation}
          recordingStepId={recordingStepId}
        />
      </div>

      <div className="absolute bottom-2 left-2 text-xs text-gray-400 z-10">
        <Link to="/" className="underline">← 返回首页</Link>
      </div>
    </div>
  );
}

/* ----------------- P1: 复用 TutorialPlayer 的预览组件 ----------------- */

/** 内联预览(教学编排模式左侧使用,与正式播放器同组件同数据) */
function TutorialPlayerInlinePreview({
  project,
  initialStepIdx,
  onStepChange,
}: {
  project: EditorProject;
  initialStepIdx: number;
  onStepChange: (stepIdx: number) => void;
}) {
  const model = useMemo(() => projectToModel(project) as Model, [project]);
  return (
    <TutorialPlayer
      model={model}
      initialStep={initialStepIdx}
      onStepChange={onStepChange}
      immersive
      height="100%"
    />
  );
}

/** 全屏预览(编辑器工具栏"预览"按钮使用,与用户端 TutorialPage 渲染结果逐像素接近) */
function TutorialPlayerFullscreenPreview({
  project,
  onExit,
}: {
  project: EditorProject;
  onExit: () => void;
}) {
  const model = useMemo(() => projectToModel(project) as Model, [project]);
  return (
    <div className="flex flex-col h-screen w-screen bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <span className="font-semibold truncate">用户端预览 - {project.metadata.name}</span>
        <button
          onClick={onExit}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          data-testid="exit-preview"
        >
          退出预览
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TutorialPlayer
          model={model}
          immersive
          height="100%"
        />
      </div>
    </div>
  );
}
