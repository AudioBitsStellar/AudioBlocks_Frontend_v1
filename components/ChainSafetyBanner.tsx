'use client';

import { useEffect, useState } from 'react';
import { checkChainSafety } from '@/lib/chainSafety';

export default function ChainSafetyBanner() {
  const [error, setError] = useState('Checking chain configuration. Transactions are unavailable until verified.');
  useEffect(() => {
    let active = true;
    checkChainSafety().then(() => { if (active) setError(''); }).catch(() => {
      if (active) setError('Transactions blocked: chain configuration could not be verified. Contact support.');
    });
    return () => { active = false; };
  }, []);
  const offMainnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK !== 'public';
  if (!error && !offMainnet) return null;
  return <div role="alert" className="sticky top-0 z-50 bg-amber-950 p-3 text-center text-sm text-amber-100">
    {offMainnet && <p>Non-mainnet environment — assets have no mainnet value.</p>}
    {error && <p>{error}</p>}
  </div>;
}
