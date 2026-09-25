'use client';

import { useEffect, useState } from 'react';
import { Headphones, Mic2, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  AUTH_ROLE_SELECTED_EVENT,
  AUTH_ROLES,
  CONNECT_WALLET_PROMPT_COPY,
  type AuthRole,
} from '@/lib/authRoles';

/**
 * Differentiated connect-wallet prompt (#476).
 *
 * Renders a two-option modal (listener vs artist) instead of dropping every
 * visitor straight into the same Dynamic auth flow. The chosen role is
 * announced via `AUTH_ROLE_SELECTED_EVENT`; `hooks/useAuth.tsx` consumes it,
 * remembers the role for the login/register payload, and opens the Dynamic
 * auth flow. Opening the modal is up to the caller (navbar, hero, etc.) so
 * this component stays render-where-you-want.
 */
export default function ConnectWalletPrompt({ open, onClose }: ConnectWalletPromptProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectRole = (role: AuthRole) => {
    window.dispatchEvent(new CustomEvent(AUTH_ROLE_SELECTED_EVENT, { detail: { role } }));
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      description={CONNECT_WALLET_PROMPT_COPY.description}
      open={open}
      size="sm"
      title={CONNECT_WALLET_PROMPT_COPY.title}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <button
          className="flex items-center gap-4 rounded-xl border border-border-dark bg-surface p-4 text-left transition hover:border-[#D2045B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          type="button"
          onClick={() => selectRole(AUTH_ROLES.LISTENER)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D2045B]/15 text-[#D2045B]">
            <Headphones aria-hidden="true" size={20} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-white">
              {CONNECT_WALLET_PROMPT_COPY.listener.title}
            </span>
            <span className="mt-0.5 block text-xs text-on-muted">
              {CONNECT_WALLET_PROMPT_COPY.listener.description}
            </span>
          </span>
          <ArrowRight aria-hidden="true" className="text-on-muted" size={16} />
        </button>

        <button
          className="flex items-center gap-4 rounded-xl border border-border-dark bg-surface p-4 text-left transition hover:border-[#885FA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          type="button"
          onClick={() => selectRole(AUTH_ROLES.ARTIST)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#885FA8]/15 text-[#885FA8]">
            <Mic2 aria-hidden="true" size={20} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-white">
              {CONNECT_WALLET_PROMPT_COPY.artist.title}
            </span>
            <span className="mt-0.5 block text-xs text-on-muted">
              {CONNECT_WALLET_PROMPT_COPY.artist.description}
            </span>
          </span>
          <ArrowRight aria-hidden="true" className="text-on-muted" size={16} />
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-on-muted">
        Connecting a wallet lets you sign in — we never take custody of your funds.
      </p>
    </Modal>
  );
}
interface ConnectWalletPromptProps {
  open: boolean;
  onClose: () => void;
}
