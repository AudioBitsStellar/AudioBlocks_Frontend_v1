'use client';

import { FaWallet } from 'react-icons/fa';
import AddressDisplay from '@/components/AddressDisplay';

interface UserMenuWalletProps {
  publicKey: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function UserMenuWallet({
  publicKey,
  isConnecting,
  onConnect,
  onDisconnect,
}: UserMenuWalletProps) {
  return (
    <div className="border-t border-[#2B2B2B] pt-4 mt-4">
      <p className="text-xs text-[#A3A3A3] mb-2">Stellar Wallet</p>
      {publicKey ? (
        <div className="space-y-2">
          <AddressDisplay showExplorerLink address={publicKey} className="text-xs" />
          <button
            className="w-full text-left text-xs text-red-400 hover:text-red-300 transition"
            type="button"
            onClick={onDisconnect}
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <button
          className="w-full flex items-center justify-center gap-2 bg-[#D2045B] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#b80348] transition disabled:opacity-50"
          disabled={isConnecting}
          type="button"
          onClick={onConnect}
        >
          <FaWallet />
          <span>{isConnecting ? 'Connecting...' : 'Connect Stellar Wallet'}</span>
        </button>
      )}
    </div>
  );
}
