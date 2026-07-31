/**
 * P1: 教学编排型播放器
 *
 * 这是用户端和编辑器预览共用的同一组件、同一份数据。
 * - 用户端：通过 TutorialPage 渲染，桌面端使用沉浸式 TutorialShell
 * - 编辑器：通过 EditorWorkspace 的预览面板渲染
 *
 * 功能：
 * - 按步骤播放零件入场动画（drop/side/fold/fade/none）
 * - 镜头平滑过渡到作者保存的位置
 * - 播放/暂停/重播本步/上一步/下一步/重置视角/锁定视角
 * - 支持 prefers-reduced-motion
 * - 动画期间防止连续点击造成状态错乱
 */
import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Play, Pause, RotateCcw, ArrowLeft, ArrowRight,
  Maximize2, Lock, Unlock, Package, Sparkles,
} from 'lucide-react';
import type { Model, MagnetColor } from '../../data/types';
import { magnetColorMap } from '../../data/models';
import { solveConnections } from '../../engine/solver';
import { getShapeDef } from '../../engine/shapes';
import type { PieceTransform, BuildStepV2, StepCamera } from '../../engine/types';
import { MagnetPieceMesh } from '../magnet3d/primitives';
import { SceneLighting, defaultGLProps } from '../magnet3d/SceneLighting';
import { useTutorialOrchestrator } from './useTutorialOrchestrator';
import { getEntranceOffset } from './orchestrator';

export interface TutorialPlayerProps {
  /** 模型数据（用户端从 models 读取，编辑器从 EditorProject 派生） */
  model: Model;
  /** 初始步骤索引 */
  initialStep?: number;
  /** 步骤变化回调 */
  onStepChange?: (step: number) => void;
  /** 是否显示侧栏信息（操作说明/家长引导/材料清单），默认 true */
  showSidebar?: boolean;
  /** 是否显示控制条，默认 true */
  showControls?: boolean;
  /** 是否沉浸式（隐藏边距，占满容器），默认 false */
  immersive?: boolean;
  /** 容器高度（CSS 字符串），默认 '100%' */
  height?: string;
}

/* ----------------- 3D 场景内部组件 ----------------- */

interface AnimatedPieceProps {
  shape: ReturnType<typeof getShapeDef>;
  transform: PieceTransform;
  color: MagnetColor;
  /** 入场偏移：[px, py, pz] */
  positionOffset: [number, number, number];
  /** 旋转偏移（欧拉角弧度）：[rx, ry, rz] */
  rotationOffset: [number, number, number];
  /** 透明度 0..1 */
  opacity: number;
  /** 是否高亮 */
  highlighted: boolean;
  /** 是否为新零件 */
  isNew: boolean;
}

function AnimatedPiece({
  shape,
  transform,
  color,
  positionOffset,
  rotationOffset,
  opacity,
  highlighted,
  isNew,
}: AnimatedPieceProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    // 应用入场偏移：最终位置 + 偏移
    groupRef.current.position.set(
      transform.position.x + positionOffset[0],
      transform.position.y + positionOffset[1],
      transform.position.z + positionOffset[2],
    );
    // 旋转：最终旋转 * 偏移旋转
    const q = transform.quaternion.clone();
    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotationOffset[0], rotationOffset[1], rotationOffset[2]),
    );
    q.multiply(offsetQuat);
    groupRef.current.quaternion.copy(q);
  });

  if (!shape) return null;

  return (
    <group ref={groupRef}>
      <MagnetPieceMesh
        shape={shape}
        transform={{
          position: new THREE.Vector3(0, 0, 0),
          quaternion: new THREE.Quaternion(),
        } as PieceTransform}
        color={color}
        isNew={isNew}
        highlighted={highlighted}
        opacity={opacity}
      />
    </group>
  );
}

interface CameraRigProps {
  /** 目标镜头（来自当前步骤的 camera 字段） */
  targetCamera: StepCamera | null;
  /** 镜头过渡进度 0..1 */
  transitionProgress: number;
  /** 是否锁定视角（锁定后不应用步骤镜头） */
  locked: boolean;
  /** 默认相机状态 ref */
  defaultCameraRef: React.MutableRefObject<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>;
  /** OrbitControls ref */
  controlsRef: React.MutableRefObject<any>;
}

function CameraRig({ targetCamera, transitionProgress, locked, defaultCameraRef, controlsRef }: CameraRigProps) {
  const { camera } = useThree();
  const startStateRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(null);

  useEffect(() => {
    if (locked) return;
    if (!targetCamera) return;
    // 记录起始状态:优先用 defaultCameraRef 作为起点,实现"从默认视角平滑过渡到本步镜头"
    const ortho = camera as THREE.OrthographicCamera;
    const fallbackTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0);
    startStateRef.current = {
      position: defaultCameraRef.current?.position.clone() ?? ortho.position.clone(),
      target: defaultCameraRef.current?.target.clone() ?? fallbackTarget,
      zoom: defaultCameraRef.current?.zoom ?? ortho.zoom,
    };
  }, [targetCamera, locked, camera, controlsRef, defaultCameraRef]);

  useFrame(() => {
    if (locked || !targetCamera || !startStateRef.current) return;
    const ortho = camera as THREE.OrthographicCamera;
    if (!ortho.isOrthographicCamera) return;

    const t = transitionProgress;
    const startPos = startStateRef.current.position;
    const startTarget = startStateRef.current.target;
    const startZoom = startStateRef.current.zoom;

    // 球面插值位置 + 线性插值 target + 线性插值 zoom
    ortho.position.lerpVectors(startPos, new THREE.Vector3(...targetCamera.position), t);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(startTarget, new THREE.Vector3(...targetCamera.target), t);
      controlsRef.current.update();
    }
    ortho.zoom = startZoom + (targetCamera.zoom - startZoom) * t;
    ortho.updateProjectionMatrix();
  });

  return null;
}

interface SceneContentProps {
  model: Model;
  visibleIds: string[];
  newIds: Set<string>;
  step: BuildStepV2 | undefined;
  orchestratorState: ReturnType<typeof useTutorialOrchestrator>['state'];
  interactive: boolean;
  defaultCameraRef: React.MutableRefObject<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>;
  controlsRef: React.MutableRefObject<any>;
}

function SceneContent({
  model,
  visibleIds,
  newIds,
  step,
  orchestratorState,
  interactive,
  defaultCameraRef,
  controlsRef,
}: SceneContentProps) {
  const { camera, size } = useThree();

  const partMap = useMemo(() => {
    const m: Record<string, Model['parts'][number]> = {};
    model.parts.forEach((p) => (m[p.id] = p));
    return m;
  }, [model]);

  const pieceMap = useMemo(() => {
    const m: Record<string, NonNullable<Model['pieces']>[number]> = {};
    model.pieces?.forEach((p) => (m[p.id] = p));
    return m;
  }, [model]);

  const transforms = useMemo(() => {
    if (!model.pieces || !model.connections) return {} as Record<string, PieceTransform>;
    const rootPiece = model.pieces.find((p) => p.isRoot) || model.pieces[0];
    const res = solveConnections({
      pieces: model.pieces,
      connections: model.connections,
      rootPieceId: rootPiece.id,
      getShapeForPiece: (pid) => {
        const piece = pieceMap[pid];
        if (!piece) return undefined;
        const part = partMap[piece.partId];
        if (!part) return undefined;
        return getShapeDef(part.shape);
      },
    });
    return res.transforms;
  }, [model, partMap, pieceMap]);

  // 自动 fit camera 到模型（首次或尺寸变化时）
  const fitCameraToModel = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;
    const worldVertices: THREE.Vector3[] = [];
    let hasVisible = false;
    for (const pid of visibleIds) {
      const tf = transforms[pid];
      if (!tf) continue;
      const piece = pieceMap[pid];
      if (!piece) continue;
      const part = partMap[piece.partId];
      if (!part) continue;
      const shape = getShapeDef(part.shape);
      if (!shape) continue;
      const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));
      const halfThick = shape.thickness / 2;
      for (const v of shape.vertices) {
        for (const z of [-halfThick, halfThick]) {
          worldVertices.push(new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix));
          hasVisible = true;
        }
      }
    }
    if (!hasVisible) return;
    const box = new THREE.Box3();
    for (const v of worldVertices) box.expandByPoint(v);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const buildMode = model.buildMode || 'solid';
    let cameraPosition: THREE.Vector3;
    if (buildMode === 'flat') {
      const maxDim = Math.max(sz.x, sz.z);
      const distance = maxDim * 1.5 + 10;
      cameraPosition = new THREE.Vector3(center.x, center.y + distance, center.z);
    } else {
      const maxDim = Math.max(sz.x, sz.y, sz.z);
      const distance = maxDim * 1.2 + 5;
      cameraPosition = new THREE.Vector3(
        center.x + distance * 0.7,
        center.y + distance * 0.7,
        center.z + distance * 0.7,
      );
    }
    ortho.position.copy(cameraPosition);
    ortho.lookAt(center);
    ortho.updateMatrixWorld(true);
    const cameraSpaceVertices = worldVertices.map((v) => v.clone().applyMatrix4(ortho.matrixWorldInverse));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of cameraSpaceVertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const projectedWidth = maxX - minX;
    const projectedHeight = maxY - minY;
    const fillRatio = 0.76;
    const frustumWidth = ortho.right - ortho.left;
    const frustumHeight = ortho.top - ortho.bottom;
    const targetZoom = Math.min(
      (frustumWidth * fillRatio) / (projectedWidth || 1),
      (frustumHeight * fillRatio) / (projectedHeight || 1),
    );
    ortho.zoom = targetZoom;
    ortho.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    defaultCameraRef.current = {
      position: ortho.position.clone(),
      target: center.clone(),
      zoom: ortho.zoom,
    };
  }, [camera, visibleIds, transforms, pieceMap, partMap, model, defaultCameraRef, controlsRef, size]);

  // 首次渲染时 fit
  useEffect(() => {
    const id = setTimeout(() => {
      if (!defaultCameraRef.current) fitCameraToModel();
    }, 50);
    return () => clearTimeout(id);
  }, [fitCameraToModel, defaultCameraRef]);

  const targetCamera = step?.camera ?? null;

  return (
    <>
      <SceneLighting shadowScale={10} shadowOpacity={0.4}>
        <CameraRig
          targetCamera={targetCamera}
          transitionProgress={orchestratorState.cameraTransitionProgress}
          locked={orchestratorState.lockedView}
          defaultCameraRef={defaultCameraRef}
          controlsRef={controlsRef}
        />

        {visibleIds.map((pid) => {
          const piece = pieceMap[pid];
          const tf = transforms[pid];
          if (!piece || !tf) return null;
          const part = partMap[piece.partId];
          if (!part) return null;
          const shape = getShapeDef(part.shape);
          if (!shape) return null;

          const isNew = newIds.has(pid);
          const offset = isNew && step
            ? getEntranceOffset(pid, orchestratorState, step)
            : { positionOffset: [0, 0, 0] as [number, number, number], rotationOffset: [0, 0, 0] as [number, number, number], opacity: 1 };

          const pieceState = orchestratorState.pieceStates[pid];
          const isHighlight = pieceState?.phase === 'highlight';

          return (
            <AnimatedPiece
              key={pid}
              shape={shape}
              transform={tf}
              color={part.color as MagnetColor}
              positionOffset={offset.positionOffset}
              rotationOffset={offset.rotationOffset}
              opacity={offset.opacity}
              highlighted={isHighlight}
              isNew={isNew}
            />
          );
        })}
      </SceneLighting>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enabled={interactive}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}

/* ----------------- 主组件 ----------------- */

export function TutorialPlayer({
  model,
  initialStep = 0,
  onStepChange,
  showSidebar = true,
  showControls = true,
  immersive = false,
  height = '100%',
}: TutorialPlayerProps) {
  const steps = model.steps as BuildStepV2[];
  const totalSteps = steps.length;

  const orch = useTutorialOrchestrator(steps, {
    initialStep,
    totalSteps,
  });

  const currentStep = orch.state.currentStep;
  const step = steps[currentStep];

  // 通知外部步骤变化
  // P1-六: 使用 ref 存储 onStepChange,避免因父组件每次 render 传入新函数引用
  // 导致 useEffect 反复触发 → setState → 重渲染 → 无限循环(Maximum update depth)
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;
  useEffect(() => {
    onStepChangeRef.current?.(currentStep);
  }, [currentStep]);

  // 计算可见零件（累积到当前步骤）
  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    for (let i = 0; i <= currentStep; i++) {
      const s = steps[i];
      if (s?.addedPieceIds) ids.push(...s.addedPieceIds);
    }
    return ids;
  }, [steps, currentStep]);

  const newIds = useMemo(() => {
    const s = steps[currentStep];
    return new Set<string>(s?.addedPieceIds ?? []);
  }, [steps, currentStep]);

  // 同步 step 到 orchestrator（用于 tick 时获取 step 数据）
  useEffect(() => {
    orch.setStep(step);
  }, [step, orch]);

  const controlsRef = useRef<any>(null);
  const defaultCameraRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3; zoom: number } | null>(null);

  // 重置视角
  const handleResetView = useCallback(() => {
    if (defaultCameraRef.current && controlsRef.current) {
      const ortho = (controlsRef.current.object as THREE.OrthographicCamera);
      const state = defaultCameraRef.current;
      ortho.position.copy(state.position);
      ortho.zoom = state.zoom;
      ortho.updateProjectionMatrix();
      controlsRef.current.target.copy(state.target);
      controlsRef.current.update();
    }
  }, []);

  // 动画期间防止连续点击
  const isAnimating = orch.state.playState === 'playing' && orch.state.elapsedInStepMs < orch.state.stepTotalMs;
  const buttonDisabled = (disabled: boolean) => disabled || isAnimating ? 'opacity-50 cursor-not-allowed' : '';

  // 当前步骤材料
  const partDetails = useMemo(() => {
    if (!step?.addedPieceIds) return [];
    const counts: Record<string, number> = {};
    for (const pid of step.addedPieceIds) {
      const piece = model.pieces?.find((p) => p.id === pid);
      if (!piece) continue;
      counts[piece.partId] = (counts[piece.partId] ?? 0) + 1;
    }
    return Object.entries(counts).map(([partId, count]) => {
      const part = model.parts.find((p) => p.id === partId);
      return part ? { ...part, stepCount: count } : null;
    }).filter(Boolean);
  }, [step, model]);

  return (
    <div className={`flex flex-col ${immersive ? 'h-full' : ''}`} style={{ height }} data-testid="tutorial-player">
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* 3D 画布区 */}
        <div className={`relative bg-gray-900 ${immersive ? 'flex-1' : 'w-full h-72 md:flex-1 md:h-auto'}`}>
          <Canvas
            orthographic
            camera={{ position: [5, 5, 5], zoom: 50, near: 0.1, far: 100 }}
            shadows="percentage"
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%' }}
            gl={{ ...defaultGLProps }}
          >
            <SceneContent
              model={model}
              visibleIds={visibleIds}
              newIds={newIds}
              step={step}
              orchestratorState={orch.state}
              interactive
              defaultCameraRef={defaultCameraRef}
              controlsRef={controlsRef}
            />
          </Canvas>

          {/* 步骤标签 */}
          {step && (
            <div className="absolute top-3 left-3 pointer-events-none">
              <span className="bg-primary-500 text-white text-xs md:text-sm font-medium px-3 py-1.5 rounded-full shadow-lg">
                {step.title}
              </span>
            </div>
          )}

          {/* 进度指示器 */}
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs md:text-sm">
            {currentStep + 1} / {totalSteps}
          </div>

          {/* 控制条 */}
          {showControls && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 bg-black/70 backdrop-blur-md text-white rounded-full px-2 md:px-3 py-1.5 md:py-2 shadow-lg">
              <button
                onClick={handleResetView}
                className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="重置视角"
                title="重置视角"
              >
                <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => orch.toggleLockView()}
                className={`p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors ${orch.state.lockedView ? 'bg-white/20' : ''}`}
                aria-label={orch.state.lockedView ? '解锁视角' : '锁定视角'}
                title={orch.state.lockedView ? '解锁视角' : '锁定视角'}
              >
                {orch.state.lockedView ? <Lock className="w-4 h-4 md:w-5 md:h-5" /> : <Unlock className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
              <div className="w-px h-5 bg-white/20 mx-0.5" />
              <button
                onClick={() => orch.prev()}
                disabled={currentStep === 0}
                className={`p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors ${buttonDisabled(currentStep === 0)}`}
                aria-label="上一步"
                title="上一步"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              {orch.state.playState === 'playing' ? (
                <button
                  onClick={() => orch.pause()}
                  className="p-2 md:p-2.5 rounded-full bg-white text-gray-900 hover:bg-white/90 transition-colors"
                  aria-label="暂停"
                  title="暂停"
                >
                  <Pause className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              ) : (
                <button
                  onClick={() => orch.play()}
                  className="p-2 md:p-2.5 rounded-full bg-white text-gray-900 hover:bg-white/90 transition-colors"
                  aria-label="播放"
                  title="播放"
                >
                  <Play className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
              <button
                onClick={() => orch.replayStep()}
                className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="重播本步"
                title="重播本步"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => orch.next()}
                disabled={currentStep === totalSteps - 1}
                className={`p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors ${buttonDisabled(currentStep === totalSteps - 1)}`}
                aria-label="下一步"
                title="下一步"
              >
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          )}
        </div>

        {/* 侧栏 */}
        {showSidebar && step && (
          <div className="md:w-[360px] lg:w-[400px] bg-white md:border-l border-gray-200 flex flex-col overflow-y-auto">
            {/* 进度时间轴 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">{step.title}</h3>
                <span className="text-xs text-gray-500">第 {currentStep + 1} / {totalSteps} 步</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300 rounded-full"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
              <div className="flex gap-1 mt-2 overflow-x-auto pb-1">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => orch.seek(idx)}
                    className={`flex-shrink-0 w-6 h-6 rounded-md text-xs font-medium transition-all ${
                      idx === currentStep
                        ? 'bg-primary-500 text-white'
                        : idx < currentStep
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 px-4 py-3 space-y-3">
              {/* 本步新增零件 */}
              {partDetails.length > 0 && (
                <div className="bg-primary-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary-500" />
                    <h4 className="font-bold text-gray-800 text-sm">本步新增零件</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {partDetails.map((part) => (
                      <div key={part!.id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1">
                        <div
                          className="w-5 h-5 rounded border border-white/60"
                          style={{ backgroundColor: part ? magnetColorMap[part.color] : '#ccc' }}
                        />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{part!.name}</p>
                          <p className="text-[10px] text-gray-500">x{part!.stepCount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作说明 */}
              <div className="bg-blue-50 rounded-xl p-3">
                <h4 className="font-bold text-gray-800 text-sm mb-1">操作说明</h4>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>

              {/* 提示文字（编排字段） */}
              {step.hint && (
                <div className="bg-purple-50 rounded-xl p-3">
                  <h4 className="font-bold text-gray-800 text-sm mb-1">提示</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.hint}</p>
                </div>
              )}

              {/* 观察重点 */}
              {step.focusPoints && step.focusPoints.length > 0 && (
                <div className="bg-teal-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    <h4 className="font-bold text-gray-800 text-sm">观察重点</h4>
                  </div>
                  <ul className="text-gray-600 text-sm leading-relaxed list-disc list-inside space-y-0.5">
                    {step.focusPoints.map((fp, i) => <li key={i}>{fp}</li>)}
                  </ul>
                </div>
              )}

              {/* 家长引导 */}
              <div className="bg-yellow-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-bold text-gray-800 text-sm">家长引导话术</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed italic">{step.parentGuide}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
