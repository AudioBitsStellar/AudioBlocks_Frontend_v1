'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { shortenAddress } from '@/lib/stellarAddress';
import { getAccountExplorerUrl, getContractExplorerUrl } from '@/lib/stellarNetwork';

interface AddressDisplayProps {
  address: string;
  showExplorerLink?: boolean;
  className?: string;
  prefixLength?: number;
  suffixLength?: number;
}

export default function AddressDisplay({
  address,
  showExplorerLink = false,
  className = '',
  prefixLength = 4,
  suffixLength = 4,
}: AddressDisplayProps) {
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
}
