import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { sites } from '@openai/sites-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    sites(),
    react(),
    {
      name: 'kill-stale-service-worker',
      configureServer(server) {
        // 拦截 /sw.js 请求，返回一个自注销的 SW 脚本
        // 这样旧 SW 会被替换为这个空 SW，然后自动注销自己 + 清理缓存 + 刷新页面
        server.middlewares.use((req, res, next) => {
          const url = req.url || ''
          if (url === '/sw.js' || url.startsWith('/sw.js?')) {
            res.setHeader('Content-Type', 'application/javascript')
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            res.end(`
              // 开发环境自动注销 SW 脚本
              self.addEventListener('install', function(e) {
                self.skipWaiting();
              });
              self.addEventListener('activate', function(e) {
                e.waitUntil(
                  Promise.all([
                    caches.keys().then(function(names) {
                      return Promise.all(names.map(function(n) { return caches.delete(n); }));
                    }),
                    self.registration.unregister()
                  ]).then(function() {
                    return self.clients.claim();
                  }).then(function() {
                    return self.clients.matchAll();
                  }).then(function(clients) {
                    clients.forEach(function(c) {
                      if (c.navigate) c.navigate(c.url);
                    });
                  })
                );
              });
              self.addEventListener('fetch', function(e) {
                // 不拦截任何请求
              });
            `)
            return
          }
          next()
        })
      },
    },
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // P1-11: 细化 manualChunks 分组,减小首屏 chunk 体积
        manualChunks(id) {
          const moduleId = id.replaceAll('\\', '/')
          if (!moduleId.includes('/node_modules/')) return undefined

          if (
            moduleId.includes('/node_modules/three/') ||
            moduleId.includes('/node_modules/@react-three/fiber/') ||
            moduleId.includes('/node_modules/@react-three/drei/')
          ) {
            return 'three'
          }
          if (
            moduleId.includes('/node_modules/react/') ||
            moduleId.includes('/node_modules/react-dom/') ||
            moduleId.includes('/node_modules/react-router-dom/')
          ) {
            return 'react'
          }
          if (moduleId.includes('/node_modules/lucide-react/')) {
            return 'icons'
          }
          return undefined
        },
      },
    },
  },
})
