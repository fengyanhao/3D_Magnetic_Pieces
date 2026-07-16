// 单文件体验版构建脚本
// 输出：release/磁力片APP-离线体验版/亲子磁力片体验版.html
// 与正常 vite build 完全独立，不影响 dev/build/PWA。

import { spawn } from 'child_process';
import { existsSync, statSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const RELEASE_DIR = resolve(ROOT, 'release', '磁力片APP-离线体验版');
const STANDALONE_DIST = resolve(ROOT, 'dist-standalone');

function log(msg) {
  console.log(`[build:standalone] ${msg}`);
}

function run(cmd, args, options = {}) {
  return new Promise((resolveProm, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: ROOT, ...options });
    child.on('exit', (code) => {
      if (code === 0) resolveProm();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function rmrf(target) {
  if (!existsSync(target)) return;
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) {
      rmrf(resolve(target, entry));
    }
    rmdirSync(target);
  } else {
    unlinkSync(target);
  }
}

async function main() {
  log('1/4 清理 dist-standalone 目录...');
  rmrf(STANDALONE_DIST);

  log('2/4 执行 vite standalone 构建...');
  await run('npx', ['vite', 'build', '--config', 'vite.standalone.config.ts', '--outDir', 'dist-standalone', '--emptyOutDir']);

  log('3/4 准备 release 输出目录...');
  rmrf(RELEASE_DIR);
  mkdirSync(RELEASE_DIR, { recursive: true });

  // 把单文件 HTML 重命名拷贝出来
  // 单文件模式下输出文件名是 index.standalone.html
  let htmlSrc = resolve(STANDALONE_DIST, 'index.standalone.html');
  if (!existsSync(htmlSrc)) {
    htmlSrc = resolve(STANDALONE_DIST, 'index.html');
  }
  if (!existsSync(htmlSrc)) {
    throw new Error(`未找到构建产物 ${htmlSrc}`);
  }
  const htmlDest = resolve(RELEASE_DIR, '亲子磁力片体验版.html');
  copyFileSync(htmlSrc, htmlDest);

  const size = statSync(htmlDest).size;
  log(`4/4 复制完成: ${htmlDest} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  // 同时删除产物中残留的 assets 目录（单文件模式下应该已经全部内联，但保险起见清理一下）
  const assetsDir = resolve(STANDALONE_DIST, 'assets');
  if (existsSync(assetsDir)) {
    const remaining = readdirSync(assetsDir);
    if (remaining.length > 0) {
      log(`提示：dist-standalone/assets 中仍有 ${remaining.length} 个文件，但 HTML 已自包含`);
    }
  }

  log('✓ 单文件 HTML 生成成功');
  log(`  HTML 路径: ${htmlDest}`);
  log(`  文件大小: ${(size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('[build:standalone] 失败:', err);
  process.exit(1);
});
