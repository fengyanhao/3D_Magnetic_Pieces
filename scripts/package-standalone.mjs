// 包装 release 为 ZIP
// 1. 调用 build-standalone 生成单文件 HTML
// 2. 写入使用说明.txt 和 版本信息.txt
// 3. 打包为 release/磁力片APP-离线体验版-v2.2.zip

import { spawn } from 'child_process';
import { existsSync, statSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const RELEASE_DIR = resolve(ROOT, 'release', '磁力片APP-离线体验版');

function log(msg) {
  console.log(`[package:standalone] ${msg}`);
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

function getVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '0.1.0';
  }
}

async function main() {
  log('1/4 调用 build:standalone 生成单文件 HTML...');
  await run('node', ['scripts/build-standalone.mjs']);

  log('2/4 写入 使用说明.txt 和 版本信息.txt ...');
  const version = getVersion();
  const releaseTime = new Date().toISOString();

  const usage = `亲子磁力片 - 离线体验版 使用说明
================================

【使用步骤】
1. 先把本压缩包解压到任意文件夹（路径可以包含中文和空格）。
2. 双击 "亲子磁力片体验版.html" 即可在浏览器中打开应用。
3. 推荐使用 Chrome 或 Edge 浏览器，体验最佳。
4. 首次打开可能需要几秒钟加载，请耐心等待。

【系统要求】
- Windows 10 / 11（推荐）
- macOS / Linux 也可以用浏览器打开
- Chrome 90+、Edge 90+、Firefox 88+、Safari 14+
- 不需要安装 Node.js / npm / Trae
- 不需要联网
- 不需要启动任何本地服务

【功能介绍】
- 首页：精选推荐、按主题浏览
- 磁力片学堂：认识磁力片、基础形状、基础连接、基础结构、安全与维护
- 模型列表：6 个精选模型，支持搜索、筛选
- 模型详情：3D 预览、零件清单、家长陪玩提示
- 分步教程：3D 模型分步搭建、步骤预览、拍照记录

【常见问题】
Q: 双击 HTML 没反应？
A: 请确认默认浏览器不是 IE/Edge 旧版；右键 → 打开方式 → 选 Chrome/Edge。

Q: 打开后页面是空白？
A: 部分杀毒软件会拦截 file:// 协议；请尝试把文件加入白名单，
   或直接拖到 Chrome 窗口中打开。

Q: 路由跳转不工作？
A: 离线版已自动使用 HashRouter，URL 形如：
   亲子磁力片体验版.html#/model/house-1
   刷新或前进后退都正常。

Q: 拍照/相册能用吗？
A: 在 file:// 模式下浏览器允许选择本地图片文件，
   但可能限制调用相机。如果想直接拍照，请使用手机浏览器
   打开本 HTML（通过 U 盘/邮件/网盘传到手机）。

Q: 收藏/进度保存了会丢吗？
A: localStorage 在 file:// 下通常可用，但部分浏览器/无痕模式
   会清除。建议不要清理浏览器 Cookie/站点数据。

Q: 模型在 3D 里看不清楚？
A: 在 3D 视图上按住鼠标左键拖动可旋转，
   滚轮缩放，右键平移。点击"重置视角"恢复默认。

【反馈与支持】
如有问题，请联系项目作者。

================================
版本：v${version}
构建时间：${releaseTime}
================================
`;

  const versionInfo = `产品名称：亲子磁力片（离线体验版）
版本号：v${version}
构建时间：${releaseTime}
构建模式：vite-plugin-singlefile 单文件内嵌
入口 HTML：亲子磁力片体验版.html
资源内嵌：是（所有 JS / CSS / 模型 / 封面已内嵌进 HTML）
Service Worker：已禁用
PWA 安装：已禁用
CDN 依赖：无
网络请求：无
是否需要 Node：否
是否需要本地服务器：否
浏览器要求：Chrome 90+ / Edge 90+ / Firefox 88+ / Safari 14+
最低分辨率：360 x 640
推荐分辨率：390 x 844（移动）/ 1280 x 720（桌面）
`;

  writeFileSync(join(RELEASE_DIR, '使用说明.txt'), usage, 'utf-8');
  writeFileSync(join(RELEASE_DIR, '版本信息.txt'), versionInfo, 'utf-8');

  log('3/4 打包为 ZIP...');
  const zipName = `磁力片APP-离线体验版-v${version}.zip`;
  const zipPath = resolve(ROOT, 'release', zipName);
  if (existsSync(zipPath)) rmSync(zipPath);

  // 用 PowerShell Compress-Archive 打包（Windows 原生支持，零依赖）
  await new Promise((resolveProm, reject) => {
    const psScript = `
$ErrorActionPreference = "Stop"
$source = "${RELEASE_DIR.replace(/\\/g, '\\\\')}"
$zip = "${zipPath.replace(/\\/g, '\\\\')}"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$source\\*" -DestinationPath $zip -Force
Write-Host "ZIP 已生成: $zip"
`;
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], { stdio: 'inherit' });
    child.on('exit', (code) => code === 0 ? resolveProm() : reject(new Error(`PowerShell 退出码 ${code}`)));
  });

  const zipSize = statSync(zipPath).size;
  const htmlSize = statSync(join(RELEASE_DIR, '亲子磁力片体验版.html')).size;

  log('4/4 完成');
  log('========================================');
  log(`  HTML 路径: ${join(RELEASE_DIR, '亲子磁力片体验版.html')}`);
  log(`  HTML 大小: ${(htmlSize / 1024 / 1024).toFixed(2)} MB`);
  log(`  ZIP  路径: ${zipPath}`);
  log(`  ZIP  大小: ${(zipSize / 1024 / 1024).toFixed(2)} MB`);
  log('========================================');
}

main().catch((err) => {
  console.error('[package:standalone] 失败:', err);
  process.exit(1);
});
