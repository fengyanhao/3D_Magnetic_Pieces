import { EditorProject } from './types';
import { SCHEMA_VERSION } from './types';
import { defaultMetadata } from './types';
import { uid, uniqueId } from './id';
import { PartDef, MagnetColor, MagnetShape } from '../data/types';
import {
  PieceRef, Connection, BuildStepV2,
  StepCamera, PieceEntranceConfig, EasingName, EntranceType,
} from '../engine/types';
import { resnapshotTransforms } from './serialization';

/**
 * 编辑器状态模型 + 撤销/重做。
 * 纯数据逻辑,无 React / DOM 依赖,便于未来小程序复用。
 *
 * 设计:
 * - history 是 EditorProject 快照栈(深拷贝);
 * - 每次"原子操作"产生新快照,push 到 past,清空 future;
 * - undo 把 current 推入 future,pop past -> current;
 * - redo 反之。
 */

export interface EditorHistory {
  past: EditorProject[];
  current: EditorProject;
  future: EditorProject[];
}

export const MAX_HISTORY = 100;

export function createEmptyProject(): EditorProject {
  const now = new Date().toISOString();
  const coverCamId = uid('cam');
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('proj'),
    metadata: defaultMetadata(),
    parts: [],
    pieces: [],
    connections: [],
    steps: [],
    cameraPresets: [
      { id: coverCamId, label: '封面镜头', position: [5, 5, 5], target: [0, 0, 0], zoom: 50 },
    ],
    transforms: {},
    thumbnail: { source: 'auto', cameraPresetId: coverCamId },
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialHistory(): EditorHistory {
  return { past: [], current: createEmptyProject(), future: [] };
}

function cloneProject(p: EditorProject): EditorProject {
  // P0-4: structuredClone 比 JSON 往返快 5-10x,且不丢 Date/Map 等结构(此处数据全可序列化,但保留语义更稳)。
  // 老旧环境(无 structuredClone,如非现代浏览器)降级到 JSON 方式。
  if (typeof structuredClone === 'function') {
    return structuredClone(p);
  }
  return JSON.parse(JSON.stringify(p)) as EditorProject;
}

/** 在执行 mutation 前调用:把当前快照压栈。 */
function pushHistory(h: EditorHistory): EditorHistory {
  const past = [...h.past, cloneProject(h.current)].slice(-MAX_HISTORY);
  return { ...h, past, future: [] };
}

/** 修改 current 但不入栈(用于自动同步 transforms / updatedAt 等派生字段)。 */
export function updateCurrent(h: EditorHistory, updater: (p: EditorProject) => EditorProject): EditorHistory {
  return { ...h, current: updater(h.current) };
}

/** 修改 current 并入栈(用于用户主动操作)。 */
export function commit(h: EditorHistory, updater: (p: EditorProject) => EditorProject): EditorHistory {
  const next = pushHistory(h);
  const current = updater(next.current);
  return { ...next, current: { ...current, updatedAt: new Date().toISOString() } };
}

export function undo(h: EditorHistory): EditorHistory {
  if (h.past.length === 0) return h;
  const past = [...h.past];
  const prev = past.pop()!;
  return {
    past,
    current: prev,
    future: [h.current, ...h.future].slice(0, MAX_HISTORY),
  };
}

export function redo(h: EditorHistory): EditorHistory {
  if (h.future.length === 0) return h;
  const future = [...h.future];
  const next = future.shift()!;
  return {
    past: [...h.past, h.current].slice(-MAX_HISTORY),
    current: next,
    future,
  };
}

export function canUndo(h: EditorHistory): boolean {
  return h.past.length > 0;
}

export function canRedo(h: EditorHistory): boolean {
  return h.future.length > 0;
}

/** 替换整个 current(用于新建 / 打开 / 导入)。清空历史。 */
export function replaceProject(_h: EditorHistory, project: EditorProject): EditorHistory {
  return { past: [], current: cloneProject(project), future: [] };
}

/* ----------------- 零件与连接操作 ----------------- */

/** 找到或创建一个 partId(同形状同颜色复用)。 */
function findOrCreatePart(project: EditorProject, shape: MagnetShape, color: MagnetColor): PartDef {
  const existing = project.parts.find((p) => p.shape === shape && p.color === color);
  if (existing) return existing;
  const labels: Record<MagnetShape, string> = {
    square: '正方形', rectangle: '长方形', 'equilateral-triangle': '等边三角形',
    'isosceles-triangle': '等腰三角形', 'right-triangle': '直角三角形',
    'long-right-triangle': '长直角三角形', trapezoid: '梯形', hexagon: '六边形',
    pentagon: '五边形', sector: '扇形', semicircle: '半圆形', rhombus: '菱形',
  };
  const part: PartDef = {
    id: uniqueId('part', project.parts.map((p) => p.id)),
    name: labels[shape],
    shape, color, count: 0,
  };
  project.parts.push(part);
  return part;
}

/**
 * 添加一个零件到方案。
 * @param placePosition 可选放置位置(世界坐标)。不传时根零件放原点,其他零件放视野中心附近(由调用方计算)。
 */
export function addPieceAction(
  h: EditorHistory,
  shape: MagnetShape,
  color: MagnetColor,
  placePosition?: [number, number, number],
): { history: EditorHistory; pieceId: string } {
  let pieceId = '';
  const history = commit(h, (p) => {
    const part = findOrCreatePart(p, shape, color);
    pieceId = uniqueId('piece', p.pieces.map((pp) => pp.id));
    const isRoot = p.pieces.length === 0;
    const piece: PieceRef = { id: pieceId, partId: part.id, isRoot };
    p.pieces.push(piece);
    if (isRoot) {
      // 根零件放原点(或指定位置)
      p.transforms[pieceId] = {
        position: placePosition ?? [0, 0, 0],
        quaternion: [0, 0, 0, 1],
      };
    } else {
      // 非根零件:使用指定位置,或默认放在原点附近(不再用 pieces.length*2 远距离偏移)
      p.transforms[pieceId] = {
        position: placePosition ?? [0.5, 0, 0.5],
        quaternion: [0, 0, 0, 1],
      };
    }
    // 自动同步 parts.count
    part.count = p.pieces.filter((pp) => pp.partId === part.id).length;
    return p;
  });
  return { history, pieceId };
}

/** 删除零件(级联清理连接和步骤引用)。 */
export function deletePieceAction(h: EditorHistory, pieceId: string): EditorHistory {
  return commit(h, (p) => {
    p.pieces = p.pieces.filter((pp) => pp.id !== pieceId);
    p.connections = p.connections.filter((c) => c.pieceA !== pieceId && c.pieceB !== pieceId);
    for (const step of p.steps) {
      step.addedPieceIds = step.addedPieceIds.filter((id) => id !== pieceId);
    }
    delete p.transforms[pieceId];
    // 重新同步 parts.count
    for (const part of p.parts) {
      part.count = p.pieces.filter((pp) => pp.partId === part.id).length;
    }
    // 移除空 part
    p.parts = p.parts.filter((part) => part.count > 0);
    return p;
  });
}

/** 复制一个零件(同 part,新 piece ID)。 */
export function duplicatePieceAction(h: EditorHistory, pieceId: string): { history: EditorHistory; newId: string } {
  let newId = '';
  const history = commit(h, (p) => {
    const src = p.pieces.find((pp) => pp.id === pieceId);
    if (!src) return p;
    newId = uniqueId('piece', p.pieces.map((pp) => pp.id));
    const copy: PieceRef = { id: newId, partId: src.partId, isRoot: false };
    p.pieces.push(copy);
    const srcTf = p.transforms[pieceId];
    if (srcTf) {
      p.transforms[newId] = {
        position: [srcTf.position[0] + 1, srcTf.position[1], srcTf.position[2]],
        quaternion: [...srcTf.quaternion] as [number, number, number, number],
      };
    }
    const part = p.parts.find((pp) => pp.id === src.partId);
    if (part) part.count = p.pieces.filter((pp) => pp.partId === part.id).length;
    return p;
  });
  return { history, newId };
}

/** 修改零件颜色(改 partId 指向,或新建 part)。 */
export function setPieceColorAction(h: EditorHistory, pieceId: string, color: MagnetColor): EditorHistory {
  return commit(h, (p) => {
    const piece = p.pieces.find((pp) => pp.id === pieceId);
    if (!piece) return p;
    const oldPart = p.parts.find((pp) => pp.id === piece.partId);
    if (!oldPart) return p;
    const newPart = findOrCreatePart(p, oldPart.shape, color);
    piece.partId = newPart.id;
    // 同步 count
    for (const part of p.parts) {
      part.count = p.pieces.filter((pp) => pp.partId === part.id).length;
    }
    p.parts = p.parts.filter((part) => part.count > 0);
    return p;
  });
}

/** 直接设置零件的 editor transform(自由移动 / 旋转,不创建连接)。 */
export function setPieceTransformAction(
  h: EditorHistory,
  pieceId: string,
  transform: { position: [number, number, number]; quaternion: [number, number, number, number] },
): EditorHistory {
  return commit(h, (p) => {
    p.transforms[pieceId] = transform;
    return p;
  });
}

/* ----------------- 连接操作 ----------------- */

/** 创建连接并立即重新求解 transforms。 */
export function createConnectionAction(
  h: EditorHistory,
  connection: Connection,
): EditorHistory {
  return commit(h, (p) => {
    p.connections.push(connection);
    p.transforms = resnapshotTransforms(p);
    return p;
  });
}

/** 断开连接。 */
export function removeConnectionAction(h: EditorHistory, index: number): EditorHistory {
  return commit(h, (p) => {
    p.connections.splice(index, 1);
    p.transforms = resnapshotTransforms(p);
    return p;
  });
}

/** 更新连接的二面角 / flip。 */
export function updateConnectionAction(
  h: EditorHistory,
  index: number,
  patch: Partial<Pick<Connection, 'dihedralDeg' | 'flip'>>,
): EditorHistory {
  return commit(h, (p) => {
    const c = p.connections[index];
    if (!c) return p;
    if (patch.dihedralDeg !== undefined) c.dihedralDeg = patch.dihedralDeg;
    if (patch.flip !== undefined) c.flip = patch.flip;
    p.transforms = resnapshotTransforms(p);
    return p;
  });
}

/* ----------------- 步骤操作 ----------------- */

/** 新增步骤(默认标题和描述非空)。 */
export function addStepAction(h: EditorHistory): { history: EditorHistory; stepId: number } {
  let stepId = 1;
  const history = commit(h, (p) => {
    stepId = p.steps.length > 0 ? Math.max(...p.steps.map((s) => s.id)) + 1 : 1;
    const step: BuildStepV2 = {
      id: stepId,
      title: `步骤 ${stepId}`,
      description: '',
      parentGuide: '',
      addedPieceIds: [],
      addedConnections: [],
    };
    p.steps.push(step);
    return p;
  });
  return { history, stepId };
}

/** 删除步骤。 */
export function deleteStepAction(h: EditorHistory, stepId: number): EditorHistory {
  return commit(h, (p) => {
    p.steps = p.steps.filter((s) => s.id !== stepId);
    return p;
  });
}

/** 调整步骤顺序(把 from 移到 to)。 */
export function moveStepAction(h: EditorHistory, fromIndex: number, toIndex: number): EditorHistory {
  return commit(h, (p) => {
    if (fromIndex < 0 || fromIndex >= p.steps.length) return p;
    const clamped = Math.max(0, Math.min(p.steps.length - 1, toIndex));
    const [moved] = p.steps.splice(fromIndex, 1);
    p.steps.splice(clamped, 0, moved);
    // 重新编号(保持 id 单调递增,便于引用稳定)
    p.steps.forEach((s, i) => (s.id = i + 1));
    return p;
  });
}

/** 更新步骤字段。 */
export function updateStepAction(
  h: EditorHistory,
  stepId: number,
  patch: Partial<Pick<BuildStepV2,
    'title' | 'description' | 'parentGuide' | 'addedPieceIds'
    | 'hint' | 'focusPoints' | 'highlightMs' | 'snapFeedback' | 'annotations'
  >>,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (patch.title !== undefined) step.title = patch.title;
    if (patch.description !== undefined) step.description = patch.description;
    if (patch.parentGuide !== undefined) step.parentGuide = patch.parentGuide;
    if (patch.addedPieceIds !== undefined) step.addedPieceIds = [...patch.addedPieceIds];
    if (patch.hint !== undefined) step.hint = patch.hint;
    if (patch.focusPoints !== undefined) step.focusPoints = [...patch.focusPoints];
    if (patch.highlightMs !== undefined) step.highlightMs = patch.highlightMs;
    if (patch.snapFeedback !== undefined) step.snapFeedback = patch.snapFeedback;
    if (patch.annotations !== undefined) step.annotations = { ...patch.annotations };
    return p;
  });
}

/** 把零件加入指定步骤的新增列表(去重)。 */
export function addPieceToStepAction(h: EditorHistory, stepId: number, pieceId: string): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (!step.addedPieceIds.includes(pieceId)) step.addedPieceIds.push(pieceId);
    return p;
  });
}

/** 把多片零件批量加入指定步骤(去重)。P1: 教学编排支持多选统一加入。 */
export function addPiecesToStepAction(h: EditorHistory, stepId: number, pieceIds: string[]): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    for (const pid of pieceIds) {
      if (!step.addedPieceIds.includes(pid)) step.addedPieceIds.push(pid);
    }
    return p;
  });
}

/** 把零件从指定步骤移除(同时清理其 entrance 配置)。P1: 教学编排支持移出步骤。 */
export function removePieceFromStepAction(h: EditorHistory, stepId: number, pieceId: string): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    step.addedPieceIds = step.addedPieceIds.filter((id) => id !== pieceId);
    if (step.entrance && step.entrance[pieceId]) {
      delete step.entrance[pieceId];
      if (Object.keys(step.entrance).length === 0) delete step.entrance;
    }
    if (step.annotations && step.annotations[pieceId]) {
      delete step.annotations[pieceId];
      if (Object.keys(step.annotations).length === 0) delete step.annotations;
    }
    return p;
  });
}

/** 把连接加入指定步骤。 */
export function addConnectionToStepAction(
  h: EditorHistory,
  stepId: number,
  connection: Connection,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    step.addedConnections.push(connection);
    return p;
  });
}

/* ----------------- P1: 教学编排字段操作 ----------------- */

/** 设置步骤镜头(作者保存的本步视角)。传 null 清除镜头。 */
export function setStepCameraAction(
  h: EditorHistory,
  stepId: number,
  camera: StepCamera | null,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (camera === null) {
      delete step.camera;
    } else {
      step.camera = { ...camera };
    }
    return p;
  });
}

/** 把当前编辑器视图(相机位置/target/zoom)保存为本步镜头。 */
export function captureCurrentViewAsStepCameraAction(
  h: EditorHistory,
  stepId: number,
  view: { position: [number, number, number]; target: [number, number, number]; zoom: number },
  transitionMs: number = 800,
): EditorHistory {
  return setStepCameraAction(h, stepId, {
    position: [...view.position],
    target: [...view.target],
    zoom: view.zoom,
    transitionMs,
  });
}

/** 设置步骤内某片零件的入场动画配置。传 null 清除该零件的 entrance(回退到默认)。 */
export function setPieceEntranceAction(
  h: EditorHistory,
  stepId: number,
  pieceId: string,
  config: PieceEntranceConfig | null,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (config === null) {
      if (step.entrance) {
        delete step.entrance[pieceId];
        if (Object.keys(step.entrance).length === 0) delete step.entrance;
      }
    } else {
      if (!step.entrance) step.entrance = {};
      step.entrance[pieceId] = { ...config };
    }
    return p;
  });
}

/** 批量设置步骤内多片零件的入场类型(快速给同批零件统一设置 drop/side/fade 等)。 */
export function batchSetEntranceTypeAction(
  h: EditorHistory,
  stepId: number,
  pieceIds: string[],
  type: EntranceType,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (!step.entrance) step.entrance = {};
    pieceIds.forEach((pid, idx) => {
      const existing = step.entrance![pid];
      step.entrance![pid] = {
        type,
        delayMs: idx * 150,
        durationMs: existing?.durationMs ?? 800,
        easing: existing?.easing ?? 'easeOutCubic',
        startOffset: existing?.startOffset,
        startRotation: existing?.startRotation,
      };
    });
    return p;
  });
}

/** 设置步骤内某片零件的入场参数(局部更新,保留其他字段)。 */
export function patchPieceEntranceAction(
  h: EditorHistory,
  stepId: number,
  pieceId: string,
  patch: Partial<Pick<PieceEntranceConfig, 'type' | 'delayMs' | 'durationMs' | 'easing' | 'startOffset' | 'startRotation'>>,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (!step.entrance) step.entrance = {};
    const existing = step.entrance[pieceId] ?? {
      type: 'drop' as EntranceType,
      delayMs: 0,
      durationMs: 800,
      easing: 'easeOutCubic' as EasingName,
    };
    step.entrance[pieceId] = {
      type: patch.type ?? existing.type,
      delayMs: patch.delayMs ?? existing.delayMs,
      durationMs: patch.durationMs ?? existing.durationMs,
      easing: patch.easing ?? existing.easing,
      startOffset: patch.startOffset ?? existing.startOffset,
      startRotation: patch.startRotation ?? existing.startRotation,
    };
    return p;
  });
}

/** 设置步骤的提示文字。 */
export function setStepHintAction(h: EditorHistory, stepId: number, hint: string): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (hint.trim() === '') delete step.hint;
    else step.hint = hint;
    return p;
  });
}

/** 设置步骤的观察重点列表。 */
export function setStepFocusPointsAction(h: EditorHistory, stepId: number, points: string[]): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    const filtered = points.map((s) => s.trim()).filter((s) => s.length > 0);
    if (filtered.length === 0) delete step.focusPoints;
    else step.focusPoints = filtered;
    return p;
  });
}

/** 设置步骤内某片零件的标注文字。传空串清除。 */
export function setPieceAnnotationAction(
  h: EditorHistory,
  stepId: number,
  pieceId: string,
  text: string,
): EditorHistory {
  return commit(h, (p) => {
    const step = p.steps.find((s) => s.id === stepId);
    if (!step) return p;
    if (text.trim() === '') {
      if (step.annotations) {
        delete step.annotations[pieceId];
        if (Object.keys(step.annotations).length === 0) delete step.annotations;
      }
    } else {
      if (!step.annotations) step.annotations = {};
      step.annotations[pieceId] = text;
    }
    return p;
  });
}

/* ----------------- 镜头预设 ----------------- */

export function saveCameraPresetAction(
  h: EditorHistory,
  preset: { label: string; position: [number, number, number]; target: [number, number, number]; zoom: number; stepId?: number },
): { history: EditorHistory; presetId: string } {
  let presetId = '';
  const history = commit(h, (p) => {
    presetId = uniqueId('cam', p.cameraPresets.map((c) => c.id));
    p.cameraPresets.push({ id: presetId, ...preset });
    return p;
  });
  return { history, presetId };
}

/* ----------------- 元数据 ----------------- */

export function updateMetadataAction(
  h: EditorHistory,
  patch: Partial<EditorProject['metadata']>,
): EditorHistory {
  return commit(h, (p) => {
    p.metadata = { ...p.metadata, ...patch };
    return p;
  });
}

/* ----------------- P2: 缩略图/封面 ----------------- */

/**
 * P2: 设置封面 dataURL(由 coverRenderer 生成)。
 * source 设为 'manual',dataUrl 内嵌到方案数据中。
 */
export function setThumbnailDataUrlAction(
  h: EditorHistory,
  dataUrl: string,
  cameraPresetId?: string,
): EditorHistory {
  return commit(h, (p) => {
    p.thumbnail = {
      source: 'manual',
      dataUrl,
      ...(cameraPresetId ? { cameraPresetId } : {}),
    };
    return p;
  });
}
