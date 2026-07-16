// Runtime environment detection utilities for standalone / file:// support

export const RUNTIME_FLAGS = {
  // 编译时由 Vite define 注入
  // __STANDALONE__ 来自 vite.standalone.config.ts 的 define
  isStandalone:
    typeof __STANDALONE__ !== 'undefined' ? Boolean(__STANDALONE__) : false,
};

/**
 * 当前是否在 file:// 协议下运行（双击 HTML 打开）
 */
export const isFileProtocol = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location?.protocol === 'file:';
};

/**
 * 当前是否应该使用 HashRouter。
 * 规则：
 * - standalone 构建：使用 HashRouter（不依赖服务器）
 * - file:// 协议：使用 HashRouter
 * - 其他：使用 BrowserRouter
 */
export const shouldUseHashRouter = (): boolean => {
  if (RUNTIME_FLAGS.isStandalone) return true;
  if (isFileProtocol()) return true;
  return false;
};

/**
 * 安全包装 localStorage，file:// 下可能不可用。
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 安全的 fetch 包装，file:// 下浏览器可能拒绝。
 */
export const safeFetch = async (input: RequestInfo | URL): Promise<Response> => {
  if (isFileProtocol()) {
    throw new Error('file:// 协议下不允许 fetch');
  }
  return fetch(input);
};
