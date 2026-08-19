import { EditorProject } from '../../editor/types';
import {
  serializeProjectAsScheme,
  parseScheme,
  schemeToEditorProject,
} from '../../engine/scheme';
import { resnapshotTransforms } from '../../editor/serialization';

/**
 * IndexedDB 草稿存储（P0-3: 持久化格式已切换为 SchemeDef v3）。
 *
 * - 保存：EditorProject → SchemeDef v3 → JSON
 * - 加载：JSON → SchemeDef v3（自动识别旧 v1 并迁移）→ EditorProject（运行时视图）
 * - 旧 v1 草稿在加载时一次性升级，回写为 v3
 * - transforms / validationInfo 不持久化，加载后由 solver / validator 重新推导
 *
 * P0-3 优化: 维护索引键 `magnet-editor-draft:index`,存储 [{key,name,updatedAt}]。
 * list() 只读索引(小 JSON),不再遍历 parse 所有草稿(含大 dataUrl 封面)。
 * save/remove 时增量更新索引。
 *
 * MVP 阶段使用 localStorage 兜底（IndexedDB 可选）。
 */

const LS_PREFIX = 'magnet-editor-draft:';
const INDEX_KEY = LS_PREFIX + 'index';

export interface DraftStore {
  save: (key: string, project: EditorProject) => void;
  load: (key: string) => Promise<EditorProject | null>;
  list: () => { key: string; name: string; updatedAt: string }[];
  remove: (key: string) => void;
}

/** 索引条目结构 */
interface IndexEntry {
  key: string;
  name: string;
  updatedAt: string;
}

/** P0-3: 读取草稿索引。首次访问或索引损坏时从全量扫描重建。 */
function readIndex(): IndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as IndexEntry[];
    }
  } catch {
    // 索引损坏,走重建
  }
  // 首次或损坏: 从全量扫描重建(一次性代价,后续走索引)
  return rebuildIndex();
}

/** P0-3: 全量扫描 localStorage 重建索引(仅首次/损坏时调用)。 */
function rebuildIndex(): IndexEntry[] {
  const out: IndexEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(LS_PREFIX) || k === INDEX_KEY) continue;
    const key = k.slice(LS_PREFIX.length);
    try {
      const json = localStorage.getItem(k);
      if (!json) continue;
      const scheme = parseScheme(json);
      const project = schemeToEditorProject(scheme);
      out.push({ key, name: project.metadata.name, updatedAt: project.updatedAt });
    } catch {
      // 跳过无法解析的草稿
    }
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(out));
  } catch {
    // 索引写入失败不影响功能
  }
  return out;
}

/** P0-3: 增量更新索引(upsert + 排序)。 */
function upsertIndex(entry: IndexEntry): void {
  const list = readIndex();
  const idx = list.findIndex((e) => e.key === entry.key);
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }
  list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    // 索引写入失败不影响功能
  }
}

/** P0-3: 从索引中移除条目。 */
function removeFromIndex(key: string): void {
  const list = readIndex().filter((e) => e.key !== key);
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    // 索引写入失败不影响功能
  }
}

function saveToLocalStorage(key: string, project: EditorProject): void {
  try {
    // P0-3: 持久化为 SchemeDef v3 JSON
    const json = serializeProjectAsScheme(project);
    localStorage.setItem(LS_PREFIX + key, json);
    // P0-3: 增量更新索引,避免 list() 全量 parse
    upsertIndex({ key, name: project.metadata.name, updatedAt: project.updatedAt });
  } catch (e) {
    console.warn('草稿保存失败:', e);
  }
}

function loadFromLocalStorage(key: string): EditorProject | null {
  try {
    const json = localStorage.getItem(LS_PREFIX + key);
    if (!json) return null;
    // P0-3: 自动识别 v3 / v1，旧 v1 草稿会被一次性迁移
    const scheme = parseScheme(json);
    const project = schemeToEditorProject(scheme);
    // 重新求解 transforms（持久化层不再保存这个）
    project.transforms = resnapshotTransforms(project);
    // 如果原数据是 v1，回写为 v3，避免下次再走迁移路径
    if (json.includes('"schemaVersion":1') || json.includes('"schemaVersion": 1')) {
      try {
        localStorage.setItem(LS_PREFIX + key, serializeProjectAsScheme(project));
      } catch {
        // 回写失败不影响加载
      }
    }
    return project;
  } catch (e) {
    console.warn('草稿加载失败:', e);
    return null;
  }
}

function listFromLocalStorage(): { key: string; name: string; updatedAt: string }[] {
  // P0-3: 只读索引,不再遍历 parse 所有草稿
  return readIndex();
}

// 模块级单例:固定对象引用,避免每次 render 返回新对象导致依赖它的 effect/useMemo 反复重排。
export const draftStore: DraftStore = {
  save: saveToLocalStorage,
  load: async (key) => loadFromLocalStorage(key),
  list: listFromLocalStorage,
  remove: (key) => {
    localStorage.removeItem(LS_PREFIX + key);
    // P0-3: 同步移除索引条目
    removeFromIndex(key);
  },
};

/** @deprecated 改用 draftStore 单例,保留以避免破坏外部调用方 */
export function useDraftStore(): DraftStore {
  return draftStore;
}
