import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RUNTIME_FLAGS, isFileProtocol } from './utils/standalone';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 在 file:// 或 standalone 模式下，禁用 Service Worker / PWA / 缓存逻辑，
// 避免浏览器在无服务器协议下注册失败或抛错。
if (typeof window !== 'undefined') {
  const shouldSkipSW = RUNTIME_FLAGS.isStandalone || isFileProtocol();
  if (!shouldSkipSW && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (confirm('发现新版本，是否刷新更新？')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      }).catch((err) => {
        console.log('Service Worker 注册失败:', err);
      });
    });
  }
}
