// 离线版验收脚本：
// - 验证 HTML 在 file:// 协议下能正常加载
// - 验证首页、模型列表、模型详情、步骤页都正常
// - 验证 3D Canvas 出现
// - 验证无 Network 外网请求、无 console 报错
// 使用 Playwright（已安装在 devDependencies）
import { chromium } from 'playwright';
import { existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
// 优先使用环境变量指定的 HTML 路径
const HTML = process.env.STANDALONE_HTML
  ? resolve(process.env.STANDALONE_HTML)
  : resolve(ROOT, 'release', '磁力片APP-离线体验版', '亲子磁力片体验版.html');

if (!existsSync(HTML)) {
  console.error(`未找到 ${HTML}，请先运行 npm run build:standalone`);
  process.exit(1);
}

const htmlSize = (statSync(HTML).size / 1024 / 1024).toFixed(2);
const fileUrl = pathToFileURL(HTML).href;

console.log('=========================================');
console.log(`  离线版验收 - file:// 模式`);
console.log(`  HTML: ${HTML}`);
console.log(`  大小: ${htmlSize} MB`);
console.log(`  URL:  ${fileUrl}`);
console.log('=========================================');

const results = { passed: 0, failed: 0, warnings: 0 };
const networkRequests = [];
const externalRequests = [];
const consoleErrors = [];

function pass(name) { results.passed++; console.log(`  ✓ ${name}`); }
function fail(name, reason) { results.failed++; console.log(`  ✗ ${name} - ${reason}`); }
function warn(name, reason) { results.warnings++; console.log(`  ⚠ ${name} - ${reason}`); }

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    offline: true, // 强制断网
  });
  const page = await context.newPage();

  page.on('request', (req) => {
    const url = req.url();
    networkRequests.push(url);
    if (url.startsWith('http://') || url.startsWith('https://')) {
      externalRequests.push(url);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 忽略一些已知无害报错
      if (text.includes('favicon')) return;
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    console.log('\n[1/6] 加载首页 file:// ...');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // React 挂载需要时间
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    if (title.includes('亲子磁力片')) pass(`首页标题正确: ${title}`);
    else fail('首页标题', `期望包含"亲子磁力片"，实际: ${title}`);

    const bodyText = await page.locator('body').innerText();
    if (bodyText.includes('精选推荐') || bodyText.includes('磁力片')) pass('首页内容渲染');
    else warn('首页内容', '未识别到关键文案');

    console.log('\n[2/6] 测试 hash 路由跳转 - 磁力片学堂 ...');
    await page.goto(`${fileUrl}#/learn`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const learnText = await page.locator('body').innerText();
    if (learnText.includes('磁力片学堂') || learnText.includes('基础形状') || learnText.includes('认识磁力片')) {
      pass('学堂首页可访问');
    } else {
      fail('学堂首页', '未找到学堂内容');
    }

    console.log('\n[3/6] 测试模型详情页 ...');
    await page.goto(`${fileUrl}#/model/house-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // 检查 canvas 是否出现
    const canvasCount = await page.locator('canvas').count();
    if (canvasCount > 0) pass(`3D Canvas 已加载 (${canvasCount} 个)`);
    else fail('3D Canvas', '未找到 canvas 元素');

    console.log('\n[4/6] 测试教程页 ...');
    await page.goto(`${fileUrl}#/tutorial/house-1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    const tutorialText = await page.locator('body').innerText();
    // 检查 step indicator 出现
    const hasStep = tutorialText.includes('步骤') || tutorialText.includes('第') || tutorialText.includes('温馨');
    if (hasStep) pass('教程页内容渲染');
    else warn('教程页', '未识别到步骤文案');

    // 检查下一步按钮
    const nextBtn = page.locator('[data-testid="next-step"]');
    if (await nextBtn.count() > 0) pass('教程下一步按钮存在');
    else warn('教程按钮', '未找到 data-testid="next-step"');

    console.log('\n[5/6] 测试刷新深层 URL ...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const afterReload = await page.locator('body').innerText();
    if (afterReload.length > 100) pass('深层 URL 刷新后内容存在');
    else fail('深层 URL 刷新', '刷新后内容丢失');

    console.log('\n[6/6] 检查 Network 和 Console ...');
    if (externalRequests.length === 0) pass(`无外网请求（共 ${networkRequests.length} 个本地资源）`);
    else fail('外网请求', `有 ${externalRequests.length} 个外网请求: ${externalRequests.slice(0,3).join(', ')}`);

    if (consoleErrors.length === 0) pass('无 console 报错');
    else fail('Console 报错', `${consoleErrors.length} 个错误: ${consoleErrors.slice(0,3).join(' | ')}`);

  } catch (err) {
    fail('总体测试', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n=========================================');
  console.log(`  验收结果`);
  console.log(`  ✓ 通过: ${results.passed}`);
  console.log(`  ✗ 失败: ${results.failed}`);
  console.log(`  ⚠ 警告: ${results.warnings}`);
  console.log(`  本地资源请求: ${networkRequests.length}`);
  console.log(`  外网请求: ${externalRequests.length}`);
  console.log(`  Console 错误: ${consoleErrors.length}`);
  console.log('=========================================');
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
