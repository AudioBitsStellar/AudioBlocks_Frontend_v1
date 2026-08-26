/**
 * React hook for gas estimation
 * Issue #318: Implement gas estimation
 */

import { useEffect, useState } from 'react';
import { estimateGas, calculateGasCost } from '@/lib/web3Utils';

interface UseGasEstimateReturn {
  gasLimit: bigint | null;
  gasCost: string | null;
  gasEstimateInETH: string | null;
  isEstimating: boolean;
  error: Error | null;
  estimate: () => Promise<void>;
}

interface UseGasEstimateOptions {
  contract: any;
  method: string;
  args?: any[];
  value?: bigint;
  gasPrice?: bigint;
  autoEstimate?: boolean;
}

/**
 * Hook to estimate gas for a contract transaction
 * @param options - Configuration options
 * @returns Gas estimation data and methods
 */
export function useGasEstimate({
  contract,
  method,
  args = [],
  value,
  gasPrice,
  autoEstimate = true,
}: UseGasEstimateOptions): UseGasEstimateReturn {
  const [gasLimit, setGasLimit] = useState<bigint | null>(null);
  const [gasCost, setGasCost] = useState<string | null>(null);
  const [gasEstimateInETH, setGasEstimateInETH] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const estimate = async () => {
    if (!contract || !method) {
      setError(new Error('Contract or method not provided'));
      return;
    }

    setIsEstimating(true);
    setError(null);

    try {
      // Estimate gas limit
      const estimatedGas = await estimateGas(contract, method, args, value);
      setGasLimit(estimatedGas);

      // Calculate cost if gas price is provided
      if (gasPrice) {
        const cost = calculateGasCost(estimatedGas, gasPrice);
        setGasCost(cost);
        setGasEstimateInETH(cost);
      } else {
        // Fetch current gas price if not provided
        try {
          const provider = contract.runner?.provider;
          if (provider) {
            const feeData = await provider.getFeeData();
            const currentGasPrice = feeData.gasPrice || BigInt(0);
            if (currentGasPrice > BigInt(0)) {
              const cost = calculateGasCost(estimatedGas, currentGasPrice);
              setGasCost(cost);
              setGasEstimateInETH(cost);
            }
          }
        } catch (priceError) {
          console.warn('Failed to fetch gas price:', priceError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gas estimation failed'));
      setGasLimit(null);
      setGasCost(null);
      setGasEstimateInETH(null);
    } finally {
      setIsEstimating(false);
    }
  };

  // Auto-estimate on mount or when dependencies change
  useEffect(() => {
    if (autoEstimate && contract && method) {
      estimate();
    }
  }, [contract, method, JSON.stringify(args), value?.toString(), gasPrice?.toString(), autoEstimate]);

  return {
    gasLimit,
    gasCost,
    gasEstimateInETH,
    isEstimating,
    error,
    estimate,
  };
}
