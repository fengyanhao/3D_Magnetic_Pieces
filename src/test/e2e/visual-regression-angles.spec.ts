import { test, expect } from '@playwright/test';

/**
 * P2-7: 多角度透明材质视觉回归测试
 *
 * 在 0°、45°、90°、135° 四个视角下截图小房子教程页面,
 * 验证:
 * 1. 透明中心板在不同角度下不出现闪烁/拉丝
 * 2. 共面表面(外框/中心板)不出现 z-fighting
 * 3. 边线(LineSegments2)在所有角度都正确显示
 * 4. 整体颜色不发灰(sRGB + ACESFilmic)
 *
 * 注:这是视觉回归测试,首次运行会生成基线截图。
 * 后续运行会与基线对比,若有差异会失败。
 * 使用 --update-snapshots 重新生成基线。
 */

const ANGLES = [
  { name: 'front-0', label: '0° 正视图' },
  { name: 'angle-45', label: '45° 斜视图' },
  { name: 'side-90', label: '90° 侧视图' },
  { name: 'angle-135', label: '135° 反斜视图' },
];

test.describe('P2-7: 多角度透明材质视觉回归', () => {
  for (const angle of ANGLES) {
    test(`小房子 - ${angle.label}`, async ({ page }) => {
      await page.goto('/tutorial/house-1');
      // 等待 3D 场景加载
      await page.waitForSelector('[data-testid="magnet-scene"] canvas', { timeout: 10000 });
      // 等待场景渲染稳定
      await page.waitForTimeout(1500);

      // 通过 OrbitControls 模拟旋转:在 canvas 上拖拽到目标角度
      // 0° = 默认视角(不拖拽)
      // 45° = 向右拖拽一段
      // 90° = 向右拖拽更远
      // 135° = 向右拖拽最远
      const canvas = page.locator('[data-testid="magnet-scene"] canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas bounding box not found');

      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      if (angle.name !== 'front-0') {
        // 根据 angle 决定拖拽距离(向右拖拽模拟水平旋转)
        const dragDistance = angle.name === 'angle-45' ? box.width * 0.15
          : angle.name === 'side-90' ? box.width * 0.3
          : angle.name === 'angle-135' ? box.width * 0.45
          : 0;

        if (dragDistance > 0) {
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          // 分步拖拽,模拟连续旋转
          const steps = 5;
          for (let i = 1; i <= steps; i++) {
            await page.mouse.move(cx + (dragDistance * i) / steps, cy);
            await page.waitForTimeout(50);
          }
          await page.mouse.up();
          // 等待镜头稳定
          await page.waitForTimeout(800);
        }
      }

      // 截图整个场景区域
      await expect(page.locator('[data-testid="magnet-scene"]')).toHaveScreenshot(
        `house-angle-${angle.name}.png`,
        { maxDiffPixelRatio: 0.05, threshold: 0.2 },
      );
    });
  }
});
