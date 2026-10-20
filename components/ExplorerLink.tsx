/**
 * Component for displaying block explorer links
 * Issue #547: Point explorer links to stellar.expert
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import {
  getStellarTxUrl,
  getStellarAccountUrl,
  getStellarContractUrl,
} from '@/lib/stellarExplorer';

interface ExplorerLinkProps {
  type: 'tx' | 'account' | 'contract';
  value: string;
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

/**
 * Component to render a link to stellar.expert for transaction, account, or contract
 * @param props - Component props
 * @returns Stellar explorer link
 */
export function ExplorerLink({
  type,
  value,
  children,
  className = '',
  showIcon = true,
}: ExplorerLinkProps) {
  if (!value) {
    return null;
  }

  let url: string;
  switch (type) {
    case 'tx':
      url = getStellarTxUrl(value);
      break;
    case 'account':
      url = getStellarAccountUrl(value);
      break;
    case 'contract':
      url = getStellarContractUrl(value);
      break;
    default:
      url = '#';
  }

  const displayText = children || value;

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
 * Shortened transaction hash with stellar.expert link
 */
export function TxHashLink({ hash, className = '' }: { hash: string; className?: string }) {
  const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  return (
    <ExplorerLink className={className} type="tx" value={hash}>
      <code className="font-mono text-sm">{shortHash}</code>
    </ExplorerLink>
  );
}

/**
 * Shortened address with stellar.expert link
 * Works for both Stellar accounts (G...) and contracts (C...)
 */
export function AddressLink({
  address,
  className = '',
  children,
}: {
  address: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const type = address.startsWith('C') ? 'contract' : 'account';

  return (
    <ExplorerLink className={className} type={type} value={address}>
      {children || <code className="font-mono text-sm">{shortAddress}</code>}
    </ExplorerLink>
  );
}
