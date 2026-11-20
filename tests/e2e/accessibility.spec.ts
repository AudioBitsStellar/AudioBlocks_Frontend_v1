import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * E2E: accessibility sweep of key pages (#849).
 *
 * `mobile-navigation.spec.ts` already axe-scans the nav dialog in isolation;
 * this covers the public pages a first-time visitor actually lands on —
 * marketing/static pages that render without a backend, so the scan is
 * deterministic in CI. A failing violation fails this job the same way any
 * other e2e assertion does (`test:e2e` in `.github/workflows/test.yml` has
 * no `continue-on-error`), which is the "blocking" part of #849.
 */
const KEY_PAGES = [
  { path: '/', name: 'home' },
  { path: '/login', name: 'login' },
  { path: '/artist-hub', name: 'artist hub' },
  { path: '/quality-standards', name: 'quality standards' },
];

test.describe('accessibility (#849)', () => {
  for (const { path, name } of KEY_PAGES) {
    test(`${name} page (${path}) has no axe violations`, async ({ page }) => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations).toEqual([]);
    });
  }
});
