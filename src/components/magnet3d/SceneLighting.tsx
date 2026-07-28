/**
 * P2-6: 共享场景灯光与渲染配置
 *
 * 三个 Canvas(MagnetScene3D / EditorCanvas / TutorialPlayer)共用同一套灯光和渲染参数,
 * 避免重复内联导致的不一致。
 *
 * 修复:
 * - 显式设置 sRGB 颜色空间和 ACESFilmic 色调映射,减少"发灰"
 * - 提高环境光和主光强度,使颜色更鲜艳
 * - 添加补光消除暗面发灰
 * - 使用 ContactShadows 接触阴影增强地面感
 */
import { ContactShadows } from '@react-three/drei';
import type { ReactNode } from 'react';

export interface SceneLightingProps {
  /** ContactShadows 的 scale,编辑器场景通常更大 */
  shadowScale?: number;
  /** ContactShadows 的 opacity */
  shadowOpacity?: number;
  children?: ReactNode;
}

/**
 * 标准磁力片场景灯光。
 * 用户端、编辑器、播放器共用。
 */
export function SceneLighting({
  shadowScale = 10,
  shadowOpacity = 0.4,
  children,
}: SceneLightingProps) {
  return (
    <>
      {/* 环境光:提高到 0.8,消除暗面发灰 */}
      <ambientLight intensity={0.8} />

      {/* 主光:正面偏上,强度提高到 1.5,投射阴影 */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />

      {/* 补光:从左后方填充暗面 */}
      <directionalLight position={[-3, 5, -3]} intensity={0.5} />

      {/* 顶光:增加上方亮度,使颜色更饱和 */}
      <directionalLight position={[0, 8, 0]} intensity={0.3} />

      {/* 接触阴影:增强地面接触感 */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={shadowOpacity}
        scale={shadowScale}
        blur={2.5}
        far={4}
        resolution={512}
      />

      {children}
    </>
  );
}

/**
 * P2-6: Canvas 的 gl 配置,显式设置颜色空间和色调映射。
 *
 * 使用方法:
 * <Canvas gl={{ ...defaultGLProps, antialias: true }}>
 */
export const defaultGLProps = {
  antialias: true,
  // 显式指定 sRGB 输出颜色空间(R3F 默认也是这个,但显式声明避免版本升级风险)
  outputColorSpace: 'srgb' as const,
  // ACESFilmic 色调映射,使高光不过曝、暗部有细节
  toneMapping: 4, // THREE.ACESFilmicToneMapping = 4
  // 色调映射曝光,略高于 1.0 使整体更明亮
  toneMappingExposure: 1.1,
  // P2: 保留绘图缓冲,使 toDataURL() 可用于封面生成(性能影响可忽略)
  preserveDrawingBuffer: true,
};
