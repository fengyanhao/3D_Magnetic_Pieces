import { Vector3, Quaternion } from 'three';

export type BuildMode = 'flat' | 'standing' | 'solid';

export interface Vec2 {
  x: number;
  y: number;
}

/** 磁极标识（预留） */
export type Polarity = '+' | '-';

/** 形状的一条 polygon 边（几何边） */
export interface EdgeDef {
  edgeId: string;
  /** 局部坐标端点（shape 位于 XY 平面，中心在原点） */
  v0: Vec2;
  v1: Vec2;
  length: number;
  /** 是否为曲线边 */
  isCurved?: boolean;
  /** 曲线圆心（仅用于曲线边） */
  center?: Vec2;
  /** 曲线半径（仅用于曲线边） */
  radius?: number;
  /** 曲线起始角度（弧度，仅用于曲线边） */
  startAngle?: number;
  /** 曲线终止角度（弧度，仅用于曲线边） */
  endAngle?: number;
}

/** 连接端口：边的一个区段，可与另一块磁力片的某端口连接 */
export interface ConnectorPort {
  portId: string;
  /** 所属的几何边 */
  edgeId: string;
  /** 端口在边上的参数化起点（0~1，从 v0 到 v1） */
  t0: number;
  /** 端口在边上的参数化终点（0~1） */
  t1: number;
  /** 端口实际长度（世界单位） */
  length: number;
  /** 端口局部端点（从 v0 到 v1 插值） */
  p0: Vec2;
  p1: Vec2;
  /** 端口方向向量（p0 -> p1，单位向量） */
  dir: Vec2;
  /** 端口法线（向外，垂直于 dir，逆时针旋转 90 度） */
  normal: Vec2;
  /** 磁极（预留） */
  polarity?: Polarity;
}

/** 形状几何定义 */
export interface ShapeDef {
  id: string;
  /** 逆时针闭合顶点（局部 XY 平面） */
  vertices: Vec2[];
  /** 几何边列表 */
  edges: EdgeDef[];
  /** 所有可连接端口 */
  ports: ConnectorPort[];
  /** 片厚度（局部 Z 方向） */
  thickness: number;
  /** 标准边长参考（世界单位） */
  defaultSize: number;
  /** 零件面积（用于重心加权） */
  area: number;
}

/** 零件实例引用（不含空间坐标） */
export interface PieceRef {
  id: string;
  partId: string;
  /** 是否为约束求解的根零件 */
  isRoot?: boolean;
}

/** 两片之间的端口对端口连接 */
export interface Connection {
  pieceA: string;
  portA: string;
  pieceB: string;
  portB: string;
  /** 二面角（度）：0 = 共面，90 = 垂直，180 = 反向共面 */
  dihedralDeg: number;
  /** 是否翻转 pieceB 的端口方向（p0<->p1） */
  flip?: boolean;
}

/** 闭环残差检查结果 */
export interface LoopResidual {
  connectionIndex: number;
  pieceA: string;
  pieceB: string;
  portA: string;
  portB: string;
  /** 两端点位置误差（世界单位） */
  positionError: number;
  /** 连接方向向量点积（1=完全对齐） */
  directionDot: number;
  /** 二面角误差（度） */
  dihedralError: number;
}

/** 新版搭建步骤 */
export interface BuildStepV2 {
  id: number;
  title: string;
  description: string;
  parentGuide: string;
  /** 本步骤新增的 piece id 列表 */
  addedPieceIds: string[];
  /** 本步骤新增的连接关系 */
  addedConnections: Connection[];
}

/** 物理模型（替代旧 Model 中的空间数据） */
export interface PhysicalModel {
  id: string;
  name: string;
  theme: string;
  difficulty: string;
  ageRange: string;
  minAge: number;
  maxAge: number;
  estimatedTime: string;
  coverImage: string;
  description: string;
  buildMode: BuildMode;
  parts: { id: string; name: string; color: string; count: number; shape: string }[];
  skills: string[];
  parentTips: string[];
  pieces: PieceRef[];
  connections: Connection[];
  steps: BuildStepV2[];
}

/** 求解器输出的单块空间变换 */
export interface PieceTransform {
  position: Vector3;
  quaternion: Quaternion;
}

/** 约束求解结果 */
export interface SolverResult {
  transforms: Record<string, PieceTransform>;
  /** 若求解失败，返回错误信息 */
  error?: string;
  /** 生成树边集合（BFS 中使用的连接） */
  spanningTreeConnectionIndices: Set<number>;
  /** 所有非生成树连接的残差（闭环检查） */
  loopResiduals: LoopResidual[];
}

/** 校验器发现的单个问题 */
export interface ValidationIssue {
  modelId: string;
  pieceId?: string;
  edgeId?: string;
  portId?: string;
  connectionIndex?: number;
  stepId?: number;
  message: string;
  severity: 'error' | 'warning';
  /**
   * P1-13: 机器可读的错误码,供 editor 层做分类与过滤,避免依赖中文文案匹配。
   * @see ValidationIssueCode
   */
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * P1-13: 校验问题的标准错误码,与 ValidationIssue.code 字段对应。
 * editor 层基于 code 分类,不依赖中文文案匹配,改文案不会破坏分类。
 */
export const ValidationIssueCode = {
  UNCONNECTED: 'unconnected',
  PORT_REUSE: 'port-reuse',
  PORT_OVERLAP: 'port-overlap',
  PORT_LENGTH: 'port-length',
  PORT_MISSING: 'port-missing',
  INTERSECTION: 'intersection',
  LOOP_RESIDUAL: 'loop-residual',
  LOOP_POSITION_ERROR: 'loop-position-error',
  LOOP_DIRECTION_ERROR: 'loop-direction-error',
  LOOP_DIHEDRAL_ERROR: 'loop-dihedral-error',
  GROUND: 'ground',
  STABILITY: 'stability',
  PLANARITY: 'planarity',
  STEP: 'step',
  DIHEDRAL_INVALID: 'dihedral-invalid',
} as const;

export type ValidationIssueCode = typeof ValidationIssueCode[keyof typeof ValidationIssueCode];
