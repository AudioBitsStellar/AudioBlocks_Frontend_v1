/**
 * Component for displaying Soroban network fees
 * Issue #548: Replace GasEstimateDisplay with NetworkFeeDisplay
 */

'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

interface NetworkFeeDisplayProps {
  feeXLM: string;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Component to display Soroban network fee with optional tooltip
 * @param props - Component props
 * @returns Network fee display
 */
export function NetworkFeeDisplay({
  feeXLM,
  className = '',
  showTooltip = true,
}: NetworkFeeDisplayProps) {
  const content = (
    <div className={`text-sm text-gray-700 ${className}`}>
      <span className="font-medium">Network fee:</span>{' '}
      <span className="font-mono">{feeXLM} XLM</span>
    </div>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            {content}
            <Info className="h-4 w-4 text-gray-500 cursor-help" />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs max-w-xs shadow-lg z-50"
            sideOffset={5}
          >
            <p>
              Stellar network fees cover the cost of processing your transaction on the blockchain.
              This includes the base fee and resource fees for smart contract execution.
            </p>
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/**
 * Inline network fee badge
 */
export function NetworkFeeBadge({ feeXLM }: { feeXLM: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
      ⚡ {feeXLM} XLM
    </span>
  );
}
