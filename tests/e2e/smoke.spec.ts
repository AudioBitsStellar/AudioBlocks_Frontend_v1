import { expect, test } from '@playwright/test';

/**
 * Staging smoke test (#820).
 *
 * Runs after every deploy to staging against the real site and API, with no
 * mocks. The smoke-staging job in .github/workflows/deploy.yml runs it, and a
 * failure blocks promotion of the commit to production.
 *
 * Set PLAYWRIGHT_BASE_URL to the site and NEXT_PUBLIC_API_URL to the API base
 * (including /api). Without PLAYWRIGHT_BASE_URL it targets the local dev server.
 */

test.describe('deployed site smoke test', () => {
  test('home page responds and renders its main content', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok(), `GET / returned ${response?.status()}`).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('API health endpoint answers 200', async ({ request }) => {
    // The health route is mounted at the API origin, not under /api.
    const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? '')
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
    expect(apiOrigin, 'NEXT_PUBLIC_API_URL must be set for the smoke test').not.toBe('');
    const response = await request.get(`${apiOrigin}/health`);
    expect(response.status()).toBe(200);
  });
});
