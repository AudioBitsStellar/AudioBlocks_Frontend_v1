'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { isAnalyticsEnabled } from '@/lib/analytics';

const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

/**
 * Loads the analytics script only after the visitor accepts analytics (#597)
 * and then waits for their first interaction, so it never competes with the
 * initial page load. Rejecting or revoking consent unmounts the script.
 */
export default function AnalyticsScript() {
  const [hasInteracted, setHasInteracted] = useState(false);
  const consent = useAnalyticsConsent();
  const analyticsEnabled = isAnalyticsEnabled() && consent === 'accepted';

  useEffect(() => {
    if (!analyticsEnabled) return;

    const handleInteraction = () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleInteraction);
      });
      setHasInteracted(true);
    };

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleInteraction, { once: true, passive: true });
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleInteraction);
      });
    };
  }, [analyticsEnabled]);

  if (!analyticsEnabled || !hasInteracted) return null;

  return (
    <Script
      id="analytics-script"
      src="https://www.google-analytics.com/analytics.js"
      strategy="lazyOnload"
    />
  );
}
