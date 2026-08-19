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
import { solveConnections, computeTransformFromConnection } from '../engine/solver';
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
  const res = solveConnections({ pieces, connections, rootPieceId: root.id, getShapeForPiece, rootTransform, groundLock: false });
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
    // P2: 优先用编辑器生成的真实 3D 渲染封面;无封面时为空(ModelCard 有 fallback)
    coverImage: project.thumbnail?.dataUrl ?? '',
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
      // P1: 教学编排字段透传到用户端 Model,使 TutorialPlayer 能读取
      ...(s.camera ? { camera: { ...s.camera } } : {}),
      ...(s.entrance ? { entrance: { ...s.entrance } } : {}),
      ...(s.highlightMs !== undefined ? { highlightMs: s.highlightMs } : {}),
      ...(s.snapFeedback ? { snapFeedback: s.snapFeedback } : {}),
      ...(s.annotations ? { annotations: { ...s.annotations } } : {}),
      ...(s.hint ? { hint: s.hint } : {}),
      ...(s.focusPoints ? { focusPoints: [...s.focusPoints] } : {}),
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
    // P0-1: 所有 v2 模型已统一使用 addedPieceIds,移除 v1 addedPieces 兼容降级
    addedPieceIds: s.addedPieceIds ? [...s.addedPieceIds] : [],
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
//
// P0-3: 持久化真值已切换到 SchemeDef v3（engine/scheme.ts）。
//   - 草稿保存 / 加载：走 draftStore.ts，内部调用 serializeProjectAsScheme / parseScheme
//   - 文件导出 / 导入：应调用 serializeProjectAsScheme / parseScheme
//   - 旧 serializeProject / parseProject 保留为运行时调试与测试用途，
//     不再作为持久化入口。新代码不要调用它们做持久化。
//

/** @deprecated 持久化请改用 serializeProjectAsScheme（输出 SchemeDef v3）。 */
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
 *
 * @deprecated 持久化加载请改用 parseScheme + schemeToEditorProject（自动识别 v1/v3）。
 *   此函数仅保留以兼容现有测试与运行时调试路径。
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

/**
 * P1-5: 增量重算 transforms — 只更新受影响连接的子树。
 *
 * 修改连接 changedConnIndex 的 dihedralDeg/flip 后,只有该连接的 attach 零件
 * 及其下游子树需要重算,base 零件及其上游保持不变。
 *
 * 步骤:
 * 1. 复用现有 project.transforms 作为基础
 * 2. 从根 BFS(跳过修改的连接)确定 base/attach 方向 — base 可达,attach 不可达
 * 3. 用修改后的连接参数重算 attach 零件 transform
 * 4. 从 attach 零件开始 BFS,重算其子树
 *
 * 回退: 任何异常(找不到根/形状/transform)时回退到全量 resnapshotTransforms。
 */
export function resnapshotTransformsForConnection(
  project: EditorProject,
  changedConnIndex: number,
): Record<string, SerializableTransform> {
  const conn = project.connections[changedConnIndex];
  if (!conn) return resnapshotTransforms(project);

  const pieces = project.pieces;
  if (pieces.length === 0) return {};

  const root = pieces.find((p) => p.isRoot) || pieces[0];
  const getShape = makeGetShape(project.parts, project.pieces);

  // 构建邻接表
  const adj: Record<string, { conn: Connection; neighbor: string; connIndex: number }[]> = {};
  project.connections.forEach((c, idx) => {
    if (!adj[c.pieceA]) adj[c.pieceA] = [];
    if (!adj[c.pieceB]) adj[c.pieceB] = [];
    adj[c.pieceA].push({ conn: c, neighbor: c.pieceB, connIndex: idx });
    adj[c.pieceB].push({ conn: c, neighbor: c.pieceA, connIndex: idx });
  });

  // 从根 BFS(跳过修改的连接),标记可达零件 — 可达的是 base 侧
  const reachable = new Set<string>([root.id]);
  const reachQueue = [root.id];
  while (reachQueue.length > 0) {
    const cur = reachQueue.shift()!;
    for (const { neighbor, connIndex } of adj[cur] || []) {
      if (connIndex === changedConnIndex) continue;
      if (reachable.has(neighbor)) continue;
      reachable.add(neighbor);
      reachQueue.push(neighbor);
    }
  }

  // 确定方向: 可达的是 base,不可达的是 attach
  const baseId = reachable.has(conn.pieceA) ? conn.pieceA : conn.pieceB;
  const attachId = baseId === conn.pieceA ? conn.pieceB : conn.pieceA;

  // 复用现有 transforms(未受影响的部分保持不变)
  const result: Record<string, SerializableTransform> = { ...project.transforms };
  const baseSer = result[baseId];
  if (!baseSer) return resnapshotTransforms(project); // 回退

  const baseShape = getShape(baseId);
  const attachShape = getShape(attachId);
  if (!baseShape || !attachShape) return resnapshotTransforms(project);

  const isA = conn.pieceA === baseId;
  const basePortId = isA ? conn.portA : conn.portB;
  const attachPortId = isA ? conn.portB : conn.portA;

  // 用修改后的连接参数重算 attach 零件 transform
  const baseTf = transformFromSerializable(baseSer);
  const newAttachTf = computeTransformFromConnection(
    baseTf, baseShape, basePortId, attachShape, attachPortId,
    conn.dihedralDeg, conn.flip || false,
  );
  if (!newAttachTf) return resnapshotTransforms(project);

  result[attachId] = {
    position: [newAttachTf.position.x, newAttachTf.position.y, newAttachTf.position.z],
    quaternion: [newAttachTf.quaternion.x, newAttachTf.quaternion.y, newAttachTf.quaternion.z, newAttachTf.quaternion.w],
  };

  // 从 attach 零件开始 BFS,重算其子树(跳过已处理的修改连接)
  const bfsQueue = [attachId];
  const visited = new Set<string>([root.id, attachId]);
  while (bfsQueue.length > 0) {
    const cur = bfsQueue.shift()!;
    const curSer = result[cur];
    if (!curSer) continue;
    const curTf = transformFromSerializable(curSer);

    for (const { conn: c, neighbor, connIndex } of adj[cur] || []) {
      if (connIndex === changedConnIndex) continue; // 已处理
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);

      const bShape = getShape(cur);
      const aShape = getShape(neighbor);
      if (!bShape || !aShape) continue;

      const isA2 = c.pieceA === cur;
      const nextTf = computeTransformFromConnection(
        curTf, bShape, isA2 ? c.portA : c.portB, aShape, isA2 ? c.portB : c.portA,
        c.dihedralDeg, c.flip || false,
      );
      if (!nextTf) continue;

      result[neighbor] = {
        position: [nextTf.position.x, nextTf.position.y, nextTf.position.z],
        quaternion: [nextTf.quaternion.x, nextTf.quaternion.y, nextTf.quaternion.z, nextTf.quaternion.w],
      };
      bfsQueue.push(neighbor);
    }
  }

  return result;
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
