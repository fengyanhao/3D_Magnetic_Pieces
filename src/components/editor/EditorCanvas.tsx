import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Line } from '@react-three/drei';
import * as THREE from 'three';
import { MagnetColor } from '../../data/types';
import { getShapeDef } from '../../engine/shapes';
import { Connection } from '../../engine/types';
import { MagnetPieceMesh } from '../magnet3d/primitives';
import { EditorProject } from '../../editor/types';
import { getDisplayTransforms, findCompatibleTargets, buildPortUsage } from '../../editor/snap';
import type { Selection } from './EditorWorkspace';

interface Props {
  project: EditorProject;
  selection: Selection;
  onSelectPiece: (id: string) => void;
  onSelectConnection: (index: number) => void;
  onClearSelection: () => void;
  focusRequest: { pieceId: string; ts: number } | null;
  onMovePiece: (pieceId: string, tf: { position: [number, number, number]; quaternion: [number, number, number, number] }) => void;
  onCreateConnection: (conn: Connection) => void;
}

interface DefaultCameraState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
  target: THREE.Vector3;
}

/**
 * 拖拽控制器:在 Y=0 水平面投影鼠标位置,实时更新选中零件位置。
 * 拖拽期间禁用 OrbitControls,松开后恢复。
 */
function DragController({
  transforms,
  onMovePiece,
  draggingRef,
  controlsRef,
}: {
  transforms: Record<string, { position: THREE.Vector3; quaternion: THREE.Quaternion }>;
  onMovePiece: (pieceId: string, tf: { position: [number, number, number]; quaternion: [number, number, number, number] }) => void;
  draggingRef: React.MutableRefObject<{ pieceId: string; offset: THREE.Vector3 } | null>;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera, pointer } = useThree();
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycasterRef = useRef(new THREE.Raycaster());
  const lastDragPosRef = useRef<THREE.Vector3 | null>(null);

  // 拖拽中:每帧把鼠标投影到拖拽平面,更新位置
  useFrame(() => {
    const drag = draggingRef.current;
    if (!drag) return;
    const tf = transforms[drag.pieceId];
    if (!tf) return;

    raycasterRef.current.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycasterRef.current.ray.intersectPlane(planeRef.current, hit)) return;

    // 拖拽平面在零件当前 Y 高度(保持 Y 不变,只在 XZ 平面移动)
    planeRef.current.constant = -tf.position.y;

    if (!lastDragPosRef.current) {
      lastDragPosRef.current = hit.clone();
      return;
    }
    // 计算位移增量,避免瞬移
    const delta = hit.clone().sub(lastDragPosRef.current);
    lastDragPosRef.current = hit.clone();

    // 应用偏移
    const newPos = tf.position.clone().add(delta);
    onMovePiece(drag.pieceId, {
      position: [newPos.x, newPos.y, newPos.z],
      quaternion: [tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w],
    });
  });

  // 监听指针抬起
  useEffect(() => {
    const onPointerUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        lastDragPosRef.current = null;
        if (controlsRef.current) controlsRef.current.enabled = true;
        document.body.style.cursor = 'grab';
      }
    };
    window.addEventListener('pointerup', onPointerUp);
    return () => window.removeEventListener('pointerup', onPointerUp);
  }, [draggingRef, controlsRef]);

  return null;
}

function SceneContent({
  project, selection, onSelectPiece, focusRequest, onMovePiece,
  defaultCameraStateRef, resetViewRef,
}: {
  project: EditorProject;
  selection: Selection;
  onSelectPiece: (id: string) => void;
  onClearSelection: () => void;
  focusRequest: { pieceId: string; ts: number } | null;
  onMovePiece: (pieceId: string, tf: { position: [number, number, number]; quaternion: [number, number, number, number] }) => void;
  defaultCameraStateRef: React.MutableRefObject<DefaultCameraState | null>;
  resetViewRef: React.MutableRefObject<(() => void) | null>;
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

  const transforms = useMemo(() => getDisplayTransforms(project), [project]);
  const portUsage = useMemo(() => buildPortUsage(project), [project.connections]);

  // 兼容目标端口(选中 piece 时高亮)
  const compatibleTargets = useMemo(() => {
    if (selection.kind !== 'piece') return new Set<string>();
    const set = new Set<string>();
    for (const t of findCompatibleTargets({ pieceId: selection.id, portId: '' }, project)) {
      set.add(`${t.pieceId}:${t.portId}`);
    }
    return set;
  }, [selection, project]);

  const controlsRef = useRef<any>(null);
  const { camera, size } = useThree();

  // 拖拽状态
  const draggingRef = useRef<{ pieceId: string; offset: THREE.Vector3 } | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);

  const fitCameraToPiece = useCallback((pieceId: string) => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;
    const tf = transforms[pieceId];
    const piece = pieceMap[pieceId];
    if (!tf || !piece) return;
    const part = partMap[piece.partId];
    if (!part) return;
    const shape = getShapeDef(part.shape);
    if (!shape) return;

    const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));
    const box = new THREE.Box3();
    const halfThick = shape.thickness / 2;
    for (const v of shape.vertices) {
      for (const z of [-halfThick, halfThick]) {
        box.expandByPoint(new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix));
      }
    }
    const center = box.getCenter(new THREE.Vector3());
    const dim = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(dim.x, dim.y, dim.z);
    const distance = maxDim * 1.5 + 4;
    ortho.position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7);
    ortho.lookAt(center);
    ortho.zoom = 50 / (maxDim + 1);
    ortho.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [camera, transforms, pieceMap, partMap]);

  const fitCameraToModel = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;
    if (project.pieces.length === 0) return;
    const worldVerts: THREE.Vector3[] = [];
    for (const p of project.pieces) {
      const tf = transforms[p.id];
      const piece = pieceMap[p.id];
      if (!tf || !piece) continue;
      const part = partMap[piece.partId];
      if (!part) continue;
      const shape = getShapeDef(part.shape);
      if (!shape) continue;
      const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));
      const halfThick = shape.thickness / 2;
      for (const v of shape.vertices) {
        for (const z of [-halfThick, halfThick]) {
          worldVerts.push(new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix));
        }
      }
    }
    if (worldVerts.length === 0) return;
    const box = new THREE.Box3();
    worldVerts.forEach((v) => box.expandByPoint(v));
    const center = box.getCenter(new THREE.Vector3());
    const dim = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(dim.x, dim.y, dim.z);
    const distance = maxDim * 1.2 + 5;
    ortho.position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7);
    ortho.lookAt(center);
    ortho.zoom = 50 / (maxDim + 2);
    ortho.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
    defaultCameraStateRef.current = {
      position: ortho.position.clone(),
      quaternion: ortho.quaternion.clone(),
      zoom: ortho.zoom,
      target: center.clone(),
    };
  }, [camera, project.pieces, transforms, pieceMap, partMap, defaultCameraStateRef, size]);

  // 初始 + 模型变化时自动取景
  useEffect(() => {
    const t = setTimeout(() => fitCameraToModel(), 50);
    return () => clearTimeout(t);
  }, [fitCameraToModel]);

  // 聚焦请求
  useEffect(() => {
    if (focusRequest) fitCameraToPiece(focusRequest.pieceId);
  }, [focusRequest, fitCameraToPiece]);

  const resetView = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;
    const state = defaultCameraStateRef.current;
    if (state) {
      ortho.position.copy(state.position);
      ortho.quaternion.copy(state.quaternion);
      ortho.zoom = state.zoom;
      ortho.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.copy(state.target);
        controlsRef.current.update();
      }
    } else {
      fitCameraToModel();
    }
  }, [camera, defaultCameraStateRef, fitCameraToModel]);

  useEffect(() => {
    resetViewRef.current = resetView;
  }, [resetView, resetViewRef]);

  // 键盘移动/旋转选中零件(WASDQE 移动 / RTFGVB 旋转)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selection.kind !== 'piece') return;
      const tf = transforms[selection.id];
      if (!tf) return;
      const step = e.shiftKey ? 1.0 : 0.2;
      const rotStep = e.shiftKey ? 45 : 15; // 度
      const pos = [tf.position.x, tf.position.y, tf.position.z] as [number, number, number];
      const q = new THREE.Quaternion(tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w);
      let moved = false;
      let rotated = false;
      const key = e.key.toLowerCase();
      switch (key) {
        // 移动
        case 'a': pos[0] -= step; moved = true; break;
        case 'd': pos[0] += step; moved = true; break;
        case 'w': pos[2] -= step; moved = true; break;
        case 's': pos[2] += step; moved = true; break;
        case 'q': pos[1] += step; moved = true; break;
        case 'e': pos[1] -= step; moved = true; break;
        // 旋转(绕世界轴)
        case 'r': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 't': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
        case 'f': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 'g': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
        case 'v': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(rotStep))); rotated = true; break;
        case 'b': q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(-rotStep))); rotated = true; break;
      }
      if (moved || rotated) {
        e.preventDefault();
        onMovePiece(selection.id, {
          position: pos,
          quaternion: [q.x, q.y, q.z, q.w],
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, transforms, onMovePiece]);

  // 启动拖拽:选中零件时按住鼠标左键拖动
  const handlePiecePointerDown = useCallback((pieceId: string, e: any) => {
    e.stopPropagation();
    onSelectPiece(pieceId);
    const tf = transforms[pieceId];
    if (!tf) return;
    // 记录拖拽起点(鼠标投影到 Y=0 平面,计算与零件的偏移)
    draggingRef.current = {
      pieceId,
      offset: new THREE.Vector3(0, tf.position.y, 0), // 仅记录 Y,拖拽时保持
    };
    lastDragPosRefHolder.current = null;
    if (controlsRef.current) controlsRef.current.enabled = false;
    document.body.style.cursor = 'grabbing';
  }, [transforms, onSelectPiece]);

  const lastDragPosRefHolder = useRef<THREE.Vector3 | null>(null);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 5, -3]} intensity={0.4} />

      {/* 网格地面 */}
      <gridHelper args={[20, 20, '#cbd5e1', '#e2e8f0']} position={[0, -0.01, 0]} />

      {/* 拖拽控制器 */}
      <DragController
        transforms={transforms}
        onMovePiece={onMovePiece}
        draggingRef={draggingRef}
        controlsRef={controlsRef}
      />

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
        return (
          <MagnetPieceMesh
            key={piece.id}
            shape={shape}
            transform={tf}
            color={part.color as MagnetColor}
            selected={isSelected}
            highlighted={isHovered && !isSelected}
            dimmed={isDimmed}
            onClick={(e: any) => {
              e.stopPropagation();
              onSelectPiece(piece.id);
            }}
            onPointerDown={(e: any) => handlePiecePointerDown(piece.id, e)}
            onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = 'grab'; setHoveredPiece(piece.id); }}
            onPointerOut={() => { document.body.style.cursor = 'default'; setHoveredPiece(null); }}
          />
        );
      })}

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

      {/* 连接线可视化(细蓝线) */}
      {project.connections.map((conn, idx) => {
        const tfA = transforms[conn.pieceA];
        const tfB = transforms[conn.pieceB];
        if (!tfA || !tfB) return null;
        const isSelected = selection.kind === 'connection' && selection.index === idx;
        return (
          <Line
            key={`conn-${idx}`}
            points={[tfA.position, tfB.position]}
            color={isSelected ? '#f59e0b' : '#94a3b8'}
            lineWidth={isSelected ? 2 : 1}
            dashed={!isSelected}
          />
        );
      })}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.3} scale={20} blur={2} far={4} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan
        minDistance={2}
        maxDistance={30}
      />
    </>
  );
}

export function EditorCanvas({
  project, selection, onSelectPiece, onSelectConnection: _onSelectConnection, onClearSelection, focusRequest, onMovePiece, onCreateConnection: _onCreateConnection,
}: Props) {
  const defaultCameraStateRef = useRef<DefaultCameraState | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);

  const resetView = () => resetViewRef.current?.();

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Canvas
        orthographic
        camera={{ position: [5, 5, 5], zoom: 50, near: 0.1, far: 100 }}
        shadows="percentage"
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        onPointerMissed={onClearSelection}
      >
        <SceneContent
          project={project}
          selection={selection}
          onSelectPiece={onSelectPiece}
          onClearSelection={onClearSelection}
          focusRequest={focusRequest}
          onMovePiece={onMovePiece}
          defaultCameraStateRef={defaultCameraStateRef}
          resetViewRef={resetViewRef}
        />
      </Canvas>

      <button
        onClick={resetView}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm"
        title="重置视角"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <div className="absolute bottom-3 left-3 text-xs text-gray-500 pointer-events-none space-y-0.5">
        <div>左键拖零件:移动 · 右键拖:旋转视角 · 滚轮:缩放</div>
        <div>WASDQE:移动 · RTFGVB:旋转(Shift 大步)</div>
      </div>
    </div>
  );
}
