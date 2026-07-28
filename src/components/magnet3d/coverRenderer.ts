/**
 * P2: 封面渲染器 — 使用独立 Three.js 渲染器生成真实 3D 截图。
 *
 * 工作原理:
 * 1. 创建一个离屏的 WebGLRenderer + Scene + OrthographicCamera
 * 2. 复用 primitives.tsx 的几何/材质缓存(同款外框/中心板/边线/磁铁条)
 * 3. 用 solveConnections 计算所有零件的变换矩阵
 * 4. 应用封面镜头(若有 cameraPreset,否则自动 fit)
 * 5. 渲染一帧并 toDataURL('image/png')
 * 6. 释放所有临时资源(renderer.dispose)
 *
 * 不依赖 R3F 的 Canvas,可在编辑器任意位置调用。
 * 不干扰用户当前的画布视图。
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import type { EditorProject, CameraPreset } from '../../editor/types';
import type { MagnetColor } from '../../data/types';
import { solveConnections } from '../../engine/solver';
import { getShapeDef } from '../../engine/shapes';
import type { ShapeDef } from '../../engine/types';
import {
  createFrameGeometry,
  createCenterGeometry,
  createEdgeLineGeometry,
  createMagnetStripGeometry,
  getFrameMaterial,
  getCenterMaterial,
  getEdgeLineMaterial,
} from './primitives';

export interface CoverRenderOptions {
  /** 输出图片宽度(像素),默认 512 */
  width?: number;
  /** 输出图片高度(像素),默认 512 */
  height?: number;
  /** 封面镜头预设(来自 project.cameraPresets 或 project.metadata.coverCameraPresetId);
   *  未提供时自动 fit 到模型包围盒 */
  cameraPreset?: CameraPreset | null;
  /** 背景颜色,默认浅色渐变。传 null 表示透明 */
  background?: string | null;
}

/**
 * 用独立 Three.js 渲染器把 project 渲染为 PNG dataURL。
 * 返回 dataURL 字符串。出错时返回 null。
 */
export function renderProjectCover(project: EditorProject, options: CoverRenderOptions = {}): string | null {
  if (typeof document === 'undefined') return null;
  if (project.pieces.length === 0) return null;

  const width = options.width ?? 512;
  const height = options.height ?? 512;

  // 构造 partMap / pieceMap / getShapeForPiece
  const partMap = new Map(project.parts.map((p) => [p.id, p]));
  const pieceMap = new Map(project.pieces.map((p) => [p.id, p]));
  const getShapeForPiece = (pid: string): ShapeDef | undefined => {
    const piece = pieceMap.get(pid);
    if (!piece) return undefined;
    const part = partMap.get(piece.partId);
    if (!part) return undefined;
    return getShapeDef(part.shape);
  };

  // 求解所有零件的世界变换
  const rootPiece = project.pieces.find((p) => p.isRoot) || project.pieces[0];
  const solveRes = solveConnections({
    pieces: project.pieces,
    connections: project.connections,
    rootPieceId: rootPiece.id,
    getShapeForPiece,
  });
  const transforms = solveRes.transforms;

  // 创建离屏 renderer
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: options.background === null,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (options.background && options.background !== null) {
      renderer.setClearColor(new THREE.Color(options.background), 1);
    } else if (options.background === null) {
      renderer.setClearColor(0x000000, 0);
    } else {
      // 默认浅色背景
      renderer.setClearColor(0xf0f9ff, 1);
    }

    const scene = new THREE.Scene();
    // 复用 SceneLighting 的灯光配置
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirMain = new THREE.DirectionalLight(0xffffff, 1.5);
    dirMain.position.set(5, 10, 5);
    dirMain.castShadow = true;
    dirMain.shadow.mapSize.width = 2048;
    dirMain.shadow.mapSize.height = 2048;
    dirMain.shadow.camera.near = 0.1;
    dirMain.shadow.camera.far = 50;
    dirMain.shadow.camera.left = -10;
    dirMain.shadow.camera.right = 10;
    dirMain.shadow.camera.top = 10;
    dirMain.shadow.camera.bottom = -10;
    dirMain.shadow.bias = -0.0005;
    scene.add(dirMain);
    const dirFill = new THREE.DirectionalLight(0xffffff, 0.5);
    dirFill.position.set(-3, 5, -3);
    scene.add(dirFill);
    const dirTop = new THREE.DirectionalLight(0xffffff, 0.3);
    dirTop.position.set(0, 8, 0);
    scene.add(dirTop);

    // 收集所有可见零件的世界顶点(用于自动 fit)
    const allWorldVerts: THREE.Vector3[] = [];

    // 把所有零件加入场景
    for (const piece of project.pieces) {
      const tf = transforms[piece.id];
      if (!tf) continue;
      const part = partMap.get(piece.partId);
      if (!part) continue;
      const shape = getShapeDef(part.shape);
      if (!shape) continue;

      const color = part.color as MagnetColor;
      const frameGeom = createFrameGeometry(shape);
      const centerGeom = createCenterGeometry(shape);
      const frameMat = getFrameMaterial(color);
      const centerMat = getCenterMaterial(color);

      const matrix = new THREE.Matrix4().compose(tf.position, tf.quaternion, new THREE.Vector3(1, 1, 1));

      // 外框 mesh
      const frameMesh = new THREE.Mesh(frameGeom, frameMat);
      frameMesh.matrixAutoUpdate = false;
      frameMesh.matrix.copy(matrix);
      frameMesh.castShadow = true;
      frameMesh.receiveShadow = true;
      frameMesh.renderOrder = 0;
      scene.add(frameMesh);

      // 中心板 mesh
      const centerMesh = new THREE.Mesh(centerGeom, centerMat);
      centerMesh.matrixAutoUpdate = false;
      centerMesh.matrix.copy(matrix);
      centerMesh.castShadow = true;
      centerMesh.receiveShadow = true;
      // 透明中心板 renderOrder=1,在不透明外框之后渲染
      centerMesh.renderOrder = centerMat.transparent ? 1 : 0;
      scene.add(centerMesh);

      // 边线 LineSegments2
      try {
        const lineGeom = createEdgeLineGeometry(shape, frameGeom);
        const lineMat = getEdgeLineMaterial(color, { width, height });
        const line = new LineSegments2(lineGeom, lineMat);
        line.matrixAutoUpdate = false;
        line.matrix.copy(matrix);
        line.renderOrder = 2;
        scene.add(line);
      } catch {
        // 边线生成失败时忽略,不阻塞封面
      }

      // 边缘磁铁条
      try {
        const stripGeom = createMagnetStripGeometry(shape);
        if (stripGeom) {
          const stripMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.6,
            metalness: 0.4,
          });
          const stripMesh = new THREE.Mesh(stripGeom, stripMat);
          stripMesh.matrixAutoUpdate = false;
          stripMesh.matrix.copy(matrix);
          stripMesh.castShadow = true;
          scene.add(stripMesh);
        }
      } catch {
        // 磁铁条生成失败时忽略
      }

      // 收集世界顶点
      const halfThick = shape.thickness / 2;
      for (const v of shape.vertices) {
        for (const z of [-halfThick, halfThick]) {
          allWorldVerts.push(new THREE.Vector3(v.x, v.y, z).applyMatrix4(matrix));
        }
      }
    }

    // 接触阴影平面(简化版:用 GroundedShadowMaterial 不便,直接用半透明黑色圆盘)
    if (allWorldVerts.length > 0) {
      const box = new THREE.Box3();
      for (const v of allWorldVerts) box.expandByPoint(v);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const shadowRadius = Math.max(size.x, size.z) * 0.7;
      const shadowGeom = new THREE.CircleGeometry(shadowRadius, 32);
      shadowGeom.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
      shadowMesh.position.set(center.x, 0.01, center.z);
      shadowMesh.renderOrder = -1;
      scene.add(shadowMesh);
    }

    // 创建正交相机
    const aspect = width / height;
    const frustumSize = 10;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100,
    );

    // 应用封面镜头或自动 fit
    applyCoverCamera(camera, options.cameraPreset ?? null, allWorldVerts);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    return dataUrl;
  } catch (err) {
    console.error('[coverRenderer] 渲染封面失败:', err);
    return null;
  } finally {
    if (renderer) {
      renderer.dispose();
      // 强制释放 WebGL 上下文
      renderer.forceContextLoss();
    }
  }
}

/**
 * 应用封面镜头:优先用预设,否则自动 fit 到模型包围盒。
 */
function applyCoverCamera(
  camera: THREE.OrthographicCamera,
  preset: CameraPreset | null,
  worldVerts: THREE.Vector3[],
): void {
  if (preset) {
    camera.position.set(preset.position[0], preset.position[1], preset.position[2]);
    camera.lookAt(preset.target[0], preset.target[1], preset.target[2]);
    camera.zoom = preset.zoom;
    camera.updateProjectionMatrix();
    return;
  }

  if (worldVerts.length === 0) {
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    camera.zoom = 50;
    camera.updateProjectionMatrix();
    return;
  }

  // 自动 fit:计算包围盒,把模型放在视野中央 76% 区域
  const box = new THREE.Box3();
  for (const v of worldVerts) box.expandByPoint(v);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.2 + 5;

  // 三视角(立体感)
  camera.position.set(
    center.x + distance * 0.7,
    center.y + distance * 0.7,
    center.z + distance * 0.7,
  );
  camera.lookAt(center);

  // 计算 zoom 使模型填充 76% 视野
  const camSpaceVerts = worldVerts.map((v) => v.clone().applyMatrix4(camera.matrixWorldInverse));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of camSpaceVerts) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const projectedWidth = maxX - minX;
  const projectedHeight = maxY - minY;
  const fillRatio = 0.76;
  const frustumWidth = camera.right - camera.left;
  const frustumHeight = camera.top - camera.bottom;
  const targetZoom = Math.min(
    (frustumWidth * fillRatio) / (projectedWidth || 1),
    (frustumHeight * fillRatio) / (projectedHeight || 1),
  );
  camera.zoom = targetZoom;
  camera.updateProjectionMatrix();
}
