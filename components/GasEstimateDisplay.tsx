/**
 * Component for displaying gas estimates
 * Issue #318: Implement gas estimation
 */

import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGasEstimate } from '@/hooks/useGasEstimate';

interface ContractLike {
  [method: string]: {
    estimateGas?: (...args: unknown[]) => Promise<bigint>;
  };
}

interface GasEstimateDisplayProps {
  contract: ContractLike;
  method: string;
  args?: unknown[];
  value?: bigint;
  gasPrice?: bigint;
  className?: string;
}

/**
 * Component to display estimated gas cost for a transaction
 * @param props - Component props
 * @returns Gas estimate display with loading and error states
 */
export function GasEstimateDisplay({
  contract,
  method,
  args = [],
  value,
  gasPrice,
  className = '',
}: GasEstimateDisplayProps) {
  const { gasEstimateInETH, isEstimating, error } = useGasEstimate({
    contract,
    method,
    args,
    value,
    gasPrice,
    autoEstimate: true,
  });

  if (isEstimating) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Estimating gas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>Failed to estimate gas</span>
      </div>
    );
  }

  if (!gasEstimateInETH) {
    return null;
  }

  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      <span className="font-medium">Estimated gas cost:</span>{' '}
      <span className="font-mono">{gasEstimateInETH} ETH</span>
    </div>
  );
}

/**
 * Inline gas estimate badge
 */
export function GasEstimateBadge({
  contract,
  method,
  args = [],
  value,
  gasPrice,
}: Omit<GasEstimateDisplayProps, 'className'>) {
  const { gasEstimateInETH, isEstimating } = useGasEstimate({
    contract,
    method,
    args,
    value,
    gasPrice,
    autoEstimate: true,
  });

  if (isEstimating) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Estimating...
      </span>
    );
  }

  if (!gasEstimateInETH) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
      ⛽ {gasEstimateInETH} ETH
    </span>
  );
}
