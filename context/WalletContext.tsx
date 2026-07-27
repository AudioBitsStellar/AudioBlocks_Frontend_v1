'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAccount, useChainId, useDisconnect } from 'wagmi';

// ── Supported networks ────────────────────────────────────────────────────
// Chain IDs this app officially supports. The provider shows a wrong-network
// warning when the wallet is on a different chain.

const SUPPORTED_CHAIN_IDS: ReadonlySet<number> = new Set([
  1,        // Ethereum mainnet
  11155111, // Sepolia
  4202,     // Lisk Sepolia
]);

// ── Types ─────────────────────────────────────────────────────────────────

export interface WalletContextValue {
  /** Whether a wallet is currently connected. */
  isConnected: boolean;
  /** Connected wallet address, or null if not connected. */
  address: string | null;
  /** Current chain ID, or null if not connected. */
  chainId: number | null;
  /** Whether the connected chain is in the supported set. */
  isCorrectNetwork: boolean;
  /** Disconnect the wallet and clear all local state. */
  disconnect: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextValue | null>(null);

const PREVIOUS_WALLET_KEY = 'audioblocks_wallet_connected';

export function WalletProvider({ children }: { children: ReactNode }) {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address, isConnected: wagmiConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [hydrated, setHydrated] = useState(false);

  // Track whether the wallet was previously connected so we can auto-reconnect
  // on page refresh. Dynamic Labs handles the actual reconnection — we just
  // remember the intent.
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Persist connection intent.
  useEffect(() => {
    if (!hydrated) return;
    if (wagmiConnected && address) {
      try {
        localStorage.setItem(PREVIOUS_WALLET_KEY, 'true');
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(PREVIOUS_WALLET_KEY);
      } catch {
        // ignore
      }
    }
  }, [hydrated, wagmiConnected, address]);

  const isCorrectNetwork = wagmiChainId !== 0 && SUPPORTED_CHAIN_IDS.has(wagmiChainId);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    handleLogOut();
    try {
      localStorage.removeItem(PREVIOUS_WALLET_KEY);
    } catch {
      // ignore
    }
  }, [wagmiDisconnect, handleLogOut]);

  const value = useMemo<WalletContextValue>(
    () => ({
      isConnected: wagmiConnected && !!address,
      address: address ?? null,
      chainId: wagmiConnected ? wagmiChainId : null,
      isCorrectNetwork,
      disconnect,
    }),
    [wagmiConnected, address, wagmiChainId, isCorrectNetwork, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
