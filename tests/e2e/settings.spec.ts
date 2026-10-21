import { expect, test } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test('settings persist after reload and debounce preference sync', async ({ page }) => {
  await page
    .context()
    .addCookies([
      { name: 'audioblocks_jwt', value: 'mock-jwt-token', domain: 'localhost', path: '/' },
    ]);
  await page.addInitScript(() => localStorage.setItem('audioblocks_onboarding_complete', 'true'));

  const preferenceRequests: unknown[] = [];
  await page.route('**/api/user/preferences', async (route) => {
    if (route.request().method() === 'PUT') {
      preferenceRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, json: { success: true } });
      return;
    }
    await route.fallback();
  });

  await page.goto(`${BASE_URL}/dashboard/settings`);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Several quick changes should collapse into one debounced write.
  await page.getByRole('button', { name: /^High/ }).click();
  await page.getByRole('button', { name: /^Normal/ }).click();
  await page.getByRole('button', { name: /^High/ }).click();
  await page.getByRole('button', { name: 'Autoplay is on' }).click();

  await expect.poll(() => preferenceRequests.length, { timeout: 5_000 }).toBe(1);
  expect(preferenceRequests[0]).toMatchObject({ audioQuality: 'high', autoplay: false });
  await page.waitForTimeout(1_700);
  expect(preferenceRequests).toHaveLength(1);

  await page.reload();
  await expect(page.getByRole('button', { name: /^High/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Autoplay is off' })).toBeVisible();
});
