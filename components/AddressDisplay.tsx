/**
 * Component for displaying Ethereum addresses with ENS resolution
 * Issue #317: Add ENS name resolution
 */

import React from 'react';
import { useDisplayName } from '@/hooks/useENS';
import { AddressLink } from './ExplorerLink';

interface ProviderLike {
  resolveName?: (name: string) => Promise<string | null>;
  lookupAddress?: (address: string) => Promise<string | null>;
}

interface AddressDisplayProps {
  address: string;
  provider?: ProviderLike;
  showExplorerLink?: boolean;
  chainId?: number;
  className?: string;
}

/**
 * Component to display address with ENS name resolution and optional explorer link
 * @param props - Component props
 * @returns Address display with ENS name if available
 */
export function AddressDisplay({
  address,
  provider,
  showExplorerLink = true,
  chainId = 1,
  className = '',
}: AddressDisplayProps) {
  const displayName = useDisplayName(address, provider);

  if (showExplorerLink) {
    return (
      <AddressLink address={address} chainId={chainId} className={className}>
        {displayName}
      </AddressLink>
    );
  }

  return <span className={`font-mono ${className}`}>{displayName}</span>;
}
