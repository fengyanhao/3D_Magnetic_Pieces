import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MagnetColor } from '../../data/types';
import { magnetColorMap, magnetEdgeColorMap } from '../../data/models';
import { ShapeDef, PieceTransform } from '../../engine/types';
import { parseRgbaString } from '../../utils/color';
import { insetVertices } from '../../utils/geometry';

/**
 * 共享的磁力片 3D 渲染原语。
 * 供用户端 MagnetScene3D 和编辑器 EditorCanvas 共同复用,
 * 避免建立第二套几何/材质系统。
 *
 * 所有 geometry / material 都做了按 (shapeId / color) 缓存,
 * 不会在每次渲染时重建,符合性能要求。
 */

export const INSET = 0.06;
export const CENTER_THICKNESS_FACTOR = 0.7;

export interface DebugFlags {
  showCenter: boolean;
  showFrame: boolean;
  showEdges: boolean;
  showShadows: boolean;
  showHighlight: boolean;
}

export const debugFlags: DebugFlags = {
  showCenter: true,
  showFrame: true,
  showEdges: true,
  showShadows: true,
  showHighlight: true,
};

if (typeof window !== 'undefined') {
  (window as any).__MAGNET_DEBUG__ = debugFlags;
}

const frameGeomCache = new Map<string, THREE.ExtrudeGeometry>();
const centerGeomCache = new Map<string, THREE.ExtrudeGeometry>();
const frameMatCache = new Map<string, THREE.MeshStandardMaterial>();
const centerMatCache = new Map<string, THREE.MeshStandardMaterial>();
const edgeMatCache = new Map<string, THREE.LineBasicMaterial>();

export function buildShapeFromVertices(vertices: { x: number; y: number }[]): THREE.Shape {
  const s = new THREE.Shape();
  if (vertices.length === 0) return s;
  s.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    s.lineTo(vertices[i].x, vertices[i].y);
  }
  s.closePath();
  return s;
}

export function createFrameGeometry(shape: ShapeDef): THREE.ExtrudeGeometry {
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

export function createCenterGeometry(shape: ShapeDef): THREE.ExtrudeGeometry {
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

export function getFrameMaterial(color: MagnetColor): THREE.MeshStandardMaterial {
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

export function getCenterMaterial(color: MagnetColor): THREE.MeshStandardMaterial {
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

export function getEdgeMaterial(color: MagnetColor): THREE.LineBasicMaterial {
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

export interface MagnetPieceMeshProps {
  shape: ShapeDef;
  transform: PieceTransform;
  color: MagnetColor;
  isNew?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  onClick?: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
}

/**
 * 单块磁力片渲染:边框 + 中心 + 边线,带新增动画与选中高亮。
 * 用户端与编辑器共用此组件。
 */
export function MagnetPieceMesh({
  shape,
  transform,
  color,
  isNew = false,
  selected = false,
  highlighted = false,
  dimmed = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: MagnetPieceMeshProps) {
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
    const emissiveIntensity = selected ? 0.6 : highlighted ? 0.4 : isNew && !isAnimatingRef.current ? 0.5 : 0;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(fill.r, fill.g, fill.b),
      emissive: new THREE.Color(0.3, 0.3, 0.3),
      emissiveIntensity,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.FrontSide,
      depthWrite: true,
      transparent: dimmed,
      opacity: dimmed ? 0.35 : 1,
    });
  }, [color, isNew, selected, highlighted, dimmed]);

  const useHighlight = selected || highlighted || (isNew && !isAnimatingRef.current && debugFlags.showHighlight);

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {debugFlags.showFrame && (
        <mesh geometry={frameGeom} castShadow={debugFlags.showShadows} receiveShadow={debugFlags.showShadows}>
          <primitive object={frameMat} attach="material" />
        </mesh>
      )}
      {debugFlags.showCenter && (
        <mesh geometry={centerGeom}>
          <primitive object={useHighlight ? highlightMat : centerMat} attach="material" />
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

/** 释放所有缓存的 Three.js 资源(仅在模块卸载/测试清理时调用)。 */
export function disposeMagnet3DCaches() {
  for (const g of frameGeomCache.values()) g.dispose();
  for (const g of centerGeomCache.values()) g.dispose();
  for (const m of frameMatCache.values()) m.dispose();
  for (const m of centerMatCache.values()) m.dispose();
  for (const m of edgeMatCache.values()) m.dispose();
  frameGeomCache.clear();
  centerGeomCache.clear();
  frameMatCache.clear();
  centerMatCache.clear();
  edgeMatCache.clear();
}
