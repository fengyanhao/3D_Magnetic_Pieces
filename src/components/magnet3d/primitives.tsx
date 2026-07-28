import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
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
 *
 * P2 视觉修复:
 * - 透明中心板使用 depthWrite:false + renderOrder 排序,消除闪烁/拉丝
 * - 外框与中心板之间用 polygonOffset 消除共面 z-fighting
 * - 边线改用 LineSegments2 + LineMaterial(支持真实线宽),替换 LineBasicMaterial
 * - 中心板参与阴影投射/接收
 * - 增加边缘磁铁条细节(小圆柱体)
 */

export const INSET = 0.06;
export const CENTER_THICKNESS_FACTOR = 0.7;
/** P2-3: 中心板与外框之间的 Z 轴偏移,消除共面 z-fighting */
export const CENTER_Z_OFFSET = 0.002;
/** P2-5: 边缘磁铁条半径 */
export const MAGNET_STRIP_RADIUS = 0.04;
/** P2-5: 边缘磁铁条高度 */
export const MAGNET_STRIP_HEIGHT = 0.08;

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
const edgeLineGeomCache = new Map<string, LineSegmentsGeometry>();
const edgeLineMatCache = new Map<string, LineMaterial>();
/** P2-5: 边缘磁铁条几何缓存(按 shapeId) */
const magnetStripGeomCache = new Map<string, THREE.InstancedBufferGeometry>();

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

  // P2-3: 增加 Z 轴偏移,使中心板与外框不共面,消除 z-fighting
  const offset = (shape.thickness - centerThickness) / 2 + CENTER_Z_OFFSET;
  geom.translate(0, 0, offset);

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
    roughness: 0.35,
    metalness: 0.25,
    side: THREE.DoubleSide,
    depthWrite: true,
    // P2-3: polygonOffset 使外框在深度比较中优先,消除与中心板的 z-fighting
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  frameMatCache.set(color, mat);
  return mat;
}

/**
 * P2-2: 透明中心板材质
 *
 * 关键修复:
 * - transparent:true 时 depthWrite:false,避免半透明物体写入深度缓冲导致后方物体被错误剔除
 * - renderOrder=1 使透明中心板在不透明外框之后渲染
 * - polygonOffset 使中心板在深度比较中退后,与外框不冲突
 *
 * 已验证方案:depthWrite:false + renderOrder 排序
 * 替代方案(alphaHash/抖动透明)未采用,因为磁力片中心板需要真实的半透明效果
 */
export function getCenterMaterial(color: MagnetColor): THREE.MeshStandardMaterial {
  if (centerMatCache.has(color)) {
    return centerMatCache.get(color)!;
  }

  const fill = parseRgbaString(magnetColorMap[color]);
  const isTransparent = fill.a < 1;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(fill.r, fill.g, fill.b),
    transparent: isTransparent,
    opacity: fill.a,
    roughness: 0.2,
    metalness: 0.05,
    side: THREE.DoubleSide,
    // P2-2: 透明时关闭 depthWrite,依赖 renderOrder 排序
    depthWrite: !isTransparent,
    // P2-3: polygonOffset 使中心板深度退后
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  centerMatCache.set(color, mat);
  return mat;
}

/**
 * P2-4: 使用 LineMaterial (Line2 体系) 替换 LineBasicMaterial
 *
 * LineBasicMaterial.linewidth 在 WebGL 中被强制为 1px,无法显示粗边。
 * LineMaterial 支持以像素为单位的真实线宽,且支持 resolution 自适应。
 */
export function getEdgeLineMaterial(color: MagnetColor, resolution: { width: number; height: number }): LineMaterial {
  if (edgeLineMatCache.has(color)) {
    const mat = edgeLineMatCache.get(color)!;
    mat.resolution.set(resolution.width, resolution.height);
    return mat;
  }

  const edge = parseRgbaString(magnetEdgeColorMap[color]);
  const mat = new LineMaterial({
    color: new THREE.Color(edge.r, edge.g, edge.b).getHex(),
    transparent: edge.a < 1,
    opacity: edge.a,
    linewidth: 2, // 像素单位,LineMaterial 支持真实线宽
    worldUnits: false,
    dashed: false,
  });
  mat.resolution.set(resolution.width, resolution.height);

  edgeLineMatCache.set(color, mat);
  return mat;
}

/**
 * P2-4: 把 EdgesGeometry 转为 LineSegmentsGeometry 供 LineSegments2 使用
 */
export function createEdgeLineGeometry(shape: ShapeDef, frameGeom: THREE.ExtrudeGeometry): LineSegmentsGeometry {
  const cacheKey = shape.id;
  if (edgeLineGeomCache.has(cacheKey)) {
    return edgeLineGeomCache.get(cacheKey)!;
  }

  const edgesGeom = new THREE.EdgesGeometry(frameGeom);
  const positions = edgesGeom.attributes.position.array as Float32Array;
  const lineGeom = new LineSegmentsGeometry();
  lineGeom.setPositions(Array.from(positions));
  edgesGeom.dispose();

  edgeLineGeomCache.set(cacheKey, lineGeom);
  return lineGeom;
}

/**
 * P2-5: 创建边缘磁铁条几何(沿每条边的中点放置小圆柱)
 */
export function createMagnetStripGeometry(shape: ShapeDef): THREE.InstancedBufferGeometry | null {
  const cacheKey = shape.id;
  if (magnetStripGeomCache.has(cacheKey)) {
    return magnetStripGeomCache.get(cacheKey)!;
  }

  // 收集每条边的中点(只取直线边的中点,曲线边跳过)
  const midpoints: { x: number; y: number; angle: number }[] = [];
  for (const edge of shape.edges) {
    if (edge.isCurved) continue;
    const mx = (edge.v0.x + edge.v1.x) / 2;
    const my = (edge.v0.y + edge.v1.y) / 2;
    const angle = Math.atan2(edge.v1.y - edge.v0.y, edge.v1.x - edge.v0.x);
    midpoints.push({ x: mx, y: my, angle });
  }

  if (midpoints.length === 0) {
    return null;
  }

  // 创建一个小圆柱几何,沿 Z 轴方向
  const cylGeom = new THREE.CylinderGeometry(MAGNET_STRIP_RADIUS, MAGNET_STRIP_RADIUS, MAGNET_STRIP_HEIGHT, 8, 1);
  cylGeom.rotateX(Math.PI / 2); // 把圆柱从 Y 轴方向旋转到 Z 轴方向
  const instancedGeom = new THREE.InstancedBufferGeometry();
  instancedGeom.index = cylGeom.index;
  instancedGeom.attributes = cylGeom.attributes;

  // 设置实例矩阵(使用 setAttribute,InstancedBufferGeometry 通过 attribute 名 'instanceMatrix' 识别)
  const matrices: number[] = [];
  const dummy = new THREE.Object3D();
  for (const mp of midpoints) {
    dummy.position.set(mp.x, mp.y, shape.thickness / 2 + MAGNET_STRIP_HEIGHT / 2);
    dummy.rotation.set(0, 0, mp.angle);
    dummy.updateMatrix();
    matrices.push(...dummy.matrix.elements);
  }
  instancedGeom.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(new Float32Array(matrices), 16));
  instancedGeom.instanceCount = midpoints.length;

  magnetStripGeomCache.set(cacheKey, instancedGeom);
  return instancedGeom;
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
 * 单块磁力片渲染:边框 + 中心 + 边线 + 磁铁条,带新增动画与选中高亮。
 * 用户端与编辑器共用此组件。
 *
 * P2 修复:
 * - 透明中心板 depthWrite:false + renderOrder=1,消除闪烁/拉丝
 * - 高亮材质在透明时也 depthWrite:false
 * - 中心板参与阴影投射/接收
 * - 边线使用 LineSegments2(真实线宽)
 * - 增加边缘磁铁条细节
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

  const frameMat = useMemo(() => getFrameMaterial(color), [color]);
  const centerMat = useMemo(() => getCenterMaterial(color), [color]);

  // P2-4: 使用 LineSegments2 + LineMaterial 替换 LineBasicMaterial
  const { size } = useThree();
  const edgeLineGeom = useMemo(() => createEdgeLineGeometry(shape, frameGeom), [shape, frameGeom]);
  const edgeLineMat = useMemo(() => {
    return getEdgeLineMaterial(color, { width: size.width || 800, height: size.height || 600 });
  }, [color, size.width, size.height]);

  // P2-4: memoize LineSegments2 实例,避免每次渲染重建
  const lineSegments2 = useMemo(() => {
    const ls = new LineSegments2(edgeLineGeom, edgeLineMat);
    ls.computeLineDistances();
    return ls;
  }, [edgeLineGeom, edgeLineMat]);

  // P2-4: canvas 尺寸变化时更新 LineMaterial resolution
  useEffect(() => {
    edgeLineMat.resolution.set(size.width, size.height);
  }, [edgeLineMat, size.width, size.height]);

  // P2-5: 边缘磁铁条几何
  const magnetStripGeom = useMemo(() => createMagnetStripGeometry(shape), [shape]);
  const magnetStripMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4, 0.4, 0.45),
      roughness: 0.6,
      metalness: 0.7,
    });
  }, []);

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

  // P2-2: highlightMat 复用单一实例,透明时 depthWrite:false
  const highlightMat = useMemo(() => {
    const fill = parseRgbaString(magnetColorMap[color]);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(fill.r, fill.g, fill.b),
      emissive: new THREE.Color(0.3, 0.3, 0.3),
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: true,
      transparent: false,
      opacity: 1,
      // P2-3: polygonOffset 与中心板一致
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, [color]);

  // P2-2: 切换状态时调整属性,透明时关闭 depthWrite
  useEffect(() => {
    const isAnim = isAnimatingRef.current;
    highlightMat.emissiveIntensity = selected ? 0.6 : highlighted ? 0.4 : isNew && !isAnim ? 0.5 : 0;
    const isTransparent = dimmed || opacity < 1;
    highlightMat.transparent = isTransparent;
    highlightMat.depthWrite = !isTransparent; // P2-2: 透明时关闭 depthWrite
    highlightMat.opacity = dimmed ? 0.35 : opacity;
    highlightMat.needsUpdate = true;
  }, [highlightMat, selected, highlighted, dimmed, opacity, isNew]);

  useEffect(() => {
    return () => {
      highlightMat.dispose();
      magnetStripMat.dispose();
      lineSegments2.geometry.dispose();
    };
  }, [highlightMat, magnetStripMat, lineSegments2]);

  const useHighlight = selected || highlighted || (isNew && !isAnimatingRef.current && debugFlags.showHighlight);
  const isCenterTransparent = centerMat.transparent;

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {debugFlags.showFrame && (
        <mesh
          geometry={frameGeom}
          castShadow={debugFlags.showShadows}
          receiveShadow={debugFlags.showShadows}
          renderOrder={0}
        >
          <primitive object={frameMat} attach="material" />
        </mesh>
      )}
      {debugFlags.showCenter && (
        <mesh
          geometry={centerGeom}
          // P2: 中心板也参与阴影
          castShadow={debugFlags.showShadows}
          receiveShadow={debugFlags.showShadows}
          // P2-2: 透明物体 renderOrder=1,在不透明物体之后渲染
          renderOrder={isCenterTransparent ? 1 : 0}
        >
          <primitive object={useHighlight ? highlightMat : centerMat} attach="material" />
        </mesh>
      )}
      {debugFlags.showEdges && (
        <primitive
          object={lineSegments2}
          renderOrder={2}
        />
      )}
      {/* P2-5: 边缘磁铁条 */}
      {debugFlags.showFrame && magnetStripGeom && (
        <mesh geometry={magnetStripGeom} castShadow={debugFlags.showShadows}>
          <primitive object={magnetStripMat} attach="material" />
        </mesh>
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
  for (const g of edgeLineGeomCache.values()) g.dispose();
  for (const m of edgeLineMatCache.values()) m.dispose();
  for (const g of magnetStripGeomCache.values()) g.dispose();
  frameGeomCache.clear();
  centerGeomCache.clear();
  frameMatCache.clear();
  centerMatCache.clear();
  edgeLineGeomCache.clear();
  edgeLineMatCache.clear();
  magnetStripGeomCache.clear();
}
