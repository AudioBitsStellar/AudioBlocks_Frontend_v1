import { mockCommunityArtistsFixture } from '../../mocks/fixtures/community';
import { expect, test } from './fixtures/network';

/**
 * E2E: the community page renders the leaderboard served by the shared MSW
 * handlers (#603) — the same fixtures Vitest and `NEXT_PUBLIC_API_MOCKING` use.
 */
test('community vote tab lists the artists from the shared fixtures', async ({ context, page }) => {
  // Any Privy cookie passes the dashboard middleware; onboarding is marked done
  // so OnboardingRedirect does not leave the page.
  await context.addCookies([{ name: 'privy-token', value: 'e2e', domain: 'localhost', path: '/' }]);
  await context.addInitScript(() =>
    window.localStorage.setItem('audioblocks_onboarding_complete', 'true')
  );

  await page.goto('/dashboard/community');

  for (const artist of mockCommunityArtistsFixture) {
    await expect(page.getByRole('heading', { name: artist.name })).toBeVisible();
  }
});
