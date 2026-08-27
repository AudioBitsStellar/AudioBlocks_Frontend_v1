/**
 * Component for displaying block explorer links
 * Issue #321: Add block explorer links
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/web3Utils';

interface ExplorerLinkProps {
  hash?: string;
  address?: string;
  chainId?: number;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

/**
 * Component to render a link to block explorer for transaction or address
 * @param props - Component props
 * @returns Block explorer link
 */
export function ExplorerLink({
  hash,
  address,
  chainId = 1,
  children,
  className = '',
  showIcon = true,
}: ExplorerLinkProps) {
  if (!hash && !address) {
    return null;
  }

  const url = hash
    ? getExplorerTxUrl(hash, chainId)
    : address
      ? getExplorerAddressUrl(address, chainId)
      : '#';

  const displayText = children || hash || address;

  return (
    <a
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline ${className}`}
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {displayText}
      {showIcon && <ExternalLink className="h-4 w-4" />}
    </a>
  );
}

/**
 * Shortened transaction hash with explorer link
 */
export function TxHashLink({
  hash,
  chainId = 1,
  className = '',
}: {
  hash: string;
  chainId?: number;
  className?: string;
}) {
  const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  return (
    <ExplorerLink chainId={chainId} className={className} hash={hash}>
      <code className="font-mono text-sm">{shortHash}</code>
    </ExplorerLink>
  );
}

/**
 * Shortened address with explorer link
 */
export function AddressLink({
  address,
  chainId = 1,
  className = '',
  children,
}: {
  address: string;
  chainId?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <ExplorerLink address={address} chainId={chainId} className={className}>
      {children || <code className="font-mono text-sm">{shortAddress}</code>}
    </ExplorerLink>
  );
}
