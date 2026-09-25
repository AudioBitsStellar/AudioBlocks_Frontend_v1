'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Headphones, Mic2, Sparkles } from 'lucide-react';
import { markOnboardingComplete } from '@/lib/onboarding';

/**
 * First-time onboarding screen (#478).
 *
 * An authenticated, first-time user lands here via the redirect in
 * `OnboardingRedirect`. Completing either path marks onboarding done for this
 * browser (see `lib/onboarding.ts`) and returns the user to their original
 * destination (`returnTo`), defaulting to the dashboard.
 */
const OnboardingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = searchParams.get('returnTo') || '/dashboard';

  const finish = useCallback(() => {
    markOnboardingComplete();
    router.replace(returnTo);
  }, [returnTo, router]);

  // #478 — guests who hit /onboarding directly are not authenticated and have
  // nothing to onboard; send them to the public landing page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const jwt = window.document.cookie.match(/audioblocks_jwt=([^;]+)/)?.[1];
    if (!jwt) router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border-dark bg-surface p-8 shadow-2xl">
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#D2045B]/15 text-[#D2045B]">
          <Sparkles aria-hidden="true" size={24} />
        </span>

        <h1 className="text-2xl font-extrabold text-white">Welcome to AudioBlocks</h1>
        <p className="mt-2 text-sm text-on-muted">
          Set up your experience in one step — pick how you&apos;ll use AudioBlocks most.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            className="flex items-center gap-4 rounded-xl border border-border-dark p-4 text-left transition hover:border-[#D2045B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            type="button"
            onClick={() => {
              // TODO(#476 follow-up): persist the chosen role to the backend
              // profile once the role update endpoint lands; today the role
              // drives the auth payload only.
              markOnboardingComplete();
              router.replace(returnTo);
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D2045B]/15 text-[#D2045B]">
              <Headphones aria-hidden="true" size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">Listen &amp; collect</span>
              <span className="mt-0.5 block text-xs text-on-muted">
                Stream ad-free music and earn while you listen.
              </span>
            </span>
          </button>

          <button
            className="flex items-center gap-4 rounded-xl border border-border-dark p-4 text-left transition hover:border-[#885FA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            type="button"
            onClick={() => {
              markOnboardingComplete();
              router.replace(returnTo);
            }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#885FA8]/15 text-[#885FA8]">
              <Mic2 aria-hidden="true" size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">Create &amp; mint</span>
              <span className="mt-0.5 block text-xs text-on-muted">
                Upload tracks, mint NFTs and earn on-chain royalties.
              </span>
            </span>
          </button>
        </div>

        <button
          className="mt-6 w-full rounded-full border border-border-dark py-2 text-sm font-medium text-on-muted transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          type="button"
          onClick={finish}
        >
          Skip for now
        </button>

        <p className="mt-4 text-center text-xs text-on-muted">
          You can change this anytime from your profile.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
