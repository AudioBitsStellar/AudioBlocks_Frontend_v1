'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return;

      const targetWindow = anchor.getAttribute('target');
      if (targetWindow && targetWindow.toLowerCase() !== '_self') return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const href = `${destination.pathname}${destination.search}${destination.hash}`;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (href === currentHref) return;

      event.preventDefault();
      setPendingHref(href);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  const navigate = useCallback(
    (href: string) => {
      if (isDirty) {
        setPendingHref(href);
      } else {
        router.push(href);
      }
    },
    [isDirty, router]
  );

  const stay = useCallback(() => setPendingHref(null), []);

  const leaveWithoutSaving = useCallback(() => {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }, [pendingHref, router]);

  return {
    isDialogOpen: pendingHref !== null,
    leaveWithoutSaving,
    navigate,
    stay,
  };
}
