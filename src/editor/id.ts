/**
 * 稳定、不可重复的 ID 生成器。
 * 不使用数组下标作为长期标识。优先使用 crypto.randomUUID,
 * 回退到时间戳+随机数,保证跨会话唯一。
 */
export function uid(prefix: string): string {
  let base: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    base = crypto.randomUUID();
  } else {
    base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return `${prefix}-${base}`;
}

/** 生成与给定前缀不冲突的唯一 ID(在已知集合中)。 */
export function uniqueId(prefix: string, existing: ReadonlySet<string> | string[]): string {
  const set = Array.isArray(existing) ? new Set(existing) : existing;
  let id = uid(prefix);
  let guard = 0;
  while (set.has(id) && guard < 1000) {
    id = uid(prefix);
    guard++;
  }
  return id;
}
