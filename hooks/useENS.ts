/**
 * React hook for ENS name resolution
 * Issue #317: Add ENS name resolution
 */

import { useEffect, useState } from 'react';

interface UseENSReturn {
  ensName: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to resolve ENS name for an Ethereum address
 * @param address - Ethereum address to lookup
 * @param provider - Optional ethers provider instance
 * @returns ENS name, loading state, and error
 */
export function useENS(address: string | undefined, provider?: any): UseENSReturn {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address || !provider) {
      setEnsName(null);
      return;
    }

    let cancelled = false;

    async function lookupName() {
      setIsLoading(true);
      setError(null);

      try {
        const name = await provider.lookupAddress(address);
        if (!cancelled) {
          setEnsName(name);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('ENS lookup failed'));
          setEnsName(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    lookupName();

    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  return { ensName, isLoading, error };
}

/**
 * Hook to display address with ENS name if available
 * @param address - Ethereum address
 * @param provider - Optional ethers provider instance
 * @returns Display name (ENS or shortened address)
 */
export function useDisplayName(address: string | undefined, provider?: any): string {
  const { ensName } = useENS(address, provider);

  if (!address) return '';
  if (ensName) return ensName;
  
  // Return shortened address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
