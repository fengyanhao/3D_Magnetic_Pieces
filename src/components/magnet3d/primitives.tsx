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

/**
 * 统一的路径构建器(P1-6):支持直线和圆弧边。
 * 使用 ShapeDef.edges 而非纯 vertices,使半圆/扇形显示真实圆弧。
 * 3D 外框、中心面、缩略图、包围盒共用此函数。
 */
export function buildShapeFromDef(shape: ShapeDef): THREE.Shape {
  const s = new THREE.Shape();
  if (shape.edges.length === 0 && shape.vertices.length === 0) return s;

  // 用 edges 构建,确保曲线边用 absarc
  const edges = shape.edges;
  if (edges.length === 0) {
    // 退化:无 edges,回退到 vertices
    return buildShapeFromVertices(shape.vertices);
  }

  s.moveTo(edges[0].v0.x, edges[0].v0.y);
  for (const edge of edges) {
    if (edge.isCurved && edge.center && edge.radius != null && edge.startAngle != null && edge.endAngle != null) {
      // 圆弧:从 v0 沿圆心/半径/角度到 v1
      const a0 = edge.startAngle;
      const a1 = edge.endAngle;
      const ccw = a1 < a0; // 角度递减为逆时针(在 Three.js Shape 坐标系中)
      s.absarc(edge.center.x, edge.center.y, edge.radius, a0, a1, ccw);
    } else {
      s.lineTo(edge.v1.x, edge.v1.y);
    }
  }
  s.closePath();
  return s;
}

/**
 * 对含曲线边的形状做内缩:对纯多边形用 insetVertices;
 * 对含曲线边的形状用均匀缩放(围绕质心),避免曲线 inset 复杂性。
 */
export function buildInsetShapeFromDef(shape: ShapeDef, inset: number): THREE.Shape {
  const hasCurves = shape.edges.some((e) => e.isCurved);
  if (!hasCurves) {
    const innerVerts = insetVertices(shape.vertices, inset);
    return buildShapeFromVertices(innerVerts);
  }
  // 含曲线:均匀缩放。计算包围圆半径,按比例缩放。
  const cx = shape.vertices.reduce((s, v) => s + v.x, 0) / shape.vertices.length;
  const cy = shape.vertices.reduce((s, v) => s + v.y, 0) / shape.vertices.length;
  let maxR = 0;
  for (const v of shape.vertices) {
    const r = Math.hypot(v.x - cx, v.y - cy);
    if (r > maxR) maxR = r;
  }
  // 对曲线边也采样,确保覆盖弧顶
  for (const e of shape.edges) {
    if (e.isCurved && e.center && e.radius != null && e.startAngle != null && e.endAngle != null) {
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const a = e.startAngle + (e.endAngle - e.startAngle) * (i / steps);
        const px = e.center.x + e.radius * Math.cos(a);
        const py = e.center.y + e.radius * Math.sin(a);
        const r = Math.hypot(px - cx, py - cy);
        if (r > maxR) maxR = r;
      }
    }
  }
  const scale = maxR > 0 ? Math.max(0.01, (maxR - inset) / maxR) : 1;
  const s = new THREE.Shape();
  const edges = shape.edges;
  s.moveTo(cx + (edges[0].v0.x - cx) * scale, cy + (edges[0].v0.y - cy) * scale);
  for (const edge of edges) {
    if (edge.isCurved && edge.center && edge.radius != null && edge.startAngle != null && edge.endAngle != null) {
      const ncx = cx + (edge.center.x - cx) * scale;
      const ncy = cy + (edge.center.y - cy) * scale;
      const nr = edge.radius * scale;
      const a0 = edge.startAngle;
      const a1 = edge.endAngle;
      const ccw = a1 < a0;
      s.absarc(ncx, ncy, nr, a0, a1, ccw);
    } else {
      s.lineTo(cx + (edge.v1.x - cx) * scale, cy + (edge.v1.y - cy) * scale);
    }
  }
  s.closePath();
  return s;
}

/**
 * 采样形状轮廓(含曲线)为多边形顶点,用于包围盒/尺寸计算。
 */
export function sampleShapeOutline(shape: ShapeDef, arcSegments = 24): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (const edge of shape.edges) {
    if (edge.isCurved && edge.center && edge.radius != null && edge.startAngle != null && edge.endAngle != null) {
      const steps = arcSegments;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const a = edge.startAngle + (edge.endAngle - edge.startAngle) * t;
        pts.push({ x: edge.center.x + edge.radius * Math.cos(a), y: edge.center.y + edge.radius * Math.sin(a) });
      }
    } else {
      pts.push({ x: edge.v0.x, y: edge.v0.y });
    }
  }
  return pts;
}

export function createFrameGeometry(shape: ShapeDef): THREE.ExtrudeGeometry {
  const cacheKey = shape.id;
  if (frameGeomCache.has(cacheKey)) {
    return frameGeomCache.get(cacheKey)!;
  }

  const outerShape = buildShapeFromDef(shape);
  const innerShape = buildInsetShapeFromDef(shape, INSET);

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

  const innerShape = buildInsetShapeFromDef(shape, INSET);

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
  opacity?: number;
  onClick?: (e: any) => void;
  onPointerDown?: (e: any) => void;
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
  opacity = 1,
  onClick,
  onPointerDown,
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
      transparent: dimmed || opacity < 1,
      opacity: dimmed ? 0.35 : opacity,
    });
  }, [color, isNew, selected, highlighted, dimmed, opacity]);

  const useHighlight = selected || highlighted || (isNew && !isAnimatingRef.current && debugFlags.showHighlight);

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerDown={onPointerDown}
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
