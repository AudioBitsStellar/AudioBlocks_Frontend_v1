/**
 * Component for displaying Stellar addresses
 * Integrated with Stellar wallet context
 */

import React from 'react';
import { AddressLink } from './ExplorerLink';

interface AddressDisplayProps {
  address: string;
  showExplorerLink?: boolean;
  className?: string;
  prefixLength?: number;
  suffixLength?: number;
}

/**
 * Component to display Stellar address with optional explorer link
 */
export function AddressDisplay({
  address,
  showExplorerLink = true,
  className = '',
  prefixLength = 4,
  suffixLength = 4,
}: AddressDisplayProps) {
  const shortAddress = `${address.slice(0, prefixLength + 2)}...${address.slice(-suffixLength)}`;

  if (showExplorerLink) {
    return (
      <AddressLink address={address} className={className}>
        {shortAddress}
      </AddressLink>
    );
  }

  return <span className={`font-mono ${className}`}>{shortAddress}</span>;
}

export default AddressDisplay;
