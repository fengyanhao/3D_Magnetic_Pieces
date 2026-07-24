import { useState } from 'react';

export interface DraftEntry {
  key: string;
  name: string;
  updatedAt: string;
}

interface Props {
  drafts: DraftEntry[];
  currentProjectId: string;
  onOpen: (key: string) => void;
  onDelete: (key: string, name: string) => void;
  onClose: () => void;
}

/** 草稿管理模态框(P0-5):列出最近草稿,支持打开/删除。 */
export function DraftManagerModal({ drafts, currentProjectId, onOpen, onDelete, onClose }: Props) {
  const [query, setQuery] = useState('');

  const filtered = drafts.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()) || d.key.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="draft-modal-title" className="text-sm font-semibold text-gray-800">最近草稿</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="关闭草稿管理"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-2 border-b">
          <label htmlFor="draft-search" className="sr-only">搜索草稿</label>
          <input
            id="draft-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索草稿名称…"
            className="w-full px-2 py-1 text-xs border rounded"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">暂无草稿</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((d) => {
                const isCurrent = d.key === currentProjectId;
                return (
                  <li key={d.key} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-800 truncate">{d.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">当前</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        <span className="font-mono">{d.key}</span>
                        <span className="mx-1">·</span>
                        <span>更新: {formatTime(d.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => onOpen(d.key)}
                        disabled={isCurrent}
                        className={`text-xs px-2 py-1 rounded ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        打开
                      </button>
                      <button
                        onClick={() => onDelete(d.key, d.name)}
                        className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-2 border-t text-[10px] text-gray-400">
          草稿按 project.id 独立保存,新建/导入前会自动保存当前项目快照。
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
