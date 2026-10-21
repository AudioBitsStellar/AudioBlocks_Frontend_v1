import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
const fixtureDir = path.resolve('tests/fixtures/hls');
async function setup(page: Page, saver = false) {
  const requests: string[] = [];
  const plays: string[] = [];
  await page.addInitScript(
    ({ saver }) => {
      localStorage.clear();
      localStorage.setItem('audioblocks_data_saver', String(saver));
      (window as unknown as { gaps: number[] }).gaps = [];
      window.addEventListener('audioblocks:transition', (event) =>
        (window as unknown as { gaps: number[] }).gaps.push((event as CustomEvent).detail.gapMs)
      );
    },
    { saver }
  );
  await page.route('**/api/song/stream/*', async (route) => {
    const id = route.request().url().split('/').pop()!;
    requests.push(`manifest:${id}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const body = (await readFile(path.join(fixtureDir, 'tone.m3u8'), 'utf8')).replace(
      /tone-(\d+)\.bin/g,
      `/fixtures/hls/${id}/tone-$1.bin`
    );
    await route.fulfill({ contentType: 'application/vnd.apple.mpegurl', body });
  });
  await page.route('**/fixtures/hls/*/*.bin', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({
      contentType: 'video/mp2t',
      body: await readFile(path.join(fixtureDir, path.basename(url.pathname))),
    });
  });
  await page.route('**/fixture/plays/*', (route) => {
    plays.push(route.request().url());
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('http://127.0.0.1:3100/tests/playback-harness/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect
    .poll(() => page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThan(0.1);
  return { requests, plays };
}
async function transition(page: Page) {
  await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = audio.duration - 0.4;
  });
  await expect(page.getByTestId('track')).toHaveText('two');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { gaps: number[] }).gaps.length))
    .toBe(1);
  return page.evaluate(() => (window as unknown as { gaps: number[] }).gaps[0]);
}
test('real HLS buffers survive promotion, and prefetch reduces the transition gap', async ({
  browser,
}, testInfo) => {
  const cold: number[] = [];
  const warm: number[] = [];
  for (let run = 0; run < 3; run++) {
    const coldPage = await browser.newPage();
    await setup(coldPage, true);
    cold.push(await transition(coldPage));
    await coldPage.close();
    const page = await browser.newPage();
    const { requests, plays } = await setup(page);
    await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
      audio.currentTime = audio.duration - 10;
    });
    await expect
      .poll(() => requests.filter((url) => url.includes('/two/') && url.endsWith('.bin')).length)
      .toBeGreaterThan(0);
    await page.waitForTimeout(500);
    expect(requests.filter((url) => url.includes('/two/') && url.endsWith('.bin'))).toHaveLength(1);
    expect(plays.some((url) => url.endsWith('/two'))).toBe(false);
    warm.push(await transition(page));
    expect(requests.filter((url) => url === 'manifest:two')).toHaveLength(1);
    await page.close();
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[1];
  const results = {
    cold,
    warm,
    coldMedianMs: median(cold),
    warmMedianMs: median(warm),
    fixtureLatencyMsPerRequest: 150,
  };
  console.log(JSON.stringify(results));
  await testInfo.attach('transition-measurements', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  expect(median(warm)).toBeLessThan(median(cold) / 2);
});
test('data saver prevents speculative manifests', async ({ page }) => {
  const { requests } = await setup(page, true);
  await page.waitForTimeout(500);
  expect(requests).not.toContain('manifest:two');
});
test('queue changes release the old HLS source and warm the new queue head', async ({ page }) => {
  const { requests } = await setup(page);
  await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = audio.duration - 10;
  });
  await expect.poll(() => requests.includes('manifest:two')).toBe(true);
  await page.getByRole('button', { name: 'Change queue' }).click();
  await expect.poll(() => requests.includes('manifest:three')).toBe(true);
  await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = audio.duration - 0.4;
  });
  await expect(page.getByTestId('track')).toHaveText('three');
});

test('crossfade promotes a queued HLS track without losing the source', async ({ page }) => {
  const { requests } = await setup(page);
  await page.getByRole('button', { name: 'Crossfade', exact: true }).click();
  await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = audio.duration - 10;
  });
  await expect.poll(() => requests.some((url) => url.includes('/two/tone-0.bin'))).toBe(true);
  await page.waitForTimeout(500);
  await page.getByTestId('deck-a').evaluate((audio: HTMLAudioElement) => {
    audio.currentTime = audio.duration - 1;
  });
  await expect(page.getByTestId('track')).toHaveText('two');
  await expect
    .poll(() => page.getByTestId('deck-b').evaluate((audio: HTMLAudioElement) => audio.currentTime))
    .toBeGreaterThan(0.1);
  expect(requests.filter((url) => url === 'manifest:two')).toHaveLength(1);
});

test('wallet guide, release details and unavailable rows render on desktop and mobile', async ({
  page,
}, testInfo) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['wallet', 'release', 'unavailable']) {
      await page.goto(`/tests/playback-harness/ui.html?view=${view}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      if (view === 'wallet')
        await expect(page.getByRole('button', { name: /Connect Freighter/ })).toBeVisible();
      if (view === 'release')
        await expect(page.getByRole('button', { name: 'Play release' })).toBeEnabled();
      if (view === 'unavailable')
        await expect(page.getByRole('button', { name: 'Play Removed song' })).toBeDisabled();
      await page.screenshot({ path: testInfo.outputPath(`${view}-${width}.png`), fullPage: true });
      await testInfo.attach(`${view}-${width}`, {
        path: testInfo.outputPath(`${view}-${width}.png`),
        contentType: 'image/png',
      });
    }
  }
});
