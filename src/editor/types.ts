import { Theme, Difficulty, PartDef } from '../data/types';
import { PieceRef, Connection, BuildStepV2, BuildMode } from '../engine/types';

/**
 * 磁力片方案编辑器数据模型。
 *
 * 设计原则:
 * - 不建立第二套方案格式。pieces / connections / steps 直接复用
 *   engine 的 PieceRef / Connection / BuildStepV2,与用户端 Model 结构兼容。
 * - transforms 是编辑器显示用的可序列化缓存(由 solver 推导并快照),
 *   导出后重新导入无需重算即可还原视图;connections 仍是结构真值。
 * - 纯数据,无 React / Three.js 依赖,便于未来小程序复用。
 */

export const SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

export interface SerializableTransform {
  position: [number, number, number];
  quaternion: [number, number, number, number];
}

export interface CameraPreset {
  id: string;
  label: string;
  /** 关联的步骤 id(可选) */
  stepId?: number;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface ThumbnailInfo {
  source: 'auto' | 'manual';
  cameraPresetId?: string;
  /** P2: 编辑器生成的真实 3D 渲染封面 dataURL(PNG)。与 SchemeDef.ThumbnailInfo.dataUrl 对齐。 */
  dataUrl?: string;
}

export interface ValidationInfo {
  checkedAt: string;
  valid: boolean;
  errorCount: number;
  warningCount: number;
}

export interface EditorMetadata {
  name: string;
  description: string;
  theme: Theme;
  difficulty: Difficulty;
  ageRange: string;
  minAge: number;
  maxAge: number;
  estimatedTime: string;
  buildMode: BuildMode;
  tags: string[];
  teachingTips: string[];
  safetyTips: string[];
  author: string;
  /** 数据版本(作者自定义版本号) */
  dataVersion: string;
  /** 封面镜头 preset id */
  coverCameraPresetId?: string;
}

export interface EditorProject {
  schemaVersion: number;
  id: string;
  metadata: EditorMetadata;
  /** 零件定义(partId -> 形状/颜色/名称,count 为自动同步) */
  parts: PartDef[];
  /** 零件实例 */
  pieces: PieceRef[];
  /** 连接关系(结构真值) */
  connections: Connection[];
  /** 拼装步骤 */
  steps: BuildStepV2[];
  /** 镜头预设 */
  cameraPresets: CameraPreset[];
  /** 显示用变换缓存 */
  transforms: Record<string, SerializableTransform>;
  thumbnail: ThumbnailInfo;
  validationInfo?: ValidationInfo;
  createdAt: string;
  updatedAt: string;
}

export function defaultMetadata(): EditorMetadata {
  return {
    name: '未命名方案',
    description: '',
    theme: 'other',
    difficulty: 'easy',
    ageRange: '3-6岁',
    minAge: 3,
    maxAge: 6,
    estimatedTime: '15分钟',
    buildMode: 'solid',
    tags: [],
    teachingTips: [],
    safetyTips: [],
    author: '',
    dataVersion: '1.0',
  };
}
