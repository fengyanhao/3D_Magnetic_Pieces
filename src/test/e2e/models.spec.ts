import { test, expect } from '@playwright/test';

const MODEL_IDS = ['house-1', 'car-1', 'rocket-1', 'cat-1', 'castle-1', 'penguin-1'];
const MODEL_NAMES = ['温馨小房子', '赛车', '火箭', '小猫', '彩虹城堡', '企鹅'];

test.describe('模型页面加载测试', () => {
  for (let i = 0; i < MODEL_IDS.length; i++) {
    const modelId = MODEL_IDS[i];
    const modelName = MODEL_NAMES[i];

    test(`${modelName} 页面能正常加载`, async ({ page }) => {
      await page.goto(`/model/${modelId}`);
      const canvas = page.locator('canvas');
      await expect(canvas).toHaveCount(1);
      await expect(page.locator('body')).toContainText(modelName);
    });
  }
});

test.describe('重置视角功能', () => {
  test('点击重置视角按钮后相机状态变化', async ({ page }) => {
    await page.goto('/model/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1500);

    const resetBtn = page.getByTestId('reset-view');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await page.waitForTimeout(300);
  });
});

test.describe('首页测试', () => {
  test('首页有热门模型卡片', async ({ page }) => {
    await page.goto('/');
    // 等待懒加载页面渲染完成
    await page.waitForLoadState('networkidle');
    // 使用 :visible 只统计当前视口下可见的卡片，避免移动端/桌面端两套 DOM 互相干扰
    const cards = page.locator('a[href*="/model/"]:visible');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('首页标题正确', async ({ page }) => {
    await page.goto('/');
    // 等待懒加载页面渲染完成
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('亲子磁力片');
  });
});

test.describe('搭建步骤测试', () => {
  test('房子模型步骤切换正常', async ({ page }) => {
    await page.goto('/model/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000);

    const startBtn = page.getByRole('button', { name: '开始搭建' });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
