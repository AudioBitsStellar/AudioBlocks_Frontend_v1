import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mainnet } from 'viem/chains';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAccount, useSwitchChain } from 'wagmi';
import WrongNetworkBanner from '@/components/common/WrongNetworkBanner';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSwitchChain: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  liskSepolia: { id: 4202, name: 'Lisk Sepolia' },
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseSwitchChain = vi.mocked(useSwitchChain);

describe('WrongNetworkBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when connected on unsupported chain', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 999999,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: false });

    render(<WrongNetworkBanner />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Your wallet is connected to an unsupported network'
    );
  });

  it('does not render when connected on supported chain', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: false });

    render(<WrongNetworkBanner />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render when disconnected', () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: false });

    render(<WrongNetworkBanner />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dismissal hides banner for current unsupported chain', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 999999,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: false });

    render(<WrongNetworkBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('re-shows banner when switching to another unsupported chain', async () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 999999,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: false });

    const { rerender } = render(<WrongNetworkBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 888888,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    rerender(<WrongNetworkBanner />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('Switch network button calls switchChain with mainnet', () => {
    const mockSwitchChain = vi.fn();
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 999999,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: mockSwitchChain, isPending: false });

    render(<WrongNetworkBanner />);

    fireEvent.click(screen.getByRole('button', { name: /switch network/i }));

    expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: mainnet.id });
  });

  it('disables Switch network button while switching', () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chainId: 999999,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn(), isPending: true });

    render(<WrongNetworkBanner />);

    const switchButton = screen.getByRole('button', { name: /switching/i });
    expect(switchButton).toBeDisabled();
    expect(switchButton).toHaveTextContent('Switching…');
  });
});
