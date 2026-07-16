import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// 离线单文件体验版构建配置
// 与 vite.config.ts 互不影响：
//   - dev: vite（端口 5174）
//   - build: tsc + vite build（正常多 chunk 产物）
//   - build:standalone: 走本配置，单 HTML 文件输出
export default defineConfig({
  define: {
    // 注入构建时常量
    __STANDALONE__: 'true',
  },
  plugins: [
    react(),
    // 把所有 JS/CSS/资源内联进单个 HTML
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2019',
    cssCodeSplit: false, // 禁止 CSS 拆分
    assetsInlineLimit: 100 * 1024 * 1024, // 把 < 100MB 资源都内联
    rollupOptions: {
      input: path.resolve(__dirname, 'index.standalone.html'),
      output: {
        // 强制单文件：禁用 manualChunks，否则会输出独立 chunk 文件
        manualChunks: undefined,
        inlineDynamicImports: true,
        // 关闭 hash，文件最终只有一个 index.html
        entryFileNames: 'assets/entry.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
