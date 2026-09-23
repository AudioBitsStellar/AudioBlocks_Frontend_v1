'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { clearSession, refreshAccessToken } from '@/lib/apiClient';
import { AUTH, SESSION } from '@/lib/constants';
import { getTokenExpiry } from '@/lib/session';

interface UseSessionExpiryOptions {
  /** Called once when the session lapses after the user was warned, or a silent refresh fails. */
  onExpire: () => void;
  warningThresholdMs?: number;
  checkIntervalMs?: number;
}

/**
 * Tracks the access token's `exp` claim and exposes state for a session
 * expiry warning.
 *
 * The cookie is re-read on every tick (and when the tab becomes visible) so a
 * token refreshed elsewhere — e.g. apiClient's refresh-on-401 — resets the
 * countdown without any coordination.
 *
 * When the token runs out:
 * - if the user was shown the warning and did nothing, the session is cleared
 *   and `onExpire` fires;
 * - if they were never warned (tab closed, laptop asleep), a silent refresh is
 *   attempted first so returning users aren't logged out without notice.
 */
export function useSessionExpiry({
  onExpire,
  warningThresholdMs = SESSION.WARNING_THRESHOLD_MS,
  checkIntervalMs = SESSION.CHECK_INTERVAL_MS,
}: UseSessionExpiryOptions) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);
  const [isExtending, setIsExtending] = useState(false);

  const warnedFor = useRef<number | null>(null);
  const handledFor = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const check = useCallback(() => {
    setExpiresAt(getTokenExpiry(Cookies.get(AUTH.COOKIE_NAME)));
    setNow(Date.now());
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, checkIntervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check, checkIntervalMs]);

  const msRemaining = expiresAt === null ? null : expiresAt - now;
  const isInWarningWindow =
    msRemaining !== null && msRemaining > 0 && msRemaining <= warningThresholdMs;

  useEffect(() => {
    if (isInWarningWindow) warnedFor.current = expiresAt;
  }, [isInWarningWindow, expiresAt]);

  useEffect(() => {
    if (expiresAt === null || msRemaining === null || msRemaining > 0) return;
    if (handledFor.current === expiresAt) return;
    handledFor.current = expiresAt;

    const expire = () => {
      clearSession();
      setExpiresAt(null);
      onExpireRef.current();
    };

    if (warnedFor.current === expiresAt) {
      expire();
    } else {
      refreshAccessToken().then(check, expire);
    }
  }, [expiresAt, msRemaining, check]);

  /** Refreshes the access token. Resolves false if the refresh failed. */
  const extendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      await refreshAccessToken();
      check();
      return true;
    } catch {
      return false;
    } finally {
      setIsExtending(false);
    }
  }, [check]);

  /** Hides the warning for the current token; expiry still signs the user out. */
  const dismiss = useCallback(() => setDismissedFor(expiresAt), [expiresAt]);

  return {
    msRemaining,
    isWarningVisible: isInWarningWindow && dismissedFor !== expiresAt,
    isExtending,
    extendSession,
    dismiss,
  };
}
