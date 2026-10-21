'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { getStellarNetworkConfig } from '@/lib/stellarNetwork';

export default function WrongNetworkBanner() {
  const { publicKey } = useStellarWallet();
  const [dismissed, setDismissed] = useState(false);
  const stellarConfig = getStellarNetworkConfig();

  if (!publicKey || dismissed) return null;

  if (stellarConfig.isTestnet) {
    return (
      <div className="w-full bg-[#2d3748] border-b border-[#4a5568] text-[#90cdf4] px-4 py-1.5 flex items-center justify-center gap-2 text-xs">
        <span className="font-mono">TESTNET</span>
      </div>
    );
  }

  return null;
}
