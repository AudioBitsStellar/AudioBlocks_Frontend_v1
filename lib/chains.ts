import { liskSepolia, mainnet, sepolia } from 'viem/chains';

/**
 * Single source of truth for the chains AudioBlocks supports (#316).
 *
 * Kept in sync with the wagmi `chains` array in `context/provider.tsx`. The
 * `ChainSwitcher` UI reads from here so there is one list to update when a
 * chain is added or removed.
 */

export interface SupportedChain {
  id: number;
  /** Short label shown in the switcher UI. */
  label: string;
  /** `true` for test networks — used to badge them in the UI. */
  testnet: boolean;
}

export const SUPPORTED_CHAINS: readonly SupportedChain[] = [
  { id: mainnet.id, label: 'Ethereum', testnet: false },
  { id: sepolia.id, label: 'Sepolia', testnet: true },
  { id: liskSepolia.id, label: 'Lisk Sepolia', testnet: true },
] as const;

export function getChainLabel(chainId: number | undefined): string {
  if (chainId === undefined) return 'Unknown network';
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId)?.label ?? `Chain ${chainId}`;
}
