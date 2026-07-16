import { EditorProject } from '../../editor/types';
import { serializeProject, parseProject } from '../../editor/serialization';

/**
 * IndexedDB 草稿存储。
 * MVP 阶段使用 localStorage 兜底(IndexedDB 可选)。
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
    const json = serializeProject(project);
    localStorage.setItem(LS_PREFIX + key, json);
  } catch (e) {
    console.warn('草稿保存失败:', e);
  }
}

function loadFromLocalStorage(key: string): EditorProject | null {
  try {
    const json = localStorage.getItem(LS_PREFIX + key);
    if (!json) return null;
    const r = parseProject(json);
    return r.project;
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

export function useDraftStore(): DraftStore {
  return {
    save: saveToLocalStorage,
    load: async (key) => loadFromLocalStorage(key),
    list: listFromLocalStorage,
    remove: (key) => localStorage.removeItem(LS_PREFIX + key),
  };
}
