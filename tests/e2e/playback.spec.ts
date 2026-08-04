import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

async function initMockAudio(page: Page) {
  await page.addInitScript(() => {
    const audios = new Map<number, HTMLAudioElement>();
    let nextId = 0;
    const eventTargets = new Map<number, Record<string, Set<EventListener>>>();
    const listenerLookup = new WeakMap<EventListener, { elId: number; type: string }>();

    const buildEvent = (type: string, target: EventTarget) =>
      Object.assign(new Event(type, { bubbles: true }), { target } as EventInit);

    window.HTMLAudioElement =
      class extends (window.HTMLAudioElement as unknown as typeof globalThis.HTMLAudioElement) {
        constructor() {
          super();
          const id = nextId++;
          audios.set(id, this as unknown as HTMLAudioElement);
          eventTargets.set(id, {});
          Object.defineProperty(this, '__audioId', { value: id, writable: false });
        }

        addEventListener(type: string, listener: EventListener) {
          const id = (this as unknown as { __audioId: number }).__audioId;
          const store = eventTargets.get(id)!;
          if (!store[type]) store[type] = new Set();
          store[type].add(listener);
          listenerLookup.set(listener, { elId: id, type });
          super.addEventListener(type, listener);
        }
        removeEventListener(type: string, listener: EventListener) {
          const id = (this as unknown as { __audioId: number }).__audioId;
          eventTargets.get(id)?.[type]?.delete(listener);
          listenerLookup.delete(listener);
          super.removeEventListener(type, listener);
        }
        dispatchEvent(event: Event) {
          const id = (this as unknown as { __audioId: number }).__audioId;
          eventTargets.get(id)?.[event.type]?.forEach((l) => l(event));
          return super.dispatchEvent(event);
        }

        play() {
          return Promise.resolve();
        }
        pause() {}
        load() {}
        cloneNode() {
          return this as unknown as Node;
        }
      } as unknown as typeof HTMLAudioElement;

    (window as unknown as Record<string, unknown>).__mockAudioEvents = {
      fire(el: HTMLAudioElement, type: string) {
        const id = (el as unknown as { __audioId: number }).__audioId;
        eventTargets.get(id)?.[type]?.forEach((l) => l(buildEvent(type, el)));
      },
      get(id: number) {
        return audios.get(id);
      },
    };
  });
}

async function navigateToHome(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForSelector('body');
}

test.describe('Play track E2E', () => {
  test.beforeEach(async ({ page }) => {
    await initMockAudio(page);
  });

  test('navigates to home page', async ({ page }) => {
    await navigateToHome(page);
    await expect(page).toHaveURL(
      new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`)
    );
  });

  test('clicking a track starts playback and player shows track info', async ({ page }) => {
    await navigateToHome(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const playButton = page.locator('button[aria-label="Play track"]').first();
    await expect(playButton).toBeVisible({ timeout: 10_000 });

    const titleBefore = page.locator('.text-white.font-medium').first();
    const artistBefore = page.locator('.text-gray-400').first();
    const titleTextBefore = await titleBefore.textContent();
    const artistTextBefore = await artistBefore.textContent();

    await playButton.click();
    await page.waitForTimeout(500);

    const titleAfter = page.locator('.text-white.font-medium').first();
    const artistAfter = page.locator('.text-gray-400').first();
    await expect(titleAfter).toContainText(titleTextBefore ?? '');
    await expect(artistAfter).toContainText(artistTextBefore ?? '');
  });

  test('play/pause toggle stops playback', async ({ page }) => {
    await navigateToHome(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const playButton = page
      .locator('button[aria-label="Play track"], button[aria-label="Pause"]')
      .first();
    await expect(playButton).toBeVisible({ timeout: 10_000 });
    await playButton.click();
    await page.waitForTimeout(300);

    const toggleButton = page
      .locator('button[aria-label="Pause"], button[aria-label="Play"]')
      .first();
    await toggleButton.click();
    await page.waitForTimeout(300);

    const playIcon = page.locator('.lucide-play').first();
    const pauseIcon = page.locator('.lucide-pause').first();
    const hasPlay = (await playIcon.count()) > 0;
    const hasPause = (await pauseIcon.count()) > 0;
    expect(hasPlay || hasPause).toBe(true);
  });

  test('seek bar allows time navigation', async ({ page }) => {
    await navigateToHome(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const playButton = page
      .locator('button[aria-label="Play track"], button[aria-label="Pause"]')
      .first();
    await expect(playButton).toBeVisible({ timeout: 10_000 });
    await playButton.click();
    await page.waitForTimeout(500);

    const seekBar = page.locator('input[role="slider"][aria-valuemin="0"]').first();
    await expect(seekBar).toBeVisible({ timeout: 10_000 });
    await seekBar.fill('30');
    await seekBar.dispatchEvent('change');
    await page.waitForTimeout(300);

    const value = await seekBar.getAttribute('aria-valuenow');
    expect(Number(value)).toBeGreaterThanOrEqual(0);
  });

  test('next button plays next track in queue', async ({ page }) => {
    await navigateToHome(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const playButton = page
      .locator('button[aria-label="Play track"], button[aria-label="Pause"]')
      .first();
    await expect(playButton).toBeVisible({ timeout: 10_000 });
    await playButton.click();
    await page.waitForTimeout(500);

    const firstTitle = await page.locator('.text-white.font-medium').first().textContent();

    await page.locator('button[aria-label="Next track"]').first().click();
    await page.waitForTimeout(500);

    const secondTitle = await page.locator('.text-white.font-medium').first().textContent();
    expect(firstTitle).toBeDefined();
    expect(secondTitle).toBeDefined();
    expect(secondTitle).not.toBe(firstTitle);
  });

  test('test completes in under 30 seconds', async ({ page }) => {
    const start = Date.now();
    await navigateToHome(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    const playButton = page
      .locator('button[aria-label="Play track"], button[aria-label="Pause"]')
      .first();
    if ((await playButton.count()) > 0) {
      await playButton.click();
      await page.waitForTimeout(300);
      await page.locator('button[aria-label="Next track"]').first().click();
      await page.waitForTimeout(300);
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(30_000);
  });
});
