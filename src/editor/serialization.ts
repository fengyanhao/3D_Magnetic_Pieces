import { Vector3, Quaternion } from 'three';
import { Model, PartDef, MagnetShape } from '../data/types';
import {
  PhysicalModel,
  PieceRef,
  Connection,
  BuildStepV2,
  BuildMode,
  PieceTransform,
} from '../engine/types';
import { solveConnections } from '../engine/solver';
import { getShapeDef, shapeLibrary } from '../engine/shapes';
import {
  EditorProject,
  EditorMetadata,
  CameraPreset,
  SerializableTransform,
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  defaultMetadata,
} from './types';
import { uid } from './id';

/**
 * 方案序列化、导入导出、版本迁移与完整性检查。
 * 纯数据逻辑,无 React / DOM 依赖。
 */

/* ----------------- 适配器:EditorProject <-> Model / PhysicalModel ----------------- */

function snapshotTransforms(
  pieces: PieceRef[],
  connections: Connection[],
  getShapeForPiece: (pid: string) => ReturnType<typeof getShapeDef>,
  editorTransforms?: Record<string, SerializableTransform>,
): Record<string, SerializableTransform> {
  if (pieces.length === 0) return {};
  const root = pieces.find((p) => p.isRoot) || pieces[0];
  // P0-3: 把根零件的 editor transform 作为 rootTransform 传给求解器,
  // 使移动根零件时整个连接组件跟随移动(不再硬编码原点)。
  let rootTransform: PieceTransform | undefined;
  if (editorTransforms && editorTransforms[root.id]) {
    rootTransform = transformFromSerializable(editorTransforms[root.id]);
  }
  const res = solveConnections({ pieces, connections, rootPieceId: root.id, getShapeForPiece, rootTransform });
  const out: Record<string, SerializableTransform> = {};
  for (const p of pieces) {
    const tf = res.transforms[p.id];
    if (tf) {
      out[p.id] = {
        position: [tf.position.x, tf.position.y, tf.position.z],
        quaternion: [tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w],
      };
    }
  }
  return out;
}

function makeGetShape(parts: PartDef[], pieces: PieceRef[]) {
  const partMap = new Map(parts.map((p) => [p.id, p]));
  const pieceMap = new Map(pieces.map((p) => [p.id, p]));
  return (pid: string): ReturnType<typeof getShapeDef> => {
    const piece = pieceMap.get(pid);
    if (!piece) return undefined;
    const part = partMap.get(piece.partId);
    return part ? getShapeDef(part.shape) : undefined;
  };
}

/** 编辑器方案 -> 用户端 Model(供 MagnetScene3D 预览/发布)。 */
export function projectToModel(project: EditorProject): Model {
  const m = project.metadata;
  return {
    id: project.id,
    name: m.name,
    theme: m.theme,
    difficulty: m.difficulty,
    ageRange: m.ageRange,
    minAge: m.minAge,
    maxAge: m.maxAge,
    estimatedTime: m.estimatedTime,
    coverImage: '',
    description: m.description,
    buildMode: m.buildMode,
    parts: project.parts.map((p) => ({ ...p })),
    skills: [...m.tags],
    parentTips: [...m.teachingTips],
    pieces: project.pieces.map((p) => ({ ...p })),
    connections: project.connections.map((c) => ({ ...c })),
    steps: project.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      parentGuide: s.parentGuide,
      addedPieceIds: [...s.addedPieceIds],
      addedConnections: s.addedConnections.map((c) => ({ ...c })),
    })),
  };
}

/** 编辑器方案 -> PhysicalModel(供 validatePhysicalModel)。 */
export function projectToPhysicalModel(project: EditorProject): PhysicalModel {
  const m = project.metadata;
  return {
    id: project.id,
    name: m.name,
    theme: m.theme,
    difficulty: m.difficulty,
    ageRange: m.ageRange,
    minAge: m.minAge,
    maxAge: m.maxAge,
    estimatedTime: m.estimatedTime,
    coverImage: '',
    description: m.description,
    buildMode: m.buildMode,
    parts: project.parts.map((p) => ({ ...p })),
    skills: [...m.tags],
    parentTips: [...m.teachingTips],
    pieces: project.pieces.map((p) => ({ ...p })),
    connections: project.connections.map((c) => ({ ...c })),
    steps: project.steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      parentGuide: s.parentGuide,
      addedPieceIds: [...s.addedPieceIds],
      addedConnections: s.addedConnections.map((c) => ({ ...c })),
    })),
  };
}

/** 现有 Model -> 编辑器方案(导入现有立体模型)。 */
export function modelToProject(model: Model): EditorProject {
  const pieces: PieceRef[] = (model.pieces ?? []).map((p) => ({ ...p }));
  const connections: Connection[] = (model.connections ?? []).map((c) => ({ ...c }));
  const steps: BuildStepV2[] = model.steps.map((s, idx) => ({
    id: s.id ?? idx + 1,
    title: s.title ?? `步骤 ${idx + 1}`,
    description: s.description ?? '',
    parentGuide: s.parentGuide ?? '',
    addedPieceIds: s.addedPieceIds ? [...s.addedPieceIds] : (s.addedPieces ?? []).map((p) => p.id),
    addedConnections: s.addedConnections ? s.addedConnections.map((c) => ({ ...c })) : [],
  }));

  const parts: PartDef[] = model.parts.map((p) => ({ ...p }));
  const getShape = makeGetShape(parts, pieces);
  // 首次导入无 editor transforms,求解器回退到原点 + Q_GROUND
  const transforms = snapshotTransforms(pieces, connections, getShape);

  const now = new Date().toISOString();
  const metadata: EditorMetadata = {
    name: model.name,
    description: model.description,
    theme: model.theme,
    difficulty: model.difficulty,
    ageRange: model.ageRange,
    minAge: model.minAge,
    maxAge: model.maxAge,
    estimatedTime: model.estimatedTime,
    buildMode: (model.buildMode ?? 'solid') as BuildMode,
    tags: [...(model.skills ?? [])],
    teachingTips: [...(model.parentTips ?? [])],
    safetyTips: [],
    author: '',
    dataVersion: '1.0',
  };

  const coverCam: CameraPreset = {
    id: uid('cam'),
    label: '封面镜头',
    position: [5, 5, 5],
    target: [0, 0, 0],
    zoom: 50,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('proj'),
    metadata,
    parts,
    pieces,
    connections,
    steps,
    cameraPresets: [coverCam],
    transforms,
    thumbnail: { source: 'auto', cameraPresetId: coverCam.id },
    createdAt: now,
    updatedAt: now,
  };
}

/* ----------------- 序列化与解析 ----------------- */

export function serializeProject(project: EditorProject): string {
  const out: EditorProject = {
    ...project,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(out, null, 2);
}

export interface ParseResult {
  project: EditorProject | null;
  errors: string[];
  warnings: string[];
}

/** 版本迁移:把任意版本的原始数据升级到当前 SCHEMA_VERSION。 */
export function migrateProject(raw: any): { project: EditorProject | null; warnings: string[] } {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { project: null, warnings: ['数据不是有效对象'] };
  }

  let version: number = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

  // v0: 无 schemaVersion,视为旧 Model-like 数据
  if (version === 0) {
    warnings.push('检测到无 schemaVersion 的旧数据,按 v0 迁移到 v1');
    raw = modelToProject(raw as Model);
    version = 1;
  }

  // 未来: v1 -> v2 迁移在此追加
  // if (version === 1) { ... ; version = 2; }

  if (version !== SCHEMA_VERSION) {
    return { project: null, warnings: [...warnings, `不支持的 schemaVersion: ${version}`] };
  }

  return { project: raw as EditorProject, warnings };
}

/** 完整性检查:返回问题列表(引用悬空、ID 重复等)。 */
export interface IntegrityIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function integrityCheck(project: EditorProject): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const pieceIds = new Set<string>();
  for (const p of project.pieces) {
    if (pieceIds.has(p.id)) issues.push({ severity: 'error', message: `零件 ID 重复: ${p.id}` });
    pieceIds.add(p.id);
  }

  const partIds = new Set(project.parts.map((p) => p.id));
  for (const p of project.pieces) {
    if (!partIds.has(p.partId)) {
      issues.push({ severity: 'error', message: `零件 ${p.id} 引用了不存在的 partId: ${p.partId}` });
    }
  }

  for (const c of project.connections) {
    if (!pieceIds.has(c.pieceA)) issues.push({ severity: 'error', message: `连接引用了不存在的零件: ${c.pieceA}` });
    if (!pieceIds.has(c.pieceB)) issues.push({ severity: 'error', message: `连接引用了不存在的零件: ${c.pieceB}` });
  }

  // 步骤引用检查
  for (const step of project.steps) {
    for (const pid of step.addedPieceIds) {
      if (!pieceIds.has(pid)) {
        issues.push({ severity: 'error', message: `步骤 ${step.id} 引用了不存在的零件: ${pid}` });
      }
    }
  }

  // 未被任何步骤引用的零件
  const referenced = new Set<string>();
  for (const step of project.steps) step.addedPieceIds.forEach((id) => referenced.add(id));
  for (const p of project.pieces) {
    if (!referenced.has(p.id)) {
      issues.push({ severity: 'warning', message: `零件 ${p.id} 未被任何步骤引用` });
    }
  }

  return issues;
}

/**
 * 解析 JSON 字符串为 EditorProject。
 * 不合法数据不会抛异常;失败时返回 errors,由 UI 显示。
 */
export function parseProject(input: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let raw: any;
  try {
    raw = JSON.parse(input);
  } catch (e) {
    return { project: null, errors: ['JSON 解析失败: ' + (e as Error).message], warnings };
  }

  const { project, warnings: mw } = migrateProject(raw);
  warnings.push(...mw);
  if (!project) {
    return { project: null, errors: [...errors, '无法迁移到当前 schemaVersion'], warnings };
  }

  // 结构补全,避免缺字段导致运行时崩溃
  const normalized = normalizeProject(project);
  return { project: normalized, errors, warnings };
}

/** 补全缺失字段,保证编辑器不会因缺字段白屏。 */
export function normalizeProject(p: EditorProject): EditorProject {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: p.id || uid('proj'),
    metadata: { ...defaultMetadata(), ...(p.metadata || {}) },
    parts: Array.isArray(p.parts) ? p.parts : [],
    pieces: Array.isArray(p.pieces) ? p.pieces : [],
    connections: Array.isArray(p.connections) ? p.connections : [],
    steps: Array.isArray(p.steps) ? p.steps : [],
    cameraPresets: Array.isArray(p.cameraPresets) ? p.cameraPresets : [],
    transforms: p.transforms && typeof p.transforms === 'object' ? p.transforms : {},
    thumbnail: p.thumbnail || { source: 'auto' },
    validationInfo: p.validationInfo,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
  };
}

export function isSupportedSchema(v: number): boolean {
  return (SUPPORTED_SCHEMA_VERSIONS as readonly number[]).indexOf(v) >= 0 || v === SCHEMA_VERSION;
}

/** 可发布的零件清单(按形状+颜色汇总)。 */
export interface MaterialInventoryItem {
  shape: MagnetShape;
  color: string;
  name: string;
  count: number;
}
export function buildMaterialInventory(project: EditorProject): MaterialInventoryItem[] {
  const usage = new Map<string, MaterialInventoryItem>();
  const partMap = new Map(project.parts.map((p) => [p.id, p]));
  for (const piece of project.pieces) {
    const part = partMap.get(piece.partId);
    if (!part) continue;
    const key = `${part.shape}:${part.color}`;
    const existing = usage.get(key);
    if (existing) {
      existing.count++;
    } else {
      usage.set(key, { shape: part.shape, color: part.color, name: part.name, count: 1 });
    }
  }
  // 同步 parts.count
  for (const part of project.parts) {
    const key = `${part.shape}:${part.color}`;
    const u = usage.get(key);
    if (u) u.name = part.name;
  }
  return Array.from(usage.values());
}

/** 导出当前方案支持的形状清单(来自 shapeLibrary)。 */
export function exportShapes() {
  return Object.keys(shapeLibrary);
}

/** 用于将 piece transforms 同步为 solver 结果(吸附/连接后调用)。 */
export function resnapshotTransforms(project: EditorProject): Record<string, SerializableTransform> {
  const getShape = makeGetShape(project.parts, project.pieces);
  // P0-3: 传入 editor transforms,使求解器从根零件的当前位置开始
  return snapshotTransforms(project.pieces, project.connections, getShape, project.transforms);
}

export function transformFromSerializable(s: SerializableTransform): PieceTransform {
  return {
    position: new Vector3(s.position[0], s.position[1], s.position[2]),
    quaternion: new Quaternion(s.quaternion[0], s.quaternion[1], s.quaternion[2], s.quaternion[3]),
  };
}

export function serializableFromTransform(tf: PieceTransform): SerializableTransform {
  return {
    position: [tf.position.x, tf.position.y, tf.position.z],
    quaternion: [tf.quaternion.x, tf.quaternion.y, tf.quaternion.z, tf.quaternion.w],
  };
}

// 重新导出供 UI 使用
export { SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS };
export type { EditorProject, EditorMetadata, CameraPreset, SerializableTransform };
