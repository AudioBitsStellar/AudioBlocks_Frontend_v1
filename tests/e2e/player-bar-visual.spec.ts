import { test, expect } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const bp of BREAKPOINTS) {
  test.describe(`PlayerBar @ ${bp.name} (${bp.width}px)`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } });

    test.beforeEach(async ({ page }) => {
      // Navigate to a page that renders the player bar
      await page.goto('/');
      // Wait for the player bar to be visible
      await page
        .waitForSelector('[data-testid="player-bar"]', {
          state: 'visible',
          timeout: 10_000,
        })
        .catch(() => {
          // If no testid, try waiting for the player container
          return page.waitForSelector('footer, [class*="player"]', {
            state: 'visible',
            timeout: 10_000,
          });
        });
    });

    test('paused state', async ({ page }) => {
      // Ensure player is in paused state (default)
      const playerBar = page
        .locator('[data-testid="player-bar"]')
        .first()
        .or(page.locator('footer').first())
        .or(page.locator('[class*="player"]').first());

      await expect(playerBar).toHaveScreenshot(`player-bar-paused-${bp.name}.png`, {
        maxDiffPixelRatio: 0.001,
      });
    });

    test('playing state', async ({ page }) => {
      // Click play button to enter playing state
      const playButton = page.getByRole('button', { name: /play/i }).first();
      if (await playButton.isVisible()) {
        await playButton.click();
        // Wait for UI to reflect playing state
        await page.waitForTimeout(500);
      }

      const playerBar = page
        .locator('[data-testid="player-bar"]')
        .first()
        .or(page.locator('footer').first())
        .or(page.locator('[class*="player"]').first());

      await expect(playerBar).toHaveScreenshot(`player-bar-playing-${bp.name}.png`, {
        maxDiffPixelRatio: 0.001,
      });
    });

    test('loading state', async ({ page }) => {
      // Intercept audio requests to simulate buffering/loading
      await page.route('**/*.{mp3,wav,ogg,flac,m4a}', (route) => route.abort());

      const playButton = page.getByRole('button', { name: /play/i }).first();
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(500);
      }

      const playerBar = page
        .locator('[data-testid="player-bar"]')
        .first()
        .or(page.locator('footer').first())
        .or(page.locator('[class*="player"]').first());

      await expect(playerBar).toHaveScreenshot(`player-bar-loading-${bp.name}.png`, {
        maxDiffPixelRatio: 0.001,
      });
    });
  });
}
