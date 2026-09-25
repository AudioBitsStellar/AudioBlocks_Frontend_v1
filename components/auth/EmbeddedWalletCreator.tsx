'use client';

import { useState } from 'react';
import { useDynamicContext, useDynamicWaas } from '@dynamic-labs/sdk-react-core';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { isUserCancellationError } from '@/lib/walletErrors';

function truncateAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Embedded (MPC) wallet creation flow. Renders nothing unless the visitor is
 * signed in, embedded wallets are enabled, and they do not have one yet.
 * Wallets are created for all chains enabled in the Dynamic dashboard.
 */
export function EmbeddedWalletCreator({ className = '' }: { className?: string }) {
  const { user } = useDynamicContext();
  const { dynamicWaasIsEnabled, createWalletAccount, getWaasWallets } = useDynamicWaas();
  const [creating, setCreating] = useState(false);
  const [createdAddress, setCreatedAddress] = useState<string | null>(null);

  if (!user?.userId || !dynamicWaasIsEnabled) {
    return null;
  }

  const existingAddress = createdAddress ?? getWaasWallets()[0]?.address ?? null;
  if (existingAddress) {
    return (
      <div className={`flex items-center gap-3 text-gray-400 ${className}`}>
        <Wallet size={16} />
        <span>Embedded wallet:</span>
        <span className="font-mono font-medium text-[#666C6C]">
          {truncateAddress(existingAddress)}
        </span>
      </div>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await createWalletAccount();
      setCreatedAddress(
        created?.[0]?.accountAddress ?? getWaasWallets()[0]?.address ?? null
      );
      toast.success('Embedded wallet created successfully.');
    } catch (err) {
      if (isUserCancellationError(err)) {
        toast.error('Wallet creation was cancelled.');
      } else {
        toast.error(
          err instanceof Error && err.message
            ? err.message
            : 'Failed to create embedded wallet. Please try again.'
        );
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      className={`flex cursor-pointer items-center gap-3 transition hover:text-[#666C6C] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={creating}
      onClick={handleCreate}
      type="button"
    >
      <Wallet size={16} />
      <span>{creating ? 'Creating wallet...' : 'Create embedded wallet'}</span>
    </button>
  );
}
