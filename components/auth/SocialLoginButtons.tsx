'use client';

import { useState } from 'react';
import { useDynamicContext, useSocialAccounts } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import { isUserCancellationError } from '@/lib/walletErrors';

type SocialProvider = 'google' | 'twitter';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
        fill="#EA4335"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SocialLoginButtonsProps {
  onLoginStart?: () => void;
  className?: string;
}

/**
 * Branded Google and X (Twitter) sign-in buttons backed by Dynamic's
 * social OAuth. Renders nothing once a user is authenticated.
 */
export function SocialLoginButtons({ onLoginStart, className = '' }: SocialLoginButtonsProps) {
  const { user } = useDynamicContext();
  const { signInWithSocialAccount, isProcessing } = useSocialAccounts();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);

  if (user?.userId) {
    return null;
  }

  const handleSocialLogin = async (provider: SocialProvider) => {
    onLoginStart?.();
    setPendingProvider(provider);
    try {
      await signInWithSocialAccount(provider);
    } catch (err) {
      if (isUserCancellationError(err)) {
        toast.error('Social sign-in was cancelled.');
      } else {
        toast.error(
          err instanceof Error && err.message ? err.message : 'Social sign-in failed. Please try again.'
        );
      }
    } finally {
      setPendingProvider(null);
    }
  };

  const busy = isProcessing || pendingProvider !== null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        aria-label="Sign in with Google"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-gray-900 transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        onClick={() => handleSocialLogin('google')}
        type="button"
      >
        <GoogleIcon />
        Google
      </button>
      <button
        aria-label="Sign in with X"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-gray-700 bg-black px-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        onClick={() => handleSocialLogin('twitter')}
        type="button"
      >
        <XIcon />
        X
      </button>
    </div>
  );
}
