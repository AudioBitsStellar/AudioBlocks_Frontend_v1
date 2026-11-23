/**
 * Shows a dismissible banner when the API is detected as down (#816).
 *
 * Allows users to dismiss the banner while cached content is shown,
 * and automatically hides when the API recovers.
 */

'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { subscribeToOutageState, isApiOutage } from '@/lib/apiOutageDetection';

export default function ApiOutageBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check initial state
    setShowBanner(isApiOutage() && !isDismissed);

    // Subscribe to outage state changes
    const unsubscribe = subscribeToOutageState((isOutage) => {
      setShowBanner(isOutage && !isDismissed);
      // Reset dismissed state when API recovers
      if (!isOutage) {
        setIsDismissed(false);
      }
    });

    return unsubscribe;
  }, [isDismissed]);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-yellow-800 font-medium">
            The API is temporarily unavailable. Showing cached content.
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            New changes may not be saved. Please try again in a moment.
          </p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
