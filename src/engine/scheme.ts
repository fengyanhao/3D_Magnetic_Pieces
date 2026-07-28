/**
 * 方案数据格式 v3 — Web First 唯一持久化方案格式
 *
 * 用户端、编辑器、导入、导出、草稿、缩略图全部读写此格式。
 * EditorProject 和 Model 仅作为运行时视图模型，从 SchemeDef 派生。
 * 3D 核心逻辑不依赖 React，所有数学/几何/连接/校验在 engine/ 层完成。
 *
 * 设计原则：
 * - 方案数据是纯 JSON 可序列化
 * - 零件通过 pieceId 引用形状库（engine/shapes）
 * - 连接关系通过端口 ID 描述，空间变换由求解器实时计算
 * - 步骤增量式：每步只声明新增零件和新增连接
 * - 编辑器可实时修改，用户端只读展示
 *
 * P0-3: 双 Schema 收口
 * - SchemeDef v3 是唯一持久化格式（localStorage 草稿、导出 JSON、缩略图引用）
 * - EditorProject schemaVersion 1 是运行时视图模型（含 transforms / validationInfo 缓存）
 * - 旧 v1 草稿通过 migrateV1ToV3 一次性升级，升级后不再回写 v1
 */

import type { Connection, PieceRef, BuildStepV2, BuildMode } from './types';
import type { MagnetShape, MagnetColor, Theme, Difficulty } from '../data/types';
import type { PartDef } from '../data/types';

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
  /** 封面镜头 preset id */
  coverCameraPresetId?: string;
}

/** 方案展示信息（用于用户端列表、详情） */
export interface SchemeDisplay {
  theme: Theme;
  difficulty: Difficulty;
  ageRange: string;
  minAge: number;
  maxAge: number;
  estimatedTime: string;
  buildMode: BuildMode;
  skills: string[];
  parentTips: string[];
  /** 安全提示 */
  safetyTips: string[];
}

/** 零件定义（零件类型清单） */
export interface SchemePartDef {
  id: string;
  name: string;
  /** 形状ID，引用 engine/shapes 的 ShapeDef.id */
  shape: MagnetShape;
  /** 默认颜色 */
  color: MagnetColor;
  /** 数量（由 pieces 自动同步，冗余字段用于快速展示） */
  count: number;
}

/** 镜头预设（编辑器和播放器共用） */
export interface CameraPreset {
  id: string;
  label: string;
  /** 关联的步骤 id（可选） */
  stepId?: number;
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

/** 缩略图/封面信息 */
export interface ThumbnailInfo {
  source: 'auto' | 'manual';
  cameraPresetId?: string;
  /** base64 data URL（编辑器生成后内嵌） */
  dataUrl?: string;
}

/** 方案数据 v3 — 完整的磁力片拼搭方案（唯一持久化格式） */
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
  /** 镜头预设列表 */
  cameraPresets: CameraPreset[];
  /** 缩略图/封面信息 */
  thumbnail: ThumbnailInfo;
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
      safetyTips: [],
    },
    parts: [],
    pieces: [],
    connections: [],
    steps: [],
    cameraPresets: [],
    thumbnail: { source: 'auto' },
  };
}

/** 方案序列化为 JSON 字符串 */
export function serializeScheme(scheme: SchemeDef): string {
  const out: SchemeDef = {
    ...scheme,
    meta: { ...scheme.meta, updatedAt: new Date().toISOString() },
  };
  return JSON.stringify(out, null, 2);
}

/** 从 JSON 字符串解析方案，带格式校验 */
export function deserializeScheme(json: string): SchemeDef {
  const data = JSON.parse(json);
  if (data.formatVersion !== 3) {
    throw new Error(`不支持的方案格式版本: ${data.formatVersion}，期望 3`);
  }
  return normalizeScheme(data);
}

/** 递归 Partial，使 normalizeScheme 能接受任意嵌套层级的部分对象 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 补全缺失字段，保证运行时不崩溃 */
export function normalizeScheme(s: DeepPartial<SchemeDef>): SchemeDef {
  const now = new Date().toISOString();
  return {
    formatVersion: 3,
    meta: {
      id: s.meta?.id || `scheme-${Date.now()}`,
      name: s.meta?.name || '未命名方案',
      version: s.meta?.version ?? 1,
      createdAt: s.meta?.createdAt || now,
      updatedAt: s.meta?.updatedAt || now,
      description: s.meta?.description ?? '',
      coverImage: s.meta?.coverImage,
      coverCameraPresetId: s.meta?.coverCameraPresetId,
      author: s.meta?.author,
      englishName: s.meta?.englishName,
    },
    display: {
      theme: s.display?.theme ?? 'other',
      difficulty: s.display?.difficulty ?? 'easy',
      ageRange: s.display?.ageRange ?? '3-6岁',
      minAge: s.display?.minAge ?? 3,
      maxAge: s.display?.maxAge ?? 6,
      estimatedTime: s.display?.estimatedTime ?? '15分钟',
      buildMode: s.display?.buildMode ?? 'solid',
      skills: (s.display?.skills ?? []).filter((x): x is string => typeof x === 'string'),
      parentTips: (s.display?.parentTips ?? []).filter((x): x is string => typeof x === 'string'),
      safetyTips: (s.display?.safetyTips ?? []).filter((x): x is string => typeof x === 'string'),
    },
    parts: (Array.isArray(s.parts) ? s.parts : []).filter((p): p is SchemePartDef => !!p && typeof p === 'object'),
    pieces: (Array.isArray(s.pieces) ? s.pieces : []).filter((p): p is PieceRef => !!p && typeof p === 'object'),
    connections: (Array.isArray(s.connections) ? s.connections : []).filter((c): c is Connection => !!c && typeof c === 'object'),
    steps: (Array.isArray(s.steps) ? s.steps : []).filter((st): st is BuildStepV2 => !!st && typeof st === 'object'),
    cameraPresets: (Array.isArray(s.cameraPresets) ? s.cameraPresets : []).filter((c): c is CameraPreset => !!c && typeof c === 'object'),
    thumbnail: s.thumbnail && s.thumbnail.source
      ? { source: s.thumbnail.source, cameraPresetId: s.thumbnail.cameraPresetId, dataUrl: s.thumbnail.dataUrl }
      : { source: 'auto' as const },
  };
}

/* ----------------- P0-3: v1 → v3 迁移器 ----------------- */

/**
 * 旧 EditorProject v1 的运行时形状（仅用于迁移器类型推断）。
 * 实际定义在 editor/types.ts，为避免循环依赖这里只声明用到的字段。
 */
interface EditorProjectV1Like {
  schemaVersion: number;
  id: string;
  metadata: {
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
    dataVersion: string;
    coverCameraPresetId?: string;
  };
  parts: PartDef[];
  pieces: PieceRef[];
  connections: Connection[];
  steps: BuildStepV2[];
  cameraPresets: CameraPreset[];
  thumbnail: ThumbnailInfo;
  createdAt: string;
  updatedAt: string;
  // transforms / validationInfo 不迁移，运行时由 solver / validator 重新推导
}

/**
 * 把旧 EditorProject schemaVersion 1 一次性迁移到 SchemeDef v3。
 * - transforms / validationInfo 丢弃：前者由 solver 重算，后者由 validator 重算
 * - metadata 拆分为 meta + display
 * - tags → skills, teachingTips → parentTips
 */
export function migrateV1ToV3(raw: any): SchemeDef {
  const v1 = raw as EditorProjectV1Like;
  const now = new Date().toISOString();
  return normalizeScheme({
    formatVersion: 3,
    meta: {
      id: v1.id || `scheme-${Date.now()}`,
      name: v1.metadata?.name ?? '未命名方案',
      version: 1,
      createdAt: v1.createdAt || now,
      updatedAt: v1.updatedAt || now,
      description: v1.metadata?.description ?? '',
      author: v1.metadata?.author || undefined,
      coverCameraPresetId: v1.metadata?.coverCameraPresetId,
    },
    display: {
      theme: v1.metadata?.theme ?? 'other',
      difficulty: v1.metadata?.difficulty ?? 'easy',
      ageRange: v1.metadata?.ageRange ?? '3-6岁',
      minAge: v1.metadata?.minAge ?? 3,
      maxAge: v1.metadata?.maxAge ?? 6,
      estimatedTime: v1.metadata?.estimatedTime ?? '15分钟',
      buildMode: v1.metadata?.buildMode ?? 'solid',
      skills: v1.metadata?.tags ?? [],
      parentTips: v1.metadata?.teachingTips ?? [],
      safetyTips: v1.metadata?.safetyTips ?? [],
    },
    parts: Array.isArray(v1.parts) ? v1.parts : [],
    pieces: Array.isArray(v1.pieces) ? v1.pieces : [],
    connections: Array.isArray(v1.connections) ? v1.connections : [],
    steps: Array.isArray(v1.steps) ? v1.steps : [],
    cameraPresets: Array.isArray(v1.cameraPresets) ? v1.cameraPresets : [],
    thumbnail: v1.thumbnail ?? { source: 'auto' },
  });
}

/**
 * 解析任意 JSON 字符串为 SchemeDef，自动识别 v1/v3。
 * - formatVersion === 3：直接 normalizeScheme
 * - schemaVersion === 1（旧 EditorProject）：调用 migrateV1ToV3
 * - 其它：抛错
 */
export function parseScheme(json: string): SchemeDef {
  let data: any;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('JSON 解析失败: ' + (e as Error).message);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('方案数据不是有效对象');
  }
  if (data.formatVersion === 3) {
    return normalizeScheme(data);
  }
  if (data.schemaVersion === 1) {
    return migrateV1ToV3(data);
  }
  // 兜底：尝试当 v0 Model 处理（无 schemaVersion / formatVersion）
  // 这一支路保留以兼容历史导出文件，但不再回写 v0/v1
  if (!data.formatVersion && !data.schemaVersion && data.id && data.parts) {
    // 视为 Model，构造空 v3 后填充
    return normalizeScheme({
      formatVersion: 3,
      meta: {
        id: data.id,
        name: data.name ?? '未命名方案',
        description: data.description ?? '',
      },
      display: {
        theme: data.theme ?? 'other',
        difficulty: data.difficulty ?? 'easy',
        ageRange: data.ageRange ?? '3-6岁',
        minAge: data.minAge ?? 3,
        maxAge: data.maxAge ?? 6,
        estimatedTime: data.estimatedTime ?? '15分钟',
        buildMode: data.buildMode ?? 'solid',
        skills: data.skills ?? [],
        parentTips: data.parentTips ?? [],
      },
      parts: data.parts ?? [],
      pieces: data.pieces ?? [],
      connections: data.connections ?? [],
      steps: data.steps ?? [],
    });
  }
  throw new Error(`无法识别的方案数据格式（formatVersion=${data.formatVersion}, schemaVersion=${data.schemaVersion}）`);
}

/**
 * 把 SchemeDef v3 反向派生为 EditorProject v1 运行时视图。
 * - transforms 留空，由调用方通过 resnapshotTransforms 填充
 * - validationInfo 不填，由调用方通过 runValidation 填充
 * - 此函数不持久化结果（持久化只走 SchemeDef v3）
 */
export function schemeToEditorProject(
  scheme: SchemeDef,
  options?: {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  },
): import('../editor/types').EditorProject {
  // 用动态 import 类型，避免循环依赖；运行时不需要 import 值
  const meta = scheme.meta;
  const display = scheme.display;
  const now = new Date().toISOString();
  return {
    schemaVersion: 1, // 运行时视图仍标 v1，但持久化层已不再写入这个字段
    id: options?.id ?? meta.id,
    metadata: {
      name: meta.name,
      description: meta.description,
      theme: display.theme,
      difficulty: display.difficulty,
      ageRange: display.ageRange,
      minAge: display.minAge,
      maxAge: display.maxAge,
      estimatedTime: display.estimatedTime,
      buildMode: display.buildMode,
      tags: [...display.skills],
      teachingTips: [...display.parentTips],
      safetyTips: [...display.safetyTips],
      author: meta.author ?? '',
      dataVersion: String(meta.version ?? 1),
      coverCameraPresetId: meta.coverCameraPresetId,
    },
    parts: scheme.parts.map((p) => ({ ...p })),
    pieces: scheme.pieces.map((p) => ({ ...p })),
    connections: scheme.connections.map((c) => ({ ...c })),
    steps: scheme.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      parentGuide: s.parentGuide,
      addedPieceIds: [...s.addedPieceIds],
      addedConnections: s.addedConnections.map((c) => ({ ...c })),
      // P1: 教学编排字段透传
      ...(s.camera ? { camera: { ...s.camera } } : {}),
      ...(s.entrance ? { entrance: Object.fromEntries(Object.entries(s.entrance).map(([k, v]) => [k, { ...v }])) } : {}),
      ...(s.highlightMs !== undefined ? { highlightMs: s.highlightMs } : {}),
      ...(s.snapFeedback ? { snapFeedback: s.snapFeedback } : {}),
      ...(s.annotations ? { annotations: { ...s.annotations } } : {}),
      ...(s.hint ? { hint: s.hint } : {}),
      ...(s.focusPoints ? { focusPoints: [...s.focusPoints] } : {}),
    })),
    cameraPresets: scheme.cameraPresets.map((c) => ({ ...c })),
    transforms: {},
    thumbnail: { ...scheme.thumbnail },
    createdAt: options?.createdAt ?? meta.createdAt ?? now,
    updatedAt: options?.updatedAt ?? meta.updatedAt ?? now,
  };
}

/**
 * 把 EditorProject v1 运行时视图序列化为 SchemeDef v3 并输出 JSON。
 * 这是持久化的唯一入口（草稿保存、导出文件、缩略图引用都走这里）。
 */
export function projectToScheme(project: import('../editor/types').EditorProject): SchemeDef {
  const m = project.metadata;
  return normalizeScheme({
    formatVersion: 3,
    meta: {
      id: project.id,
      name: m.name,
      version: parseInt(m.dataVersion || '1', 10) || 1,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      description: m.description,
      author: m.author || undefined,
      coverCameraPresetId: m.coverCameraPresetId,
    },
    display: {
      theme: m.theme,
      difficulty: m.difficulty,
      ageRange: m.ageRange,
      minAge: m.minAge,
      maxAge: m.maxAge,
      estimatedTime: m.estimatedTime,
      buildMode: m.buildMode,
      skills: [...m.tags],
      parentTips: [...m.teachingTips],
      safetyTips: [...m.safetyTips],
    },
    parts: project.parts.map((p) => ({ ...p })),
    pieces: project.pieces.map((p) => ({ ...p })),
    connections: project.connections.map((c) => ({ ...c })),
    steps: project.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      parentGuide: s.parentGuide,
      addedPieceIds: [...s.addedPieceIds],
      addedConnections: s.addedConnections.map((c) => ({ ...c })),
      // P1: 教学编排字段透传
      ...(s.camera ? { camera: { ...s.camera } } : {}),
      ...(s.entrance ? { entrance: Object.fromEntries(Object.entries(s.entrance).map(([k, v]) => [k, { ...v }])) } : {}),
      ...(s.highlightMs !== undefined ? { highlightMs: s.highlightMs } : {}),
      ...(s.snapFeedback ? { snapFeedback: s.snapFeedback } : {}),
      ...(s.annotations ? { annotations: { ...s.annotations } } : {}),
      ...(s.hint ? { hint: s.hint } : {}),
      ...(s.focusPoints ? { focusPoints: [...s.focusPoints] } : {}),
    })),
    cameraPresets: project.cameraPresets.map((c) => ({ ...c })),
    thumbnail: { ...project.thumbnail },
  });
}

/** 把 EditorProject v1 持久化为 v3 JSON 字符串。 */
export function serializeProjectAsScheme(project: import('../editor/types').EditorProject): string {
  return serializeScheme(projectToScheme(project));
}
