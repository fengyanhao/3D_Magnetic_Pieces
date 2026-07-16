import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isFileProtocol } from './utils/standalone';

// 隐藏启动 splash
function hideSplash() {
  const el = document.getElementById('boot-splash');
  if (el) {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 350);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// React 完成首屏挂载后隐藏 splash
requestAnimationFrame(() => {
  setTimeout(hideSplash, 100);
});

// 兜底：2.5s 后无论是否挂载完成都强制隐藏 splash，避免黑屏
setTimeout(hideSplash, 2500);

// standalone 模式下绝不注册 Service Worker
if (isFileProtocol()) {
  // 友好提示浏览器能力受限
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.info('[亲子磁力片] 离线体验版运行中。file:// 模式下不注册 Service Worker，不发起任何网络请求。');
  }
}
