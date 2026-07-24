import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', name: '首页' },
  { path: '/list', name: '方案列表' },
  { path: '/model/house-1', name: '方案详情-小房子' },
  { path: '/tutorial/house-1', name: '分步教学-小房子' },
  { path: '/learn', name: '学堂首页' },
  { path: '/learn/shapes', name: '形状百科' },
  { path: '/learn/connections', name: '连接教学' },
  { path: '/learn/structures', name: '结构教学' },
  { path: '/learn/safety', name: '安全页面' },
  { path: '/not-found-page-123', name: '404页面' },
];

for (const pageInfo of pages) {
  test(`${pageInfo.name} ${pageInfo.path} 视觉截图`, async ({ page }) => {
    await page.goto(pageInfo.path, { waitUntil: 'networkidle' });
    // 等待懒加载和动画稳定
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot(`${pageInfo.name.replace(/[\/\\]/g, '-')}.png`, {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });
}
