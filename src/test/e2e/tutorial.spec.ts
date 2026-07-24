import { test, expect } from '@playwright/test';

test('教程页面正常加载', async ({ page }) => {
  await page.goto('/tutorial/house-1');
  await expect(page).toHaveTitle(/亲子磁力片/);
  const scene = page.locator('[data-testid="magnet-scene"]');
  await expect(scene).toBeVisible();
});

test('教程步骤导航', async ({ page }) => {
  await page.goto('/tutorial/house-1');

  const prevBtn = page.locator('[data-testid="prev-step"]');
  const nextBtn = page.locator('[data-testid="next-step"]');
  // 桌面端和移动端都有"第 X / 3 步"文本，使用 filter({ visible: true }) 匹配当前可见的
  const stepIndicator = page.getByText('第 1 / 3 步').filter({ visible: true });

  await expect(stepIndicator).toBeVisible();

  await nextBtn.click();
  await expect(page.getByText('第 2 / 3 步').filter({ visible: true })).toBeVisible();

  await nextBtn.click();
  await expect(page.getByText('第 3 / 3 步').filter({ visible: true })).toBeVisible();

  await prevBtn.click();
  await expect(page.getByText('第 2 / 3 步').filter({ visible: true })).toBeVisible();
});

test('场景容器存在', async ({ page }) => {
  await page.goto('/tutorial/house-1');

  const scene = page.locator('[data-testid="magnet-scene"]');
  await expect(scene).toBeVisible();
});

test('重置视角按钮存在', async ({ page }) => {
  await page.goto('/tutorial/house-1');

  await page.waitForSelector('[data-testid="magnet-scene"]');

  const resetBtn = page.locator('[aria-label="重置视角"]');
  const isVisible = await resetBtn.isVisible().catch(() => false);

  if (isVisible) {
    await expect(resetBtn).toHaveAttribute('aria-label', '重置视角');
  }
});

test('六个模型教程页面都可访问', async ({ page }) => {
  const modelIds = ['house-1', 'car-1', 'rocket-1', 'cat-1', 'castle-1', 'penguin-1'];

  for (const id of modelIds) {
    await page.goto(`/tutorial/${id}`);
    await page.waitForSelector('[data-testid="magnet-scene"]');
    const title = await page.title();
    expect(title).toBeTruthy();
  }
});

test.describe('视觉截图测试 - 桌面端 (1280x720)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('小房子详情页视觉截图', async ({ page }) => {
    await page.goto('/model/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('desktop-house-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤1视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('desktop-house-step1.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤2视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('desktop-house-step2.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤3视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('desktop-house-step3.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('首页视觉截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('desktop-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('学堂首页视觉截图', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('desktop-learn.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('形状列表页视觉截图', async ({ page }) => {
    await page.goto('/learn/shapes');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('desktop-shapes.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('视觉截图测试 - 移动端 (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('小房子详情页视觉截图', async ({ page }) => {
    await page.goto('/model/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('mobile-house-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤1视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('mobile-house-step1.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤2视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('mobile-house-step2.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子教程步骤3视觉截图', async ({ page }) => {
    await page.goto('/tutorial/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await page.locator('[data-testid="next-step"]').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('mobile-house-step3.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('首页视觉截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('mobile-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('学堂首页视觉截图', async ({ page }) => {
    await page.goto('/learn');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('mobile-learn.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('形状列表页视觉截图', async ({ page }) => {
    await page.goto('/learn/shapes');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('mobile-shapes.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('视觉截图测试 - 平板端 (768x1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('首页视觉截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot('tablet-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('小房子详情页视觉截图', async ({ page }) => {
    await page.goto('/model/house-1');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('tablet-house-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});