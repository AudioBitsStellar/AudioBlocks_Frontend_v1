import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const tracks = [1, 2, 3].map((number) => ({
  id: `track-${number}`,
  title: `Queue Track ${number}`,
  artist: 'Fixture Artist',
  status: 'ready',
  streamUrl: `http://localhost/fixture-${number}.mp3`,
}));

async function openQueueWithRightEdgeSwipe(page: Page) {
  await page.evaluate(() => {
    const dispatch = (type: string, x: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const point = { clientX: x, clientY: 400 };
      Object.defineProperty(event, type === 'touchend' ? 'changedTouches' : 'touches', {
        value: [point],
      });
      document.dispatchEvent(event);
    };
    dispatch('touchstart', window.innerWidth - 4);
    dispatch('touchmove', window.innerWidth - 80);
    dispatch('touchend', window.innerWidth - 80);
  });
  await expect(page.getByRole('dialog', { name: 'Track queue' })).toBeVisible();
}

test('queue can be reordered, removed, advanced, cleared, and restored after reload', async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: 'audioblocks_jwt', value: 'mock-jwt-token', domain: 'localhost', path: '/' },
    ]);
  await page.addInitScript(() => localStorage.setItem('audioblocks_onboarding_complete', 'true'));
  await page.route('**/api/users/me/library**', (route) =>
    route.fulfill({
      status: 200,
      json: {
        saves: tracks.map((song, index) => ({ saveId: `save-${index + 1}`, song })),
        totalPages: 1,
      },
    })
  );
  await page.route('**/*.{mp3,m4a,ogg,wav}', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' })
  );

  await page.goto(`${BASE_URL}/dashboard/library`);
  for (const track of tracks) {
    await page.getByRole('button', { name: `Queue ${track.title}` }).click();
  }

  await openQueueWithRightEdgeSwipe(page);
  await page.getByRole('button', { name: 'Move Queue Track 3 up' }).click();
  await page.getByRole('button', { name: 'Move Queue Track 3 up' }).click();
  await page.getByRole('button', { name: 'Remove Queue Track 1 from queue' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('listitem').first()).toContainText('Queue Track 3');
  await expect(page.getByRole('listitem')).toHaveCount(2);

  await page.reload();
  await openQueueWithRightEdgeSwipe(page);
  await expect(page.getByRole('listitem').first()).toContainText('Queue Track 3');

  await page.getByRole('button', { name: 'Play Queue Track 1' }).click();
  await page.getByRole('button', { name: 'Next track' }).click();
  await expect(page.getByText('Now playing: Queue Track 3 by Fixture Artist')).toBeAttached();

  await page.getByRole('button', { name: 'Clear queue' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText('Your queue is empty.')).toBeVisible();
});
