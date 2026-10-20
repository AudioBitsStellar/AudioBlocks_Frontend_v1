/**
 * Component for displaying Stellar addresses
 * Issue #547: Updated for Stellar addresses (G... or C...)
 */

import React from 'react';
import { AddressLink } from './ExplorerLink';

interface AddressDisplayProps {
  address: string;
  showExplorerLink?: boolean;
  className?: string;
}

/**
 * Component to display Stellar address with optional explorer link
 * @param props - Component props
 * @returns Address display with shortened format
 */
export function AddressDisplay({
  address,
  showExplorerLink = true,
  className = '',
}: AddressDisplayProps) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (showExplorerLink) {
    return (
      <AddressLink address={address} className={className}>
        {shortAddress}
      </AddressLink>
    );
  }

  return <span className={`font-mono ${className}`}>{shortAddress}</span>;
}
