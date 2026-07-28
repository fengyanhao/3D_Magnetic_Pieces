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
 * MVP 阶段使用 localStorage 兜底（IndexedDB 可选）。
 */

const LS_PREFIX = 'magnet-editor-draft:';

export interface DraftStore {
  save: (key: string, project: EditorProject) => void;
  load: (key: string) => Promise<EditorProject | null>;
  list: () => { key: string; name: string; updatedAt: string }[];
  remove: (key: string) => void;
}

function saveToLocalStorage(key: string, project: EditorProject): void {
  try {
    // P0-3: 持久化为 SchemeDef v3 JSON
    const json = serializeProjectAsScheme(project);
    localStorage.setItem(LS_PREFIX + key, json);
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
  const out: { key: string; name: string; updatedAt: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(LS_PREFIX)) continue;
    const key = k.slice(LS_PREFIX.length);
    const p = loadFromLocalStorage(key);
    if (p) out.push({ key, name: p.metadata.name, updatedAt: p.updatedAt });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// 模块级单例:固定对象引用,避免每次 render 返回新对象导致依赖它的 effect/useMemo 反复重排。
export const draftStore: DraftStore = {
  save: saveToLocalStorage,
  load: async (key) => loadFromLocalStorage(key),
  list: listFromLocalStorage,
  remove: (key) => localStorage.removeItem(LS_PREFIX + key),
};

/** @deprecated 改用 draftStore 单例,保留以避免破坏外部调用方 */
export function useDraftStore(): DraftStore {
  return draftStore;
}
