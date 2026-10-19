import { test as base, type BrowserContext } from '@playwright/test';
import { getResponse } from 'msw';
import { handlers } from '../../../mocks/handlers';

/**
 * Answers `/api/**` requests from the shared MSW handlers (#603) through
 * Playwright route interception, so e2e tests use the same fixtures as Vitest
 * and `NEXT_PUBLIC_API_MOCKING`. Requests no handler matches (e.g. the app's
 * own `/api/session`) continue to the network.
 */
export async function routeApiThroughHandlers(context: BrowserContext): Promise<void> {
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const response = await getResponse(
      handlers,
      new Request(request.url(), {
        method: request.method(),
        headers: request.headers(),
        body: request.postDataBuffer() ?? undefined,
      })
    );
    if (!response) return route.fallback();
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
}

/** `test` with every API request served by the shared handlers. */
export const test = base.extend<{ mockApi: void }>({
  mockApi: [
    async ({ context }, use) => {
      await routeApiThroughHandlers(context);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
