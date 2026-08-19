import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line, TransformControls, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import * as THREE from 'three';
import { MagnetColor } from '../../data/types';
import { getShapeDef } from '../../engine/shapes';
import { Connection, PieceTransform } from '../../engine/types';
import { MagnetPieceMesh } from '../magnet3d/primitives';
import { SceneLighting, defaultGLProps } from '../magnet3d/SceneLighting';
import { EditorProject, SerializableTransform } from '../../editor/types';
import { getDisplayTransforms, findCompatibleTargets, buildPortUsage, findBestSnapCandidate } from '../../editor/snap';
import { computeFitCamera, applyFitResult, pieceWorldVertices } from '../magnet3d/cameraUtils';
import type { Selection } from './EditorWorkspace';

export type ToolMode = 'select' | 'move' | 'rotate' | 'snap';

/** P1-4: 相机视图状态(position/target/zoom),用于 EditorWorkspace 同步 currentView */
export interface EditorView {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

interface Props {
  project: EditorProject;
  selection: Selection;
  toolMode: ToolMode;
  onSelectPiece: (id: string) => void;
  onSelectConnection: (index: number) => void;
  onClearSelection: () => void;
  focusRequest: { pieceId: string; ts: number } | null;
  fitRequest: { ts: number } | null;
  onMovePiece: (pieceId: string, tf: SerializableTransform) => void;
  onMovePieceCommit: (pieceId: string, tf: SerializableTransform) => void;
  onCreateConnection: (conn: Connection) => void;
  cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
  /** P0-3: 拖拽期间的实时变换覆盖(只覆盖单个 piece),避免重算 solver */
  liveTransformOverride: { pieceId: string; tf: SerializableTransform } | null;
  /** P1: 获取当前相机视图(position/target/zoom)的 ref,用于"设为本步镜头" */
  getCurrentViewRef?: React.MutableRefObject<(() => EditorView | null) | null>;
  /** P1-4: 相机变化时回调,用于父组件同步 currentView state */
  onViewChange?: (view: EditorView) => void;
}

interface DefaultCameraState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
  target: THREE.Vector3;
}

const SNAP_PIXEL_THRESHOLD = 28; // 屏幕像素阈值

function SceneContent({
  project, selection, toolMode, onSelectPiece, onSelectConnection, focusRequest, fitRequest,
  onMovePiece, onMovePieceCommit, onCreateConnection, defaultCameraStateRef, resetViewRef,
  fitAllRef, fitSelectionRef, setViewRef, cameraTargetRef, liveTransformOverride, getCurrentViewRef,
  onViewChange,
}: {
  project: EditorProject;
  selection: Selection;
  toolMode: ToolMode;
  onSelectPiece: (id: string) => void;
  onSelectConnection: (index: number) => void;
  onClearSelection: () => void;
  focusRequest: { pieceId: string; ts: number } | null;
  fitRequest: { ts: number } | null;
  onMovePiece: (pieceId: string, tf: SerializableTransform) => void;
  onMovePieceCommit: (pieceId: string, tf: SerializableTransform) => void;
  onCreateConnection: (conn: Connection) => void;
  defaultCameraStateRef: React.MutableRefObject<DefaultCameraState | null>;
  resetViewRef: React.MutableRefObject<(() => void) | null>;
  fitAllRef: React.MutableRefObject<(() => void) | null>;
  fitSelectionRef: React.MutableRefObject<(() => void) | null>;
  setViewRef: React.MutableRefObject<((view: string) => void) | null>;
  cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
  liveTransformOverride: { pieceId: string; tf: SerializableTransform } | null;
  getCurrentViewRef?: React.MutableRefObject<(() => EditorView | null) | null>;
  onViewChange?: (view: EditorView) => void;
}) {
  const partMap = useMemo(() => {
    const m: Record<string, EditorProject['parts'][number]> = {};
    project.parts.forEach((p) => (m[p.id] = p));
    return m;
  }, [project.parts]);
  const pieceMap = useMemo(() => {
    const m: Record<string, EditorProject['pieces'][number]> = {};
    project.pieces.forEach((p) => (m[p.id] = p));
    return m;
  }, [project.pieces]);

  // P0-3: 拖拽期间用 liveTransformOverride 覆盖单 piece transform,
  // 避免每次拖动都重算 solveConnections(solver 仅在 project 变化时跑一次)。
  const transforms = useMemo(() => {
    const base = getDisplayTransforms(project);
    if (!liveTransformOverride) return base;
    const { pieceId, tf } = liveTransformOverride;
    return {
      ...base,
      [pieceId]: {
        position: new THREE.Vector3(tf.position[0], tf.position[1], tf.position[2]),
        quaternion: new THREE.Quaternion(tf.quaternion[0], tf.quaternion[1], tf.quaternion[2], tf.quaternion[3]),
      },
    };
  }, [project, liveTransformOverride]);
  const portUsage = useMemo(() => buildPortUsage(project), [project.connections]);

  const compatibleTargets = useMemo(() => {
    if (selection.kind !== 'piece') return new Set<string>();
    const set = new Set<string>();
    for (const t of findCompatibleTargets({ pieceId: selection.id, portId: '' }, project)) {
      set.add(`${t.pieceId}:${t.portId}`);
    }
    return set;
  }, [selection, project]);

  const controlsRef = useRef<any>(null);
  const transformControlsRef = useRef<any>(null);
  const { camera, size } = useThree();
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);
  const [snapPreview, setSnapPreview] = useState<{ position: [number, number, number]; quaternion: [number, number, number, number] } | null>(null);
  const dragStateRef = useRef<{ pieceId: string; startPos: THREE.Vector3; startQuat: THREE.Quaternion; committed: boolean } | null>(null);
  // P0-四.7: 跟踪最新 transforms,供防抖 commit 的 setTimeout 回调读取(避免闭包陈旧值)
  const transformsRef = useRef(transforms);
  transformsRef.current = transforms;

  const selectedPieceId = selection.kind === 'piece' ? selection.id : null;

  /* ---- 相机拟合:复用 MagnetScene3D 的投影算法 ---- */
  const computeAllWorldVerts = useCallback((): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [];
    for (const p of project.pieces) {
      const tf = transforms[p.id];
      const piece = pieceMap[p.id];
      if (!tf || !piece) continue;
      const part = partMap[piece.partId];
      if (!part) continue;
      const shape = getShapeDef(part.shape);
      if (!shape) continue;
      out.push(...pieceWorldVertices(shape, tf.position, tf.quaternion));
    }
    return out;
  }, [project.pieces, transforms, pieceMap, partMap]);

  const fitAll = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const verts = computeAllWorldVerts();
    if (verts.length === 0) return;
    const result = computeFitCamera({
      worldVertices: verts,
      camera: camera as THREE.OrthographicCamera,
      controls: controlsRef.current,
      size,
    });
    if (result) {
      applyFitResult(camera as THREE.OrthographicCamera, result, controlsRef.current);
      defaultCameraStateRef.current = result;
      cameraTargetRef.current.copy(result.target);
    }
  }, [camera, computeAllWorldVerts, size, defaultCameraStateRef, cameraTargetRef]);

  const fitSelection = useCallback(() => {
    if (!selectedPieceId) { fitAll(); return; }
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const tf = transforms[selectedPieceId];
    const piece = pieceMap[selectedPieceId];
    if (!tf || !piece) return;
    const part = partMap[piece.partId];
    if (!part) return;
    const shape = getShapeDef(part.shape);
    if (!shape) return;
    const verts = pieceWorldVertices(shape, tf.position, tf.quaternion);
    const result = computeFitCamera({
      worldVertices: verts,
      camera: camera as THREE.OrthographicCamera,
      controls: controlsRef.current,
      fillRatio: 0.5,
      size,
    });
    if (result) {
      applyFitResult(camera as THREE.OrthographicCamera, result, controlsRef.current);
      cameraTargetRef.current.copy(result.target);
    }
  }, [camera, selectedPieceId, transforms, pieceMap, partMap, size, fitAll, cameraTargetRef]);

  // 仅在首次加载或 project.id 变化时自动 fit
  const lastFitProjectId = useRef<string>('');
  useEffect(() => {
    if (project.id !== lastFitProjectId.current) {
      lastFitProjectId.current = project.id;
      const t = setTimeout(() => fitAll(), 100);
      return () => clearTimeout(t);
    }
  }, [project.id, fitAll]);

  // 聚焦请求
  useEffect(() => {
    if (focusRequest) fitSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  // fit 请求(工具栏按钮)
  useEffect(() => {
    if (fitRequest) fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest]);

  const resetView = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const state = defaultCameraStateRef.current;
    if (state) {
      applyFitResult(camera as THREE.OrthographicCamera, state, controlsRef.current);
      cameraTargetRef.current.copy(state.target);
    } else {
      fitAll();
    }
  }, [camera, defaultCameraStateRef, fitAll, cameraTargetRef]);

  // 视图方向切换
  const setView = useCallback((view: string) => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;
    const verts = computeAllWorldVerts();
    if (verts.length === 0) return;
    const box = new THREE.Box3();
    verts.forEach((v) => box.expandByPoint(v));
    const center = box.getCenter(new THREE.Vector3());
    const dim = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(dim.x, dim.y, dim.z);
    const dist = maxDim * 2 + 5;
    const pos = new THREE.Vector3();
    switch (view) {
      case 'front': pos.set(center.x, center.y, center.z + dist); break;
      case 'back': pos.set(center.x, center.y, center.z - dist); break;
      case 'left': pos.set(center.x - dist, center.y, center.z); break;
      case 'right': pos.set(center.x + dist, center.y, center.z); break;
      case 'top': pos.set(center.x, center.y + dist, center.z); break;
      default: return;
    }
    ortho.position.copy(pos);
    ortho.lookAt(center);
    ortho.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    cameraTargetRef.current.copy(center);
  }, [camera, computeAllWorldVerts, cameraTargetRef]);

  useEffect(() => { resetViewRef.current = resetView; }, [resetView, resetViewRef]);
  useEffect(() => { fitAllRef.current = fitAll; }, [fitAll, fitAllRef]);
  useEffect(() => { fitSelectionRef.current = fitSelection; }, [fitSelection, fitSelectionRef]);
  useEffect(() => { setViewRef.current = setView; }, [setView, setViewRef]);

  // P1: 暴露当前相机视图 getter,用于"设为本步镜头"
  const getCurrentView = useCallback((): EditorView | null => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return null;
    const ortho = camera as THREE.OrthographicCamera;
    const target = controlsRef.current?.target ?? cameraTargetRef.current;
    return {
      position: [ortho.position.x, ortho.position.y, ortho.position.z],
      target: [target.x, target.y, target.z],
      zoom: ortho.zoom,
    };
  }, [camera, cameraTargetRef]);
  useEffect(() => {
    if (getCurrentViewRef) getCurrentViewRef.current = getCurrentView;
  }, [getCurrentView, getCurrentViewRef]);

  // P1-3 + P1-4: 相机变化时通过 OrbitControls 'change' 事件驱动更新,
  // 替代原来的 200ms setInterval 轮询。同时通知父组件 onViewChange。
  // controls 可能在 SceneContent mount 后才创建,用 50ms 重试等待可用。
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  useEffect(() => {
    // DEV 模式需要更新 window 状态;父组件可能需要 onViewChange 通知
    const needDevWindow = import.meta.env.DEV;
    const needNotify = !!onViewChangeRef.current;
    if (!needDevWindow && !needNotify) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = () => {
      const view = getCurrentView();
      if (!view) return;
      if (needDevWindow) {
        (window as any).__editorCameraState = {
          x: view.position[0], y: view.position[1], z: view.position[2],
          zoom: view.zoom,
          tx: view.target[0], ty: view.target[1], tz: view.target[2],
        };
      }
      onViewChangeRef.current?.(view);
    };

    const register = () => {
      if (disposed) return;
      const controls = controlsRef.current;
      if (controls) {
        controls.addEventListener('change', handler);
        handler(); // 立即同步一次
      } else {
        // controls 尚未创建,50ms 后重试(通常 1-2 次即成功)
        retryTimer = setTimeout(register, 50);
      }
    };
    register();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      controlsRef.current?.removeEventListener('change', handler);
    };
  }, [getCurrentView]);

  /* ---- 键盘快捷键(输入框聚焦时禁用) ---- */
  // P0-四.7: 长按按键合并为单次历史记录 — 单一防抖 timer
  // 每次按键重置 350ms timer,停止按键 350ms 后 commit 一次。
  // 不使用 keyup timer,因为 keyup 的 150ms 在 Playwright/CI 下可能在
  // 两次按键之间触发,导致一次按键序列被拆成多条历史记录。
  const KEYBOARD_COMMIT_DEBOUNCE_MS = 350;
  const keyboardCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardDragStateRef = useRef<{ pieceId: string; startPos: THREE.Vector3; startQuat: THREE.Quaternion; committed: boolean } | null>(null);
  // 用 ref 跟踪 selection 和回调,避免 transforms 变化导致 useEffect 重新注册
  // (重新注册会触发 cleanup 清除 commit timer,导致 commit 永远不执行)
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const onMovePieceRef = useRef(onMovePiece);
  onMovePieceRef.current = onMovePiece;
  const onMovePieceCommitRef = useRef(onMovePieceCommit);
  onMovePieceCommitRef.current = onMovePieceCommit;

  // 单一 commit 函数:读取最新 transform 并提交一次历史记录
  const commitKeyboardDrag = useCallback(() => {
    const drag = keyboardDragStateRef.current;
    if (!drag || drag.committed) return;
    const latestTf = transformsRef.current[drag.pieceId];
    if (latestTf) {
      onMovePieceCommitRef.current(drag.pieceId, {
        position: [latestTf.position.x, latestTf.position.y, latestTf.position.z],
        quaternion: [latestTf.quaternion.x, latestTf.quaternion.y, latestTf.quaternion.z, latestTf.quaternion.w],
      });
    }
    drag.committed = true;
    keyboardDragStateRef.current = null;
    keyboardCommitTimerRef.current = null;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 操作对象是输入框/textarea/contenteditable 时禁用全局快捷键
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      const sel = selectionRef.current;
      if (sel.kind !== 'piece') return;
      const tf = transformsRef.current[sel.id];
      if (!tf) return;
      const step = e.shiftKey ? 1.0 : 0.2;
      const rotStep = e.shiftKey ? 45 : 15;
      const pos = [tf.position.x, tf.position.y, tf.position.z] as [number, number, number];
      const q = new THREE.Quaternion(tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w);
      let moved = false;
      let rotated = false;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'a': pos[0] -= step; moved = true; break;
        case 'd': pos[0] += step; moved = true; break;
        case 'w': pos[2] -= step; moved = true; break;
        case 's': pos[2] += step; moved = true; break;
        case 'q': pos[1] += step; moved = true; break;
        case 'e': pos[1] -= step; moved = true; break;
        case 'r': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 't': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
        case 'f': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 'g': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
        case 'v': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 'b': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
      }
      if (moved || rotated) {
        e.preventDefault();
        const pieceId = sel.id;
        // 首次按键时记录起点(用于单次历史)
        if (!keyboardDragStateRef.current || keyboardDragStateRef.current.pieceId !== pieceId || keyboardDragStateRef.current.committed) {
          keyboardDragStateRef.current = {
            pieceId,
            startPos: tf.position.clone(),
            startQuat: tf.quaternion.clone(),
            committed: false,
          };
        }
        onMovePieceRef.current(pieceId, { position: pos, quaternion: [q.x, q.y, q.z, q.w] });
        // 单一防抖:每次按键重置 timer,350ms 无新按键则 commit
        if (keyboardCommitTimerRef.current) clearTimeout(keyboardCommitTimerRef.current);
        keyboardCommitTimerRef.current = setTimeout(commitKeyboardDrag, KEYBOARD_COMMIT_DEBOUNCE_MS);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [commitKeyboardDrag]);

  /* ---- TransformControls 拖拽事务:单次拖动单次撤销 ---- */
  const onTransformMouseDown = useCallback(() => {
    if (!selectedPieceId) return;
    const tf = transforms[selectedPieceId];
    if (!tf) return;
    dragStateRef.current = {
      pieceId: selectedPieceId,
      startPos: tf.position.clone(),
      startQuat: tf.quaternion.clone(),
      committed: false,
    };
    // 拖拽期间禁用 OrbitControls
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [selectedPieceId, transforms]);

  const onTransformObjectChange = useCallback(() => {
    if (!selectedPieceId || !transformControlsRef.current) return;
    const obj = transformControlsRef.current.object;
    if (!obj) return;
    // 拖拽中实时更新视觉(不提交历史)
    onMovePiece(selectedPieceId, {
      position: [obj.position.x, obj.position.y, obj.position.z],
      quaternion: [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w],
    });

    // 磁吸模式:检测吸附候选
    if (toolMode === 'snap') {
      // P0-三.1: 使用 TransformControls 当前实时 position/quaternion 计算磁吸候选,
      // 而不是上一轮 project.transforms。
      const liveTf: PieceTransform = {
        position: obj.position.clone(),
        quaternion: obj.quaternion.clone(),
      };
      const candidate = findBestSnapCandidate(selectedPieceId, project, undefined, liveTf);
      if (candidate) {
        // 检查屏幕像素距离是否满足阈值
        const tf = transforms[selectedPieceId];
        if (tf) {
          const screenPos = worldToScreen(tf.position, camera, size);
          const snapScreenPos = worldToScreen(candidate.resultingTransform.position, camera, size);
          const pixelDist = Math.hypot(screenPos.x - snapScreenPos.x, screenPos.y - snapScreenPos.y);
          if (pixelDist < SNAP_PIXEL_THRESHOLD) {
            setSnapPreview({
              position: [candidate.resultingTransform.position.x, candidate.resultingTransform.position.y, candidate.resultingTransform.position.z],
              quaternion: [candidate.resultingTransform.quaternion.x, candidate.resultingTransform.quaternion.y, candidate.resultingTransform.quaternion.z, candidate.resultingTransform.quaternion.w],
            });
          } else {
            setSnapPreview(null);
          }
        }
      } else {
        setSnapPreview(null);
      }
    }
  }, [selectedPieceId, project, toolMode, transforms, camera, size, onMovePiece]);

  const onTransformMouseUp = useCallback(() => {
    const drag = dragStateRef.current;
    if (controlsRef.current) controlsRef.current.enabled = true;
    if (!drag || drag.committed) {
      dragStateRef.current = null;
      setSnapPreview(null);
      return;
    }

    // 磁吸模式:如果有吸附预览,提交吸附结果并创建连接
    if (toolMode === 'snap' && snapPreview && selectedPieceId) {
      // P0-三.1: 使用 dummyObj 的实时变换计算候选
      const obj = transformControlsRef.current?.object;
      const liveTf: PieceTransform | undefined = obj
        ? { position: obj.position.clone(), quaternion: obj.quaternion.clone() }
        : undefined;
      const candidate = findBestSnapCandidate(selectedPieceId, project, undefined, liveTf);
      if (candidate) {
        // 提交吸附位置
        onMovePieceCommit(selectedPieceId, {
          position: [candidate.resultingTransform.position.x, candidate.resultingTransform.position.y, candidate.resultingTransform.position.z],
          quaternion: [candidate.resultingTransform.quaternion.x, candidate.resultingTransform.quaternion.y, candidate.resultingTransform.quaternion.z, candidate.resultingTransform.quaternion.w],
        });
        // 创建连接
        onCreateConnection(candidate.connection);
        drag.committed = true;
        dragStateRef.current = null;
        setSnapPreview(null);
        return;
      }
    }

    // 普通模式:提交最终位置(单次撤销记录)
    if (selectedPieceId && transformControlsRef.current?.object) {
      const obj = transformControlsRef.current.object;
      onMovePieceCommit(selectedPieceId, {
        position: [obj.position.x, obj.position.y, obj.position.z],
        quaternion: [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w],
      });
    }
    drag.committed = true;
    dragStateRef.current = null;
    setSnapPreview(null);
  }, [toolMode, snapPreview, selectedPieceId, project, onMovePieceCommit, onCreateConnection]);

  // 监听 pointercancel / lostpointercapture
  useEffect(() => {
    const cancel = () => onTransformMouseUp();
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('lostpointercapture', cancel);
    return () => {
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('lostpointercapture', cancel);
    };
  }, [onTransformMouseUp]);

  // TransformControls 事件
  useEffect(() => {
    const tc = transformControlsRef.current;
    if (!tc) return;
    const onDown = () => onTransformMouseDown();
    const onUp = () => onTransformMouseUp();
    tc.addEventListener('mouseDown', onDown);
    tc.addEventListener('mouseUp', onUp);
    tc.addEventListener('objectChange', onTransformObjectChange);
    return () => {
      tc.removeEventListener('mouseDown', onDown);
      tc.removeEventListener('mouseUp', onUp);
      tc.removeEventListener('objectChange', onTransformObjectChange);
    };
  }, [onTransformMouseDown, onTransformMouseUp, onTransformObjectChange]);

  // 临时对象:TransformControls 挂载的 dummy
  const dummyObj = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (selectedPieceId && transforms[selectedPieceId]) {
      const tf = transforms[selectedPieceId];
      dummyObj.position.copy(tf.position);
      dummyObj.quaternion.copy(tf.quaternion);
    }
  }, [selectedPieceId, transforms, dummyObj]);

  // 连接点击检测
  const handleConnectionClick = useCallback((idx: number, e: any) => {
    e.stopPropagation();
    onSelectConnection(idx);
  }, [onSelectConnection]);

  return (
    <>
      <SceneLighting shadowScale={20} shadowOpacity={0.3}>
        <gridHelper args={[20, 20, '#cbd5e1', '#e2e8f0']} position={[0, -0.01, 0]} />

        {/* P0-二.2: TransformControls 附着的 dummyObj 必须真实存在于 scene graph,
            否则会抛出 "The attached 3D object must be a part of the scene graph"。
            通过 primitive 挂载到场景,visible=false 避免干扰渲染。 */}
        <primitive object={dummyObj} visible={false} />

        {/* 磁力片 */}
        {project.pieces.map((piece) => {
          const tf = transforms[piece.id];
          const part = partMap[piece.partId];
          if (!tf || !part) return null;
          const shape = getShapeDef(part.shape);
          if (!shape) return null;
          const isSelected = selection.kind === 'piece' && selection.id === piece.id;
          const isDimmed = selection.kind === 'piece' && selection.id !== piece.id;
          const isHovered = hoveredPiece === piece.id;
          const isSnapGhost = snapPreview !== null && piece.id === selectedPieceId;
          return (
            <MagnetPieceMesh
              key={piece.id}
              shape={shape}
              transform={isSnapGhost ? { position: new THREE.Vector3(snapPreview.position[0], snapPreview.position[1], snapPreview.position[2]), quaternion: new THREE.Quaternion(snapPreview.quaternion[0], snapPreview.quaternion[1], snapPreview.quaternion[2], snapPreview.quaternion[3]) } : tf}
              color={part.color as MagnetColor}
              selected={isSelected}
              highlighted={isHovered && !isSelected}
              dimmed={isDimmed}
              opacity={isSnapGhost ? 0.4 : 1}
              onClick={(e: any) => {
                e.stopPropagation();
                onSelectPiece(piece.id);
              }}
              onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; setHoveredPiece(piece.id); }}
              onPointerOut={() => { document.body.style.cursor = 'default'; setHoveredPiece(null); }}
            />
          );
        })}

        {/* 吸附预览(半透明 ghost) */}
        {snapPreview && selectedPieceId && (() => {
          const piece = pieceMap[selectedPieceId];
          const part = piece ? partMap[piece.partId] : null;
          const shape = part ? getShapeDef(part.shape) : null;
          if (!shape) return null;
          return (
            <MagnetPieceMesh
              shape={shape}
              transform={{ position: new THREE.Vector3(snapPreview.position[0], snapPreview.position[1], snapPreview.position[2]), quaternion: new THREE.Quaternion(snapPreview.quaternion[0], snapPreview.quaternion[1], snapPreview.quaternion[2], snapPreview.quaternion[3]) }}
              color={(partMap[piece!.partId]?.color ?? 'blue') as MagnetColor}
              opacity={0.35}
            />
          );
        })()}

        {/* 选中 piece 的端口可视化 */}
        {selection.kind === 'piece' && (() => {
          const piece = pieceMap[selection.id];
          const part = piece ? partMap[piece.partId] : null;
          const shape = part ? getShapeDef(part.shape) : null;
          const tf = transforms[selection.id];
          if (!shape || !tf) return null;
          const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));
          return shape.ports.map((port) => {
            const isUsed = portUsage.has(`${piece!.id}:${port.portId}`);
            const isCompatible = compatibleTargets.has(`${piece!.id}:${port.portId}`);
            const p0 = new THREE.Vector3(port.p0.x, port.p0.y, 0).applyMatrix4(matrix);
            const p1 = new THREE.Vector3(port.p1.x, port.p1.y, 0).applyMatrix4(matrix);
            const color = isUsed ? '#ef4444' : isCompatible ? '#22c55e' : '#3b82f6';
            return (
              <Line key={port.portId} points={[p0, p1]} color={color} lineWidth={4} />
            );
          });
        })()}

        {/* 连接可视化(可点击) */}
        {project.connections.map((conn, idx) => {
          const tfA = transforms[conn.pieceA];
          const tfB = transforms[conn.pieceB];
          if (!tfA || !tfB) return null;
          const isSelected = selection.kind === 'connection' && selection.index === idx;
          const mid = tfA.position.clone().add(tfB.position).multiplyScalar(0.5);
          return (
            <group key={`conn-${idx}`} onClick={(e: any) => handleConnectionClick(idx, e)}>
              <Line
                points={[tfA.position, tfB.position]}
                color={isSelected ? '#f59e0b' : '#94a3b8'}
                lineWidth={isSelected ? 3 : 2}
                dashed={!isSelected}
              />
              {/* 可点击的透明小球 */}
              <mesh position={mid}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color={isSelected ? '#f59e0b' : '#64748b'} transparent opacity={0.6} />
              </mesh>
            </group>
          );
        })}
      </SceneLighting>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        minDistance={2}
        maxDistance={30}
      />

      {/* TransformControls:仅在选中零件且非选择模式时启用 */}
      {selectedPieceId && toolMode !== 'select' && (
        <TransformControls
          ref={transformControlsRef}
          object={dummyObj}
          mode={toolMode === 'rotate' ? 'rotate' : 'translate'}
          size={0.8}
          onObjectChange={onTransformObjectChange}
        />
      )}

      {/* ViewCube */}
      <GizmoHelper alignment="top-right" margin={[80, 80]}>
        <GizmoViewcube
          onClick={(e: any) => {
            e?.stopPropagation?.();
            const face = e?.face?.normal;
            if (face) {
              if (face.x > 0.5) setViewRef.current?.('right');
              else if (face.x < -0.5) setViewRef.current?.('left');
              else if (face.y > 0.5) setViewRef.current?.('top');
              else if (face.z > 0.5) setViewRef.current?.('front');
              else if (face.z < -0.5) setViewRef.current?.('back');
            }
            return null as any;
          }}
        />
      </GizmoHelper>
    </>
  );
}

/** 世界坐标转屏幕像素坐标 */
function worldToScreen(worldPos: THREE.Vector3, camera: THREE.Camera, size: { width: number; height: number }): { x: number; y: number } {
  const projected = worldPos.clone().project(camera);
  return {
    x: (projected.x + 1) / 2 * size.width,
    y: (1 - (projected.y + 1) / 2) * size.height,
  };
}

export function EditorCanvas({
  project, selection, toolMode, onSelectPiece, onSelectConnection, onClearSelection,
  focusRequest, fitRequest, onMovePiece, onMovePieceCommit, onCreateConnection, cameraTargetRef,
  liveTransformOverride, getCurrentViewRef, onViewChange,
}: Props) {
  const defaultCameraStateRef = useRef<DefaultCameraState | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const fitAllRef = useRef<(() => void) | null>(null);
  const fitSelectionRef = useRef<(() => void) | null>(null);
  const setViewRef = useRef<((view: string) => void) | null>(null);

  const resetView = () => resetViewRef.current?.();
  const fitAll = () => fitAllRef.current?.();
  const fitSelection = () => fitSelectionRef.current?.();

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Canvas
        orthographic
        camera={{ position: [5, 5, 5], zoom: 50, near: 0.1, far: 100 }}
        shadows="percentage"
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
        gl={{ ...defaultGLProps }}
        onPointerMissed={onClearSelection}
      >
        <SceneContent
          project={project}
          selection={selection}
          toolMode={toolMode}
          onSelectPiece={onSelectPiece}
          onSelectConnection={onSelectConnection}
          onClearSelection={onClearSelection}
          focusRequest={focusRequest}
          fitRequest={fitRequest}
          onMovePiece={onMovePiece}
          onMovePieceCommit={onMovePieceCommit}
          onCreateConnection={onCreateConnection}
          defaultCameraStateRef={defaultCameraStateRef}
          resetViewRef={resetViewRef}
          fitAllRef={fitAllRef}
          fitSelectionRef={fitSelectionRef}
          setViewRef={setViewRef}
          cameraTargetRef={cameraTargetRef}
          liveTransformOverride={liveTransformOverride}
          getCurrentViewRef={getCurrentViewRef}
          onViewChange={onViewChange}
        />
      </Canvas>

      {/* 右下角按钮组 */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button
          onClick={fitAll}
          className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
          title="全部入镜"
          aria-label="全部入镜"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l4 4m8-4h4m0 0v4m0-4l-4 4M4 16v4m0 0h4m-4 0l4-4m8 4l4-4m0 4v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={fitSelection}
          className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
          title="聚焦选中"
          aria-label="聚焦选中"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2M3 12h2m14 0h2" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
          title="重置视角"
          aria-label="重置视角"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 视图方向按钮 */}
      <div className="absolute top-3 right-3 flex gap-1">
        {(['front', 'back', 'left', 'right', 'top'] as const).map((v) => {
          const labels = { front: '前', back: '后', left: '左', right: '右', top: '顶' };
          return (
            <button
              key={v}
              onClick={() => setViewRef.current?.(v)}
              className="px-2 py-1 text-[10px] bg-white/80 hover:bg-white rounded shadow-sm"
              title={`${labels[v]}视图`}
            >
              {labels[v]}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-3 left-3 text-xs text-gray-500 pointer-events-none space-y-0.5">
        <div>左键:选中 · {toolMode === 'rotate' ? 'Gizmo 旋转' : toolMode === 'move' ? 'Gizmo 移动' : '拖零件移动'} · 右键:旋转视角 · 滚轮:缩放</div>
        <div>WASDQE:移动 · RTFGVB:旋转 · Shift 大步 · Gizmo 模式下拖拽单次撤销</div>
      </div>
    </div>
  );
}
