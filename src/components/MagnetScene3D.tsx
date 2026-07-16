import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Model, MagnetColor } from '../data/types';
import { magnetColorMap, magnetEdgeColorMap } from '../data/models';
import { solveConnections } from '../engine/solver';
import { getShapeDef } from '../engine/shapes';
import { ShapeDef, PieceTransform } from '../engine/types';
import { parseRgbaString } from '../utils/color';
import { insetVertices } from '../utils/geometry';

interface MagnetScene3DProps {
  model: Model;
  stepIndex: number;
  highlightNew?: boolean;
  interactive?: boolean;
}

interface DefaultCameraState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
  target: THREE.Vector3;
}

function getVisiblePieceIds(model: Model, stepIndex: number): string[] {
  const target = stepIndex === -1 ? model.steps.length - 1 : stepIndex;
  const ids: string[] = [];
  for (let i = 0; i <= target; i++) {
    const s = model.steps[i];
    if (s.addedPieceIds) {
      ids.push(...s.addedPieceIds);
    } else if (s.addedPieces) {
      ids.push(...s.addedPieces.map((p) => p.id));
    }
  }
  return ids;
}

function getNewPieceIds(model: Model, stepIndex: number): Set<string> {
  const target = stepIndex === -1 ? model.steps.length - 1 : stepIndex;
  const s = model.steps[target];
  if (s?.addedPieceIds) return new Set(s.addedPieceIds);
  if (s?.addedPieces) return new Set(s.addedPieces.map((p) => p.id));
  return new Set();
}

function getPartMap(model: Model): Record<string, Model['parts'][number]> {
  const map: Record<string, Model['parts'][number]> = {};
  model.parts.forEach((p) => (map[p.id] = p));
  return map;
}

function getPieceMap(model: Model): Record<string, NonNullable<Model['pieces']>[number]> {
  const map: Record<string, NonNullable<Model['pieces']>[number]> = {};
  model.pieces?.forEach((p) => (map[p.id] = p));
  return map;
}

const INSET = 0.06;
const CENTER_THICKNESS_FACTOR = 0.7;

interface DebugFlags {
  showCenter: boolean;
  showFrame: boolean;
  showEdges: boolean;
  showShadows: boolean;
  showHighlight: boolean;
}

const debugFlags: DebugFlags = {
  showCenter: true,
  showFrame: true,
  showEdges: true,
  showShadows: true,
  showHighlight: true,
};

(window as any).__MAGNET_DEBUG__ = debugFlags;

const frameGeomCache = new Map<string, THREE.ExtrudeGeometry>();
const centerGeomCache = new Map<string, THREE.ExtrudeGeometry>();
const frameMatCache = new Map<string, THREE.MeshStandardMaterial>();
const centerMatCache = new Map<string, THREE.MeshStandardMaterial>();
const edgeMatCache = new Map<string, THREE.LineBasicMaterial>();

function buildShapeFromVertices(vertices: { x: number; y: number }[]): THREE.Shape {
  const s = new THREE.Shape();
  if (vertices.length === 0) return s;
  s.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    s.lineTo(vertices[i].x, vertices[i].y);
  }
  s.closePath();
  return s;
}



function createFrameGeometry(shape: ShapeDef): THREE.ExtrudeGeometry {
  const cacheKey = shape.id;
  if (frameGeomCache.has(cacheKey)) {
    return frameGeomCache.get(cacheKey)!;
  }

  const outerShape = buildShapeFromVertices(shape.vertices);
  const innerVerts = insetVertices(shape.vertices, INSET);
  const innerShape = buildShapeFromVertices(innerVerts);

  outerShape.holes.push(innerShape);

  const geom = new THREE.ExtrudeGeometry(outerShape, {
    depth: shape.thickness,
    bevelEnabled: false,
  });
  geom.center();

  frameGeomCache.set(cacheKey, geom);
  return geom;
}

function createCenterGeometry(shape: ShapeDef): THREE.ExtrudeGeometry {
  const cacheKey = shape.id;
  if (centerGeomCache.has(cacheKey)) {
    return centerGeomCache.get(cacheKey)!;
  }

  const innerVerts = insetVertices(shape.vertices, INSET);
  const innerShape = buildShapeFromVertices(innerVerts);

  const centerThickness = shape.thickness * CENTER_THICKNESS_FACTOR;
  const geom = new THREE.ExtrudeGeometry(innerShape, {
    depth: centerThickness,
    bevelEnabled: false,
  });
  geom.center();

  const offset = new THREE.Vector3(0, 0, (shape.thickness - centerThickness) / 2);
  geom.translate(offset.x, offset.y, offset.z);

  centerGeomCache.set(cacheKey, geom);
  return geom;
}

function getFrameMaterial(color: MagnetColor): THREE.MeshStandardMaterial {
  if (frameMatCache.has(color)) {
    return frameMatCache.get(color)!;
  }

  const fill = parseRgbaString(magnetColorMap[color]);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fill.r * 0.85, fill.g * 0.85, fill.b * 0.85),
    roughness: 0.3,
    metalness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  frameMatCache.set(color, mat);
  return mat;
}

function getCenterMaterial(color: MagnetColor): THREE.MeshStandardMaterial {
  if (centerMatCache.has(color)) {
    return centerMatCache.get(color)!;
  }

  const fill = parseRgbaString(magnetColorMap[color]);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fill.r, fill.g, fill.b),
    transparent: fill.a < 1,
    opacity: fill.a,
    roughness: 0.3,
    metalness: 0.05,
    side: THREE.FrontSide,
    depthWrite: true,
  });

  centerMatCache.set(color, mat);
  return mat;
}

function getEdgeMaterial(color: MagnetColor): THREE.LineBasicMaterial {
  if (edgeMatCache.has(color)) {
    return edgeMatCache.get(color)!;
  }

  const edge = parseRgbaString(magnetEdgeColorMap[color]);
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(edge.r, edge.g, edge.b),
    transparent: edge.a < 1,
    opacity: edge.a,
    linewidth: 2,
  });

  edgeMatCache.set(color, mat);
  return mat;
}

function MagnetPieceMesh({
  shape,
  transform,
  color,
  isNew,
}: {
  shape: ShapeDef;
  transform: PieceTransform;
  color: MagnetColor;
  isNew: boolean;
}) {
  const frameGeom = useMemo(() => createFrameGeometry(shape), [shape]);
  const centerGeom = useMemo(() => createCenterGeometry(shape), [shape]);
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(frameGeom), [frameGeom]);

  const frameMat = useMemo(() => getFrameMaterial(color), [color]);
  const centerMat = useMemo(() => getCenterMaterial(color), [color]);
  const edgeMat = useMemo(() => getEdgeMaterial(color), [color]);

  const groupRef = useRef<THREE.Group>(null);
  const animProgress = useRef(0);
  const isAnimatingRef = useRef(isNew);
  const startPos = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    if (isNew) {
      animProgress.current = 0;
      isAnimatingRef.current = true;
      startPos.current = transform.position.clone().add(new THREE.Vector3(0, 3, 0));
      groupRef.current.position.copy(startPos.current);
      groupRef.current.quaternion.copy(transform.quaternion);
    } else {
      isAnimatingRef.current = false;
      groupRef.current.position.copy(transform.position);
      groupRef.current.quaternion.copy(transform.quaternion);
    }
  }, [transform, isNew]);

  useFrame((_, delta) => {
    if (!isAnimatingRef.current || !groupRef.current) return;
    if (animProgress.current >= 1) {
      isAnimatingRef.current = false;
      groupRef.current.position.copy(transform.position);
      return;
    }

    animProgress.current = Math.min(1, animProgress.current + delta * 3);
    const eased = 1 - Math.pow(1 - animProgress.current, 3);

    if (startPos.current) {
      groupRef.current.position.lerpVectors(startPos.current, transform.position, eased);
    }
  });

  const highlightMat = useMemo(() => {
    const fill = parseRgbaString(magnetColorMap[color]);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(fill.r, fill.g, fill.b),
      emissive: new THREE.Color(0.3, 0.3, 0.3),
      emissiveIntensity: isNew && !isAnimatingRef.current ? 0.5 : 0,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.FrontSide,
      depthWrite: true,
    });
  }, [color, isNew]);

  return (
    <group ref={groupRef}>
      {debugFlags.showFrame && (
        <mesh geometry={frameGeom} castShadow={debugFlags.showShadows} receiveShadow={debugFlags.showShadows}>
          <primitive object={frameMat} attach="material" />
        </mesh>
      )}
      {debugFlags.showCenter && (
        <mesh geometry={centerGeom}>
          <primitive object={isNew && !isAnimatingRef.current && debugFlags.showHighlight ? highlightMat : centerMat} attach="material" />
        </mesh>
      )}
      {debugFlags.showEdges && (
        <lineSegments geometry={edgesGeom}>
          <primitive object={edgeMat} attach="material" />
        </lineSegments>
      )}
    </group>
  );
}

function SceneContent({
  model,
  visibleIds,
  newIds,
  interactive,
  defaultCameraStateRef,
  resetViewRef,
}: {
  model: Model;
  visibleIds: string[];
  newIds: Set<string>;
  interactive: boolean;
  defaultCameraStateRef: React.MutableRefObject<DefaultCameraState | null>;
  resetViewRef: React.MutableRefObject<(() => void) | null>;
}) {
  const buildMode = model.buildMode || 'solid';
  const partMap = useMemo(() => getPartMap(model), [model]);
  const pieceMap = useMemo(() => getPieceMap(model), [model]);
  const controlsRef = useRef<any>(null);
  const { camera, size } = useThree();

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

  const fitCameraToModel = useCallback(() => {
    if (!(camera as THREE.OrthographicCamera).isOrthographicCamera) return;
    const ortho = camera as THREE.OrthographicCamera;

    const worldVertices: THREE.Vector3[] = [];
    let hasVisible = false;

    for (const pid of visibleIds) {
      const tf = transforms[pid];
      const piece = pieceMap[pid];
      if (!tf || !piece) continue;
      const part = partMap[piece.partId];
      if (!part) continue;
      const shape = getShapeDef(part.shape);
      if (!shape) continue;

      const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));
      const halfThick = shape.thickness / 2;
      for (const v of shape.vertices) {
        for (const z of [-halfThick, halfThick]) {
          const world = new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix);
          worldVertices.push(world);
          hasVisible = true;
        }
      }
    }

    if (!hasVisible || worldVertices.length === 0) {
      ortho.zoom = 1;
      ortho.updateProjectionMatrix();
      return;
    }

    const box = new THREE.Box3();
    for (const v of worldVertices) {
      box.expandByPoint(v);
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const preferredView = buildMode === 'flat' ? 'top' : 'threeQuarter';

    let cameraPosition: THREE.Vector3;
    if (preferredView === 'top') {
      const maxDim = Math.max(size.x, size.z);
      const distance = maxDim * 1.5 + 10;
      cameraPosition = new THREE.Vector3(center.x, center.y + distance, center.z);
    } else {
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 1.2 + 5;
      cameraPosition = new THREE.Vector3(
        center.x + distance * 0.7,
        center.y + distance * 0.7,
        center.z + distance * 0.7
      );
    }

    ortho.position.copy(cameraPosition);
    ortho.lookAt(center);
    ortho.updateMatrixWorld(true);

    const cameraSpaceVertices: THREE.Vector3[] = [];
    for (const v of worldVertices) {
      const camSpace = v.clone().applyMatrix4(ortho.matrixWorldInverse);
      cameraSpaceVertices.push(camSpace);
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
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

    const targetZoomX = (frustumWidth * fillRatio) / (projectedWidth || 1);
    const targetZoomY = (frustumHeight * fillRatio) / (projectedHeight || 1);
    const targetZoom = Math.min(targetZoomX, targetZoomY);

    ortho.zoom = targetZoom;
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
  }, [camera, visibleIds, transforms, pieceMap, partMap, buildMode, defaultCameraStateRef, size]);

  const controlsReadyRef = useRef(false);

  useEffect(() => {
    if (!controlsRef.current) {
      const interval = setInterval(() => {
        if (controlsRef.current) {
          controlsReadyRef.current = true;
          clearInterval(interval);
          fitCameraToModel();
        }
      }, 50);
      return () => clearInterval(interval);
    }
    fitCameraToModel();
  }, [fitCameraToModel]);

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
    }
  }, [camera, defaultCameraStateRef]);

  useEffect(() => {
    resetViewRef.current = resetView;
  }, [resetView]);

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

      {visibleIds.map((pid) => {
        const piece = pieceMap[pid];
        const tf = transforms[pid];
        if (!piece || !tf) return null;
        const part = partMap[piece.partId];
        if (!part) return null;
        const shape = getShapeDef(part.shape);
        if (!shape) return null;
        return (
          <MagnetPieceMesh
            key={pid}
            shape={shape}
            transform={tf}
            color={part.color as MagnetColor}
            isNew={newIds.has(pid)}
          />
        );
      })}

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />

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

export function MagnetScene3D({ model, stepIndex, highlightNew = false, interactive = true }: MagnetScene3DProps) {
  const visibleIds = useMemo(() => getVisiblePieceIds(model, stepIndex), [model, stepIndex]);
  const newIds = useMemo(() => (highlightNew ? getNewPieceIds(model, stepIndex) : new Set<string>()), [model, stepIndex, highlightNew]);
  const defaultCameraStateRef = useRef<DefaultCameraState | null>(null);

  const resetViewRef = useRef<(() => void) | null>(null);

  const resetView = () => {
    resetViewRef.current?.();
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-pink-50">
      <Canvas
        orthographic
        camera={{ position: [5, 5, 5], zoom: 50, near: 0.1, far: 100 }}
        shadows="percentage"
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
      >
        <SceneContent
          model={model}
          visibleIds={visibleIds}
          newIds={newIds}
          interactive={interactive}
          defaultCameraStateRef={defaultCameraStateRef}
          resetViewRef={resetViewRef}
        />
      </Canvas>

      {interactive && (
        <>
          <button
            data-testid="reset-view"
            aria-label="重置视角"
            onClick={resetView}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-3 text-xs text-gray-400 pointer-events-none">
            <span>拖拽可旋转视角</span>
          </div>
        </>
      )}
    </div>
  );
}
