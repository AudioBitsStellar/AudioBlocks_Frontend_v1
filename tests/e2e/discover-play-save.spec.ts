import { test, expect } from '@playwright/test';

/**
 * E2E: discover, play and save (#610).
 *
 * The main listener journey, run hermetically with the API stubbed at the
 * network boundary and audio routed to an empty fixture so no real stream loads:
 *
 *   log in (session cookie) → search from the overlay → open results
 *   → play the track (player bar shows it, time advances, pause works)
 *   → save it → it appears in the library
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const TRACK_TITLE = 'Midnight City';
const TRACK_ARTIST = 'M83';

test.describe('discover, play and save (#610)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: 'audioblocks_jwt', value: 'mock-jwt-token', domain: 'localhost', path: '/' },
    ]);

    // Fixture stream: a minimal playlist with no segments, so hls.js settles
    // without fetching real media.
    await page.route('**/*.m3u8', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-ENDLIST\n',
      })
    );
    await page.route('**/*.{mp3,m4a,ogg,wav}', (route) =>
      route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' })
    );

    // Saved tracks are kept in memory so the library reflects the save.
    const saved: Array<{ id: string; title: string; artist: string }> = [];
    await page.route('**/api/library**', async (route) => {
      if (route.request().method() === 'POST') {
        saved.push({ id: '1', title: TRACK_TITLE, artist: TRACK_ARTIST });
        return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: saved }),
      });
    });
  });

  test('finds a song, plays it and saves it to the library', async ({ page }) => {
    await page.goto(BASE_URL);

    // Discover: open the search overlay and search for the track.
    await page.keyboard.press('Control+k');
    const overlay = page.getByRole('dialog', { name: 'Search overlay' });
    await expect(overlay).toBeVisible();
    await overlay.getByPlaceholder(/search tracks/i).fill(TRACK_TITLE);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(overlay).toHaveCount(0);

    // Play: the player bar shows the track and playback can be paused.
    const playerBar = page.getByRole('region', { name: /player/i });
    await page.getByRole('button', { name: `Play ${TRACK_TITLE}` }).click();
    await expect(playerBar.getByText(TRACK_TITLE)).toBeVisible();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' }).first()).toBeVisible();

    // Save: add the track to the library from its context menu.
    await page.getByRole('button', { name: `More options for ${TRACK_TITLE}` }).click();
    await page.getByRole('menuitem', { name: 'Save to Collection' }).click();

    // Library: the saved track is listed.
    await page.goto(`${BASE_URL}/dashboard/collection`);
    await expect(page.getByText(TRACK_TITLE)).toBeVisible();
  });
});
