'use client';

import { useState } from 'react';
import { useDynamicContext, useSocialAccounts } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import Icon from '@/components/ui/Icon';
import { isUserCancellationError } from '@/lib/walletErrors';

type SocialProvider = 'google' | 'twitter';

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
          err instanceof Error && err.message
            ? err.message
            : 'Social sign-in failed. Please try again.'
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
        type="button"
        onClick={() => handleSocialLogin('google')}
      >
        <Icon aria-hidden="true" className="h-4 w-4" name="google" size="sm" />
        Google
      </button>
      <button
        aria-label="Sign in with X"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-gray-700 bg-black px-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        type="button"
        onClick={() => handleSocialLogin('twitter')}
      >
        <Icon aria-hidden="true" className="h-4 w-4" name="x-brand" size="sm" />X
      </button>
    </div>
  );
}
