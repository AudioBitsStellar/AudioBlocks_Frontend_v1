'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { mainnet, sepolia, liskSepolia } from 'viem/chains';
import { AlertTriangle, X } from 'lucide-react';

const SUPPORTED_CHAINS = [mainnet, sepolia, liskSepolia];
const SUPPORTED_CHAIN_IDS = new Set<number>(SUPPORTED_CHAINS.map(chain => chain.id));

/**
 * Persistent, dismissible banner shown when a connected wallet is on a chain
 * outside SUPPORTED_CHAIN_IDS (kept in sync with context/provider.tsx's wagmi
 * `chains` config). Dismissal is per-chain: switching to another unsupported
 * chain re-shows the banner.
 */
export default function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [dismissedChainId, setDismissedChainId] = useState<number | null>(null);

  const isUnsupported =
    isConnected && chainId !== undefined && !SUPPORTED_CHAIN_IDS.has(chainId);

  // Re-show the banner if the user switches to a different unsupported chain.
  useEffect(() => {
    if (!isUnsupported) setDismissedChainId(null);
  }, [isUnsupported]);

  if (!isUnsupported || dismissedChainId === chainId) return null;

  return (
    <div
      role="alert"
      className="w-full bg-[#3a1f00] border-b border-[#D2045B]/40 text-[#F5D0A9] px-4 py-2.5 flex items-center justify-center gap-3 text-sm"
    >
      <AlertTriangle size={16} className="shrink-0 text-[#D2045B]" />
      <span>
        Your wallet is connected to an unsupported network. Switch to Ethereum
        Mainnet, Sepolia, or Lisk Sepolia to use AudioBlocks.
      </span>
      {switchChain && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => switchChain({ chainId: mainnet.id })}
          className="shrink-0 rounded-full bg-[#D2045B] hover:bg-[#B8043F] disabled:opacity-60 text-white text-xs font-semibold px-3 py-1 transition-colors"
        >
          {isPending ? 'Switching…' : 'Switch network'}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss network warning"
        onClick={() => setDismissedChainId(chainId ?? null)}
        className="shrink-0 text-[#F5D0A9]/70 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
