import * as THREE from 'three';
import { ShapeDef } from '../../engine/types';

/**
 * 共享的相机拟合算法。
 * 供 MagnetScene3D 和 EditorCanvas 复用,避免两套不同的 zoom 计算。
 *
 * 核心思路:把世界包围盒顶点变换到相机空间,根据视锥宽高计算 zoom,
 * 使模型在画布中占 fillRatio 比例(默认 76%)。
 */

export interface FitInput {
  /** 世界空间顶点(已经过 piece transform 变换) */
  worldVertices: THREE.Vector3[];
  /** 正交相机 */
  camera: THREE.OrthographicCamera;
  /** OrbitControls 实例(可选,用于同步 target) */
  controls?: any;
  /** 填充比例(0-1),默认 0.76 */
  fillRatio?: number;
  /** 视角偏好:'threeQuarter' | 'top' */
  preferredView?: 'threeQuarter' | 'top';
  /** 画布尺寸(用于修正 frustum) */
  size?: { width: number; height: number };
}

export interface FitResult {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
  target: THREE.Vector3;
}

/**
 * 把相机移动到能完整看到给定世界顶点的位置。
 * 返回新的相机状态(position/quaternion/zoom/target)。
 */
export function computeFitCamera(input: FitInput): FitResult | null {
  const { worldVertices, camera, fillRatio = 0.76, preferredView = 'threeQuarter', size } = input;
  if (worldVertices.length === 0) return null;

  const box = new THREE.Box3();
  for (const v of worldVertices) box.expandByPoint(v);
  const center = box.getCenter(new THREE.Vector3());
  const boxSize = box.getSize(new THREE.Vector3());

  let cameraPosition: THREE.Vector3;
  if (preferredView === 'top') {
    const maxDim = Math.max(boxSize.x, boxSize.z);
    const distance = maxDim * 1.5 + 10;
    cameraPosition = new THREE.Vector3(center.x, center.y + distance, center.z);
  } else {
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
    const distance = maxDim * 1.2 + 5;
    cameraPosition = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    );
  }

  // 临时设置相机位置以计算 matrixWorldInverse
  camera.position.copy(cameraPosition);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  // 把世界顶点变换到相机空间,求投影后的包围盒
  const camSpaceVerts = worldVertices.map((v) => v.clone().applyMatrix4(camera.matrixWorldInverse));
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const v of camSpaceVerts) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const projectedWidth = maxX - minX;
  const projectedHeight = maxY - minY;

  // 修正 frustum(如果传了 size,按宽高比修正)
  let frustumWidth = camera.right - camera.left;
  let frustumHeight = camera.top - camera.bottom;
  if (size && size.width > 0 && size.height > 0) {
    const aspect = size.width / size.height;
    const baseFrustum = frustumHeight;
    frustumHeight = baseFrustum;
    frustumWidth = baseFrustum * aspect;
  }

  const targetZoomX = (frustumWidth * fillRatio) / (projectedWidth || 1);
  const targetZoomY = (frustumHeight * fillRatio) / (projectedHeight || 1);
  const targetZoom = Math.min(targetZoomX, targetZoomY);

  return {
    position: cameraPosition.clone(),
    quaternion: camera.quaternion.clone(),
    zoom: targetZoom,
    target: center.clone(),
  };
}

/** 计算单个零件的世界顶点(用于聚焦选中)。 */
export function pieceWorldVertices(
  shape: ShapeDef,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
): THREE.Vector3[] {
  const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  const halfThick = shape.thickness / 2;
  const out: THREE.Vector3[] = [];
  for (const v of shape.vertices) {
    for (const z of [-halfThick, halfThick]) {
      out.push(new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix));
    }
  }
  // 对曲边形状,采样弧线点加入包围盒计算
  for (const edge of shape.edges) {
    if (edge.isCurved && edge.center && edge.radius !== undefined) {
      const matrix2 = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
      const steps = 8;
      for (let i = 0; i <= steps; i++) {
        const t = edge.startAngle! + (edge.endAngle! - edge.startAngle!) * (i / steps);
        const x = edge.center.x + edge.radius * Math.cos(t);
        const y = edge.center.y + edge.radius * Math.sin(t);
        out.push(new THREE.Vector3(x, y, 0).applyMatrix4(matrix2));
      }
    }
  }
  return out;
}

/** 应用 FitResult 到正交相机和 OrbitControls。 */
export function applyFitResult(camera: THREE.OrthographicCamera, result: FitResult, controls?: any) {
  camera.position.copy(result.position);
  camera.quaternion.copy(result.quaternion);
  camera.zoom = result.zoom;
  camera.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(result.target);
    controls.update();
  }
}
