import { getNetworkDetails, isConnected, requestAccess } from '@stellar/freighter-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TestnetFunding from '@/components/help/TestnetFunding';
import { STELLAR_TESTNET_PASSPHRASE } from '@/lib/walletHelp';
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetworkDetails: vi.fn(),
}));
const address = `G${'A'.repeat(55)}`;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
  vi.mocked(requestAccess).mockResolvedValue({ address });
  vi.mocked(getNetworkDetails).mockResolvedValue({
    network: 'TESTNET',
    networkUrl: '',
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => vi.unstubAllGlobals());
describe('wallet funding UI', () => {
  it('offers help when Freighter is missing', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });
    render(<TestnetFunding />);
    fireEvent.click(screen.getByRole('button', { name: /Connect Freighter/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No Freighter');
    expect(screen.getByRole('link', { name: /wallet guide/ })).toHaveAttribute(
      'href',
      '/help/wallet'
    );
  });
  it('shows the unfunded state and funds only the connected account', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ status: 404 } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);
    render(<TestnetFunding />);
    fireEvent.click(screen.getByRole('button', { name: /Connect Freighter/ }));
    expect(await screen.findByText(/has not been funded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Get test XLM with Friendbot' }));
    await screen.findByText(/Test XLM requested successfully/);
    expect(fetch).toHaveBeenCalledWith(
      `https://friendbot.stellar.org?addr=${address}`,
      expect.objectContaining({ method: 'POST' })
    );
  });
  it('does not show a funding button on mainnet', async () => {
    vi.mocked(getNetworkDetails).mockResolvedValue({
      network: 'PUBLIC',
      networkUrl: '',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    render(<TestnetFunding />);
    fireEvent.click(screen.getByRole('button', { name: /Connect Freighter/ }));
    await screen.findByText(/Mainnet or custom network/);
    expect(
      screen.queryByRole('button', { name: 'Get test XLM with Friendbot' })
    ).not.toBeInTheDocument();
  });
  it('rechecks account and network immediately before funding', async () => {
    render(<TestnetFunding />);
    fireEvent.click(screen.getByRole('button', { name: /Connect Freighter/ }));
    await screen.findByRole('button', { name: 'Get test XLM with Friendbot' });
    vi.mocked(getNetworkDetails).mockResolvedValue({
      network: 'PUBLIC',
      networkUrl: '',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Get test XLM with Friendbot' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('network changed'));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('friendbot'))).toBe(
      false
    );
  });
});
