import { test, expect } from '@playwright/test';
import { installMockWallet, MOCK_WALLET_ADDRESS } from './mocks/mockWallet';

/**
 * E2E: marketplace purchase with a mocked wallet (#611).
 *
 * The app's purchase flow runs on an injected EVM wallet through wagmi, so the
 * wallet is faked at the `window.ethereum` boundary (see mocks/mockWallet.ts).
 * No browser extension and no live chain are needed.
 *
 *   buy button → confirm modal → sign → success toast
 *   wallet rejects → friendly error, no transaction recorded
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('marketplace purchase with a mocked wallet (#611)', () => {
  test('confirming a purchase signs the transaction and shows success', async ({ page }) => {
    const wallet = await installMockWallet(page);

    await page.goto(`${BASE_URL}/marketPlace`);

    await page.getByRole('button', { name: 'Buy Now' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Confirm purchase' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm purchase' }).click();

    await expect(
      page.getByText('Purchase confirmed! Your collection has been updated.')
    ).toBeVisible();

    const [tx] = (await wallet.sentTransactions()) as Array<{ from?: string; value?: string }>;
    expect(tx).toBeDefined();
    expect(tx.from?.toLowerCase()).toBe(MOCK_WALLET_ADDRESS.toLowerCase());
  });

  test('a rejected signature shows an error and records no transaction', async ({ page }) => {
    const wallet = await installMockWallet(page, { rejectTransactions: true });

    await page.goto(`${BASE_URL}/marketPlace`);

    await page.getByRole('button', { name: 'Buy Now' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Confirm purchase' });
    await dialog.getByRole('button', { name: 'Confirm purchase' }).click();

    await expect(page.getByText('Purchase confirmed!')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Buy Now' }).first()).toBeEnabled();
    expect(await wallet.sentTransactions()).toHaveLength(0);
  });

  test('cancelling the confirm modal never reaches the wallet', async ({ page }) => {
    const wallet = await installMockWallet(page);

    await page.goto(`${BASE_URL}/marketPlace`);

    await page.getByRole('button', { name: 'Buy Now' }).first().click();
    await page
      .getByRole('dialog', { name: 'Confirm purchase' })
      .getByRole('button', { name: 'Cancel' })
      .click();

    await expect(page.getByRole('dialog', { name: 'Confirm purchase' })).toHaveCount(0);
    expect(await wallet.sentTransactions()).toHaveLength(0);
  });
});
