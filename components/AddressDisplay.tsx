<<<<<<< HEAD
'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { shortenAddress } from '@/lib/stellarAddress';
import { getAccountExplorerUrl, getContractExplorerUrl } from '@/lib/stellarNetwork';
=======
/**
 * Component for displaying Stellar addresses
 * Issue #547: Updated for Stellar addresses (G... or C...)
 */

import React from 'react';
import { AddressLink } from './ExplorerLink';
>>>>>>> upstream/main

interface AddressDisplayProps {
  address: string;
  showExplorerLink?: boolean;
  className?: string;
  prefixLength?: number;
  suffixLength?: number;
}

<<<<<<< HEAD
export default function AddressDisplay({
  address,
  showExplorerLink = false,
=======
/**
 * Component to display Stellar address with optional explorer link
 * @param props - Component props
 * @returns Address display with shortened format
 */
export function AddressDisplay({
  address,
  showExplorerLink = true,
>>>>>>> upstream/main
  className = '',
  prefixLength = 4,
  suffixLength = 4,
}: AddressDisplayProps) {
<<<<<<< HEAD
  const [copied, setCopied] = useState(false);

  const shortAddress = shortenAddress(address, prefixLength, suffixLength);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const explorerUrl = address.startsWith('C')
    ? getContractExplorerUrl(address)
    : getAccountExplorerUrl(address);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className="font-mono text-sm"
        title={address}
      >
        {shortAddress}
      </span>
      
      <button
        type="button"
        onClick={handleCopy}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Copy address"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>

      {showExplorerLink && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="View on explorer"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
=======
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (showExplorerLink) {
    return (
      <AddressLink address={address} className={className}>
        {shortAddress}
      </AddressLink>
    );
  }

  return <span className={`font-mono ${className}`}>{shortAddress}</span>;
>>>>>>> upstream/main
}
