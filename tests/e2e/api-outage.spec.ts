import { expect, test } from './fixtures/network';

/**
 * API-outage mode (#816): fail the API in the browser, check the shell keeps
 * working and the notice appears, then bring the API back and check it clears.
 *
 * The `test` fixture answers `/api/**` from the shared MSW handlers. The route
 * added inside each test is registered later, so it runs first. It aborts API
 * requests while `apiDown` is true and hands the rest back with `fallback()`.
 */
const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').origin;

// A service worker answers failed API GETs from its cache, which would hide the
// outage from the app. This test exercises the app's own detection instead.
test.use({ serviceWorkers: 'block' });

test.describe('API outage mode (#816)', () => {
  test.setTimeout(180_000);

  test('keeps the shell usable, shows the notice, and clears it when the API returns', async ({
    page,
    context,
  }) => {
    let apiDown = true;
    await context.route(
      (url) => url.origin === API_ORIGIN,
      (route) => (apiDown ? route.abort('connectionrefused') : route.fallback())
    );

    await page.goto('/');

    const notice = page.getByRole('status').filter({ hasText: 'cannot reach its servers' });
    await expect(notice).toBeVisible({ timeout: 90_000 });

    // The shell still renders: the main landmark is there and no error boundary has replaced the page.
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByText('Oops! Something went wrong')).toHaveCount(0);

    apiDown = false;
    await notice.getByRole('button', { name: 'Retry now' }).click();

    await expect(notice).toBeHidden({ timeout: 90_000 });
  });
});
