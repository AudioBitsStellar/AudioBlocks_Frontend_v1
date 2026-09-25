'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';

/**
 * True if the visitor has no injected EVM wallet extension at all
 * (e.g. MetaMask, Coinbase Wallet). Mirrors the guard in layouts/navbar.
 */
function hasInjectedWallet(): boolean {
  if (typeof window === 'undefined') return true;
  return typeof (window as unknown as { ethereum?: unknown }).ethereum !== 'undefined';
}

interface WalletConnectButtonsProps {
  onLoginStart?: () => void;
  className?: string;
}

/**
 * Dedicated MetaMask and WalletConnect entry points. Both complete inside
 * Dynamic's wallet modal (injected MetaMask or WalletConnect QR); connection
 * failures are surfaced globally by useWalletConnectionErrors.
 * Renders nothing once a user is authenticated.
 */
export function WalletConnectButtons({ onLoginStart, className = '' }: WalletConnectButtonsProps) {
  const { user, setShowAuthFlow } = useDynamicContext();

  if (user?.userId) {
    return null;
  }

  const openWalletFlow = () => {
    onLoginStart?.();
    setShowAuthFlow(true);
  };

  const handleMetaMask = () => {
    if (!hasInjectedWallet()) {
      toast.error(
        'No wallet extension detected. Install a wallet like MetaMask to continue.',
        {
          action: {
            label: 'Get MetaMask',
            onClick: () => window.open('https://metamask.io/download/', '_blank'),
          },
          duration: 8000,
        }
      );
      return;
    }
    openWalletFlow();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        aria-label="Connect with MetaMask"
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#D2045B] px-6 py-2 font-semibold text-white transition hover:bg-[#b80348]"
        onClick={handleMetaMask}
        type="button"
      >
        <Wallet size={18} />
        <span>Connect MetaMask</span>
      </button>
      <button
        aria-label="Connect with WalletConnect"
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-700 bg-[#1A1A1A] px-6 py-2 font-semibold text-white transition hover:border-gray-500"
        onClick={openWalletFlow}
        type="button"
      >
        <Smartphone size={18} />
        <span>Connect with WalletConnect</span>
      </button>
    </div>
  );
}
