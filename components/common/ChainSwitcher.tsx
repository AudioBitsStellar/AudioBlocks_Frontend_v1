'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Network } from 'lucide-react';
import { useAccount, useSwitchChain } from 'wagmi';
import { getChainLabel, SUPPORTED_CHAINS } from '@/lib/chains';
import { cn } from '@/lib/utils';

/**
 * Dropdown that lets a connected wallet switch between the chains AudioBlocks
 * supports (#316). Reads the list from `@/lib/chains` so it stays in sync
 * with the wagmi config. Renders nothing when no wallet is connected — the
 * `WrongNetworkBanner` handles the "connected but on the wrong chain" case.
 */
export default function ChainSwitcher({ className }: { className?: string }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [pendingChainId, setPendingChainId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Clear the local pending marker once wagmi settles on the new chain.
  useEffect(() => {
    if (!isPending && pendingChainId !== null && chainId === pendingChainId) {
      setPendingChainId(null);
    }
  }, [isPending, pendingChainId, chainId]);

  if (!isConnected) return null;

  const currentLabel = getChainLabel(chainId);

  const handleSelect = (targetId: number) => {
    setOpen(false);
    if (targetId === chainId) return;
    setPendingChainId(targetId);
    switchChain?.({ chainId: targetId });
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Network: ${currentLabel}. Switch network`}
        className="flex items-center gap-1.5 rounded-full border border-border-dark bg-surface-input px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-surface-hover disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        disabled={isPending}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={14} />
        ) : (
          <Network aria-hidden="true" size={14} />
        )}
        <span className="max-w-[9rem] truncate">{isPending ? 'Switching…' : currentLabel}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </button>

      {open && (
        <ul
          className="absolute right-0 z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-border-dark bg-surface py-1 shadow-lg"
          id={menuId}
          role="menu"
        >
          {SUPPORTED_CHAINS.map((chain) => {
            const active = chain.id === chainId;
            return (
              <li key={chain.id} role="none">
                <button
                  aria-checked={active}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-gray-200 transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none"
                  role="menuitemradio"
                  type="button"
                  onClick={() => handleSelect(chain.id)}
                >
                  <span className="flex items-center gap-2">
                    {chain.label}
                    {chain.testnet && (
                      <span className="rounded bg-border-dark px-1 py-0.5 text-[10px] uppercase tracking-wide text-on-muted">
                        testnet
                      </span>
                    )}
                  </span>
                  {active && <Check aria-hidden="true" className="text-brand" size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
