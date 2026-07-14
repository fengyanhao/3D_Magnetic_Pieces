export type Theme = 'house' | 'car' | 'rocket' | 'animal' | 'castle' | 'other';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type MagnetShape =
  | 'square'
  | 'equilateral-triangle'
  | 'isosceles-triangle'
  | 'rectangle'
  | 'rhombus'
  | 'trapezoid'
  | 'hexagon'
  | 'sector'
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

export interface Step {
  id: number;
  title: string;
  description: string;
  parentGuide: string;
  /** 本步骤新增的磁力片实例 */
  addedPieces: MagnetPiece[];
}

export interface Model {
  id: string;
  name: string;
  theme: Theme;
  difficulty: Difficulty;
  ageRange: string;
  estimatedTime: string;
  coverImage: string;
  description: string;
  parts: PartDef[];
  skills: string[];
  parentTips: string[];
  steps: Step[];
}

export interface FilterOptions {
  theme?: Theme;
  difficulty?: Difficulty;
  age?: string;
}
