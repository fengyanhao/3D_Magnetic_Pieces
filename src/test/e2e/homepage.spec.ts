import { test, expect } from '@playwright/test';

test('首页正常加载', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/亲子磁力片/);
});

test('模型列表页显示六个模型卡片', async ({ page }) => {
  await page.goto('/list');
  const cards = page.locator('[data-testid="model-card"]');
  await expect(cards).toHaveCount(6);
});

test('点击模型卡片进入详情页', async ({ page }) => {
  await page.goto('/list');
  const firstCard = page.locator('[data-testid="model-card"]').first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/model\//);
});

test('主题筛选功能', async ({ page }) => {
  await page.goto('/list');
  await page.waitForLoadState('networkidle');

  // 如果在移动端，先展开筛选面板
  const filterBtn = page.locator('button:has-text("筛选")');
  const filterCount = await filterBtn.count();
  if (filterCount > 0 && await filterBtn.first().isVisible()) {
    await filterBtn.first().click();
    await page.waitForTimeout(300);
  }

  // 点击房子主题（:visible 确保选中当前可见的按钮）
  const houseBtn = page.locator('button:has-text("房子"):visible').first();
  await houseBtn.click();

  // 等待URL更新
  await page.waitForURL(/theme=house/);
  await expect(page).toHaveURL(/theme=house/);
});

test('难度筛选功能', async ({ page }) => {
  await page.goto('/list');
  await page.waitForLoadState('networkidle');

  // 如果在移动端，先展开筛选面板
  const filterBtn = page.locator('button:has-text("筛选")');
  const filterCount = await filterBtn.count();
  if (filterCount > 0 && await filterBtn.first().isVisible()) {
    await filterBtn.first().click();
    await page.waitForTimeout(300);
  }

  // 点击简单难度（:visible 确保选中当前可见的按钮）
  const easyBtn = page.locator('button:has-text("简单"):visible').first();
  await easyBtn.click();

  // 等待URL更新
  await expect(page).toHaveURL(/difficulty=easy/);
});
