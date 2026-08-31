import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAccount, useSwitchChain } from 'wagmi';
import ChainSwitcher from '@/components/common/ChainSwitcher';

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

function setAccount(over: { isConnected?: boolean; chainId?: number } = {}) {
  mockUseAccount.mockReturnValue({
    isConnected: over.isConnected ?? true,
    chainId: over.chainId ?? 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function setSwitchChain(over: { switchChain?: unknown; isPending?: boolean } = {}) {
  mockUseSwitchChain.mockReturnValue({
    switchChain: over.switchChain ?? vi.fn(),
    isPending: over.isPending ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe('ChainSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccount();
    setSwitchChain();
  });

  it('renders nothing when no wallet is connected', () => {
    setAccount({ isConnected: false, chainId: undefined });
    const { container } = render(<ChainSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the active chain label on the trigger', () => {
    setAccount({ chainId: 4202 });
    render(<ChainSwitcher />);
    expect(screen.getByRole('button', { name: /network: lisk sepolia/i })).toHaveTextContent(
      'Lisk Sepolia'
    );
  });

  it('opens a menu listing every supported chain with the active one checked', () => {
    setAccount({ chainId: 11155111 });
    render(<ChainSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /switch network/i }));

    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual([
      'Ethereum',
      expect.stringContaining('Sepolia'),
      expect.stringContaining('Lisk Sepolia'),
    ]);
    expect(within(menu).getByRole('menuitemradio', { checked: true })).toHaveTextContent('Sepolia');
  });

  it('calls switchChain with the chosen chain id and closes the menu', () => {
    const switchChain = vi.fn();
    setAccount({ chainId: 1 });
    setSwitchChain({ switchChain });
    render(<ChainSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /switch network/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /lisk sepolia/i }));

    expect(switchChain).toHaveBeenCalledWith({ chainId: 4202 });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not call switchChain when the active chain is re-selected', () => {
    const switchChain = vi.fn();
    setAccount({ chainId: 1 });
    setSwitchChain({ switchChain });
    render(<ChainSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /switch network/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /ethereum/i }));

    expect(switchChain).not.toHaveBeenCalled();
  });

  it('disables the trigger and shows a switching label while a switch is pending', () => {
    setSwitchChain({ isPending: true });
    render(<ChainSwitcher />);

    const trigger = screen.getByRole('button', { name: /switch network/i });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('Switching…');
  });

  it('closes the menu on Escape', () => {
    render(<ChainSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /switch network/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
