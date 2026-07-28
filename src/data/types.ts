export type Theme = 'house' | 'car' | 'rocket' | 'animal' | 'castle' | 'other';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type MagnetShape =
  | 'square'
  | 'equilateral-triangle'
  | 'isosceles-triangle'
  | 'right-triangle'
  | 'long-right-triangle'
  | 'rectangle'
  | 'rhombus'
  | 'trapezoid'
  | 'hexagon'
  | 'sector'
  | 'semicircle'
  | 'pentagon';

export type MagnetColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'white'
  | 'black'
  | 'clear';

export interface PartDef {
  id: string;
  name: string;
  color: MagnetColor;
  count: number;
  shape: MagnetShape;
}

/** 一块具体的磁力片实例 */
export interface MagnetPiece {
  /** 实例唯一ID，格式：partId-idx */
  id: string;
  /** 对应 PartDef.id */
  partId: string;
  /** 相对场景中心的位置，单位：片边长（含厚度间隔） */
  position: [number, number, number];
  /** 旋转（欧拉角，deg） */
  rotation: [number, number, number];
}

/** v2 新格式：连接关系定义 */
export interface ConnectionDef {
  pieceA: string;
  portA: string;
  pieceB: string;
  portB: string;
  dihedralDeg: number;
  flip?: boolean;
}

/** v2 新格式：零件实例引用 */
export interface PieceRef {
  id: string;
  partId: string;
  isRoot?: boolean;
}

/** 步骤镜头：作者保存的本步视角（与 engine/types.ts StepCamera 一致） */
export interface StepCamera {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  transitionMs: number;
}

/** 入场类型 */
export type EntranceType =
  | 'drop'
  | 'side'
  | 'fold'
  | 'fade'
  | 'none';

/** 单片零件的入场动画配置 */
export interface PieceEntranceConfig {
  type: EntranceType;
  delayMs: number;
  durationMs: number;
  easing: string;
  startOffset?: [number, number, number];
  startRotation?: [number, number, number];
}

export interface Step {
  id: number;
  title: string;
  description: string;
  parentGuide: string;
  /** 本步骤新增的磁力片实例（旧格式） */
  addedPieces?: MagnetPiece[];
  /** v2 新格式：本步骤新增的零件 ID */
  addedPieceIds?: string[];
  /** v2 新格式：本步骤新增的连接 */
  addedConnections?: ConnectionDef[];
  /* ----------------- P1: 教学编排字段（全部可选，旧数据自动获得默认值） ----------------- */
  /** 本步镜头 */
  camera?: StepCamera;
  /** 每片零件的入场配置（按 pieceId 索引） */
  entrance?: Record<string, PieceEntranceConfig>;
  /** 新零件的短暂高亮时间（毫秒，0 = 不高亮） */
  highlightMs?: number;
  /** 吸附完成时的反馈类型 */
  snapFeedback?: 'none' | 'pulse' | 'glow';
  /** 可选的零件标注（按 pieceId 索引） */
  annotations?: Record<string, string>;
  /** 本步提示文字 */
  hint?: string;
  /** 本步观察重点 */
  focusPoints?: string[];
}

export interface Model {
  id: string;
  name: string;
  theme: Theme;
  difficulty: Difficulty;
  ageRange: string;
  minAge: number;
  maxAge: number;
  estimatedTime: string;
  coverImage: string;
  description: string;
  parts: PartDef[];
  skills: string[];
  parentTips: string[];
  steps: Step[];
  /** v2 新格式：构建模式 */
  buildMode?: 'flat' | 'standing' | 'solid';
  /** v2 新格式：零件实例列表 */
  pieces?: PieceRef[];
  /** v2 新格式：连接关系列表 */
  connections?: ConnectionDef[];
}

export interface FilterOptions {
  theme?: Theme;
  difficulty?: Difficulty;
  age?: string;
}
