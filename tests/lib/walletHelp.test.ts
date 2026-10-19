import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canFundWithFriendbot,
  fundTestnetAccount,
  STELLAR_TESTNET_PASSPHRASE,
} from '@/lib/walletHelp';
const address = `G${'A'.repeat(55)}`;
afterEach(() => vi.unstubAllGlobals());
describe('Friendbot funding guard', () => {
  it('only accepts Stellar accounts on the exact Testnet passphrase', () => {
    expect(canFundWithFriendbot(address, STELLAR_TESTNET_PASSPHRASE)).toBe(true);
    expect(canFundWithFriendbot('0x1234', STELLAR_TESTNET_PASSPHRASE)).toBe(false);
    expect(canFundWithFriendbot(address, 'Public Global Stellar Network ; September 2015')).toBe(
      false
    );
  });
  it('never sends a mainnet funding request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fundTestnetAccount(address, 'MAINNET')).rejects.toThrow('Testnet');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('funds the connected testnet address and handles failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal('fetch', fetchMock);
    await fundTestnetAccount(address, STELLAR_TESTNET_PASSPHRASE);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://friendbot.stellar.org?addr=${address}`,
      expect.objectContaining({ method: 'POST' })
    );
    await expect(fundTestnetAccount(address, STELLAR_TESTNET_PASSPHRASE)).rejects.toThrow(
      'already be funded'
    );
  });
});
