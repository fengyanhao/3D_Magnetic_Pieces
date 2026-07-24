/**
 * 方案数据格式 v3 — Web First 统一数据格式
 *
 * 普通用户端和编辑器端共用此格式。
 * 3D 核心逻辑不依赖 React，所有数学/几何/连接/校验在 engine/ 层完成。
 *
 * 设计原则：
 * - 方案数据是纯 JSON 可序列化
 * - 零件通过 pieceId 引用形状库（engine/shapes）
 * - 连接关系通过端口 ID 描述，空间变换由求解器实时计算
 * - 步骤增量式：每步只声明新增零件和新增连接
 * - 编辑器可实时修改，用户端只读展示
 */

import type { Connection, PieceRef, BuildStepV2, BuildMode } from './types';

/** 方案元数据 */
export interface SchemeMeta {
  id: string;
  name: string;
  /** 英文名（可选） */
  englishName?: string;
  /** 方案版本号，每次保存递增 */
  version: number;
  /** 创建时间 ISO */
  createdAt: string;
  /** 最后修改时间 ISO */
  updatedAt: string;
  /** 作者 */
  author?: string;
  /** 简介 */
  description: string;
  /** 封面（base64 data URL 或外部引用，编辑器保存时内嵌） */
  coverImage?: string;
}

/** 方案展示信息（用于用户端列表、详情） */
export interface SchemeDisplay {
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard';
  ageRange: string;
  minAge: number;
  maxAge: number;
  estimatedTime: string;
  buildMode: BuildMode;
  skills: string[];
  parentTips: string[];
}

/** 零件定义（零件类型清单） */
export interface SchemePartDef {
  id: string;
  name: string;
  /** 形状ID，引用 engine/shapes 的 ShapeDef.id */
  shape: string;
  /** 默认颜色 */
  color: string;
  /** 数量 */
  count: number;
}

/** 编辑器视点快照 */
export interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

/** 方案数据 v3 — 完整的磁力片拼搭方案 */
export interface SchemeDef {
  /** 数据格式版本 */
  formatVersion: 3;
  /** 元数据 */
  meta: SchemeMeta;
  /** 展示信息 */
  display: SchemeDisplay;
  /** 零件类型清单 */
  parts: SchemePartDef[];
  /** 零件实例列表 */
  pieces: PieceRef[];
  /** 连接关系 */
  connections: Connection[];
  /** 搭建步骤 */
  steps: BuildStepV2[];
  /** 编辑器镜头快照（每步一个，可选） */
  cameraSnapshots?: CameraSnapshot[];
}

/** 创建空方案 */
export function createEmptyScheme(id: string, name: string): SchemeDef {
  const now = new Date().toISOString();
  return {
    formatVersion: 3,
    meta: {
      id,
      name,
      version: 1,
      createdAt: now,
      updatedAt: now,
      description: '',
    },
    display: {
      theme: 'other',
      difficulty: 'easy',
      ageRange: '3-5岁',
      minAge: 3,
      maxAge: 5,
      estimatedTime: '10分钟',
      buildMode: 'solid',
      skills: [],
      parentTips: [],
    },
    parts: [],
    pieces: [],
    connections: [],
    steps: [],
  };
}

/** 方案序列化为 JSON 字符串 */
export function serializeScheme(scheme: SchemeDef): string {
  return JSON.stringify(scheme, null, 2);
}

/** 从 JSON 字符串解析方案，带格式校验 */
export function deserializeScheme(json: string): SchemeDef {
  const data = JSON.parse(json);
  if (data.formatVersion !== 3) {
    throw new Error(`不支持的方案格式版本: ${data.formatVersion}，期望 3`);
  }
  return data as SchemeDef;
}
