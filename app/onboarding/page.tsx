'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Headphones, Mic2, Sparkles } from 'lucide-react';
import { useSetAccountType } from '@/hooks/useProfile';
import { AUTH_ROLES, type AuthRole } from '@/lib/authRoles';
import { markOnboardingComplete } from '@/lib/onboarding';

/** Artist dashboard lives in its own app; the CTA links there when configured. */
const ARTIST_DASHBOARD_URL = process.env.NEXT_PUBLIC_ARTIST_DASHBOARD_URL;

/**
 * First-time onboarding screen (#478, #596).
 *
 * An authenticated, first-time user lands here via the redirect in
 * `OnboardingRedirect`. Choosing a role saves it to the backend first; only
 * then is onboarding marked done for this browser. Listeners return to their
 * original destination (`returnTo`). Artists see a CTA to the artist
 * dashboard first. "Skip for now" finishes without saving a role.
 */
const OnboardingPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccountType = useSetAccountType();
  const [savedArtist, setSavedArtist] = useState(false);

  const returnTo = searchParams.get('returnTo') || '/dashboard';

  const finish = useCallback(() => {
    markOnboardingComplete();
    router.replace(returnTo);
  }, [returnTo, router]);

  const chooseRole = useCallback(
    (role: AuthRole) => {
      setAccountType.mutate(role, {
        onSuccess: () => {
          markOnboardingComplete();
          if (role === AUTH_ROLES.ARTIST) {
            setSavedArtist(true);
          } else {
            router.replace(returnTo);
          }
        },
      });
    },
    [returnTo, router, setAccountType]
  );

  // #478 — guests who hit /onboarding directly are not authenticated and have
  // nothing to onboard; send them to the public landing page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const jwt = window.document.cookie.match(/audioblocks_jwt=([^;]+)/)?.[1];
    if (!jwt) router.replace('/');
  }, [router]);

  const isSaving = setAccountType.isPending;
  const savingRole = isSaving ? setAccountType.variables : undefined;

  if (savedArtist) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-border-dark bg-surface p-8 shadow-2xl">
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#885FA8]/15 text-[#885FA8]">
            <Mic2 aria-hidden="true" size={24} />
          </span>
          <h1 className="text-2xl font-extrabold text-white">You&apos;re set up as an artist</h1>
          <p className="mt-2 text-sm text-on-muted">
            Upload tracks, mint NFTs and manage your releases from the artist dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {ARTIST_DASHBOARD_URL && (
              <a
                className="rounded-full bg-[#D2045B] py-2 text-center text-sm font-semibold text-white transition hover:bg-[#b0034c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
                href={ARTIST_DASHBOARD_URL}
                rel="noopener noreferrer"
              >
                Open the artist dashboard
              </a>
            )}
            <button
              className="rounded-full border border-border-dark py-2 text-sm font-medium text-on-muted transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
              type="button"
              onClick={() => router.replace(returnTo)}
            >
              Continue to AudioBlocks
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div aria-busy={isSaving} className="mt-8 flex flex-col gap-3">
          <button
            className="flex items-center gap-4 rounded-xl border border-border-dark p-4 text-left transition hover:border-[#D2045B] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            disabled={isSaving}
            type="button"
            onClick={() => chooseRole(AUTH_ROLES.LISTENER)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D2045B]/15 text-[#D2045B]">
              <Headphones aria-hidden="true" size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">
                {savingRole === AUTH_ROLES.LISTENER ? 'Saving…' : 'Listen & collect'}
              </span>
              <span className="mt-0.5 block text-xs text-on-muted">
                Stream ad-free music and earn while you listen.
              </span>
            </span>
          </button>

          <button
            className="flex items-center gap-4 rounded-xl border border-border-dark p-4 text-left transition hover:border-[#885FA8] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
            disabled={isSaving}
            type="button"
            onClick={() => chooseRole(AUTH_ROLES.ARTIST)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#885FA8]/15 text-[#885FA8]">
              <Mic2 aria-hidden="true" size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">
                {savingRole === AUTH_ROLES.ARTIST ? 'Saving…' : 'Create & mint'}
              </span>
              <span className="mt-0.5 block text-xs text-on-muted">
                Upload tracks, mint NFTs and earn on-chain royalties.
              </span>
            </span>
          </button>
        </div>

        {setAccountType.isError && (
          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
            role="alert"
          >
            <span>
              We couldn&apos;t save your choice. It&apos;s still selected, so you can retry.
            </span>
            <button
              className="rounded-full border border-red-300/60 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
              type="button"
              onClick={() => {
                if (setAccountType.variables) chooseRole(setAccountType.variables);
              }}
            >
              Try again
            </button>
          </div>
        )}

        <button
          className="mt-6 w-full rounded-full border border-border-dark py-2 text-sm font-medium text-on-muted transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2AFC9]"
          disabled={isSaving}
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
