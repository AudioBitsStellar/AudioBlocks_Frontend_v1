import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('mobile navigation dialog (#738)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('traps focus, locks scrolling, passes axe, and restores focus on Escape', async ({
    page,
  }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Navigation menu' });
    const closeButton = dialog.getByRole('button', { name: 'Close navigation menu' });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation-menu');
    await expect(closeButton).toBeFocused();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    const { violations } = await new AxeBuilder({ page })
      .include('#mobile-navigation-menu')
      .analyze();
    expect(violations).toEqual([]);

    const focusable = dialog.locator('button:not([disabled]), a[href]');
    const lastControl = focusable.last();
    await page.keyboard.press('Shift+Tab');
    await expect(lastControl).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes on backdrop click and navigation link, restoring trigger focus', async ({
    page,
  }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Navigation menu' });
    await dialog.click({ position: { x: 10, y: 400 } });
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole('link', { name: 'Artist Hub' }).click();
    await expect(page).toHaveURL(/\/artist-hub\/?$/);
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
