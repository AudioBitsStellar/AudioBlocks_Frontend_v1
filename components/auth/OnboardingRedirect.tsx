'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { getProfile } from '@/lib/profileService';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/onboarding';

/**
 * First-time user redirect to onboarding (#478).
 *
 * Rendered once in the dashboard layout. When the Dynamic user is
 * authenticated and this browser has never completed onboarding, the visitor
 * is routed to `/onboarding` instead of seeing the dashboard first.
 *
 * Deliberately client-side (not middleware): the onboarding flag is per-browser
 * localStorage, and Dynamic's user state is only available after client
 * hydration. Unknown/unreadable storage counts as "completed" so a storage
 * failure can never trap a user in a redirect loop — the worst case is simply
 * no redirect. The user's original deep link is preserved via `returnTo`.
 */
export default function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useDynamicContext();
  const [isReady, setIsReady] = useState(false);

  // Wait one effect so this never redirects during hydration/SSR.
  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !user?.userId) return;
    if (pathname.startsWith('/onboarding')) return;
    if (hasCompletedOnboarding()) return;

    let cancelled = false;
    const returnTo = pathname + (window.location.search || '');
    const redirectToOnboarding = () => {
      if (cancelled) return;
      router.replace(`/onboarding?returnTo=${encodeURIComponent(returnTo || '/dashboard')}`);
    };

    // #596 — a role saved on the backend (possibly from another browser) means
    // onboarding is already done. A failed lookup falls back to the redirect.
    getProfile()
      .then((profile) => {
        if (profile?.accountType) {
          if (!cancelled) markOnboardingComplete();
        } else {
          redirectToOnboarding();
        }
      })
      .catch(redirectToOnboarding);

    return () => {
      cancelled = true;
    };
  }, [isReady, user?.userId, pathname, router]);

  return null;
}
