import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 清理旧 Service Worker 和缓存，避免历史缓存长期控制页面
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

// 本阶段完全禁止注册 Service Worker，避免开发环境被旧缓存控制。
// 未来如需生产环境 PWA，需满足：
// - 导航请求采用 Network First
// - 仅哈希静态资源使用 Cache First
// - index.html / sw.js / manifest 不得 immutable 缓存
// - 每次发布更新缓存版本号
// - 提供清理旧 Service Worker 的迁移方案
