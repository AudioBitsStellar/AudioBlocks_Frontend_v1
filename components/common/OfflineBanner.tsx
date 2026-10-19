'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-colors ${
        isOnline ? 'bg-green-600/90' : 'bg-red-600/90'
      } text-white px-4 py-3 flex items-center justify-between gap-2`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 flex-1">
        {isOnline ? (
          <>
            <Wifi size={18} />
            <span className="text-sm font-medium">Connection restored. Resuming playback...</span>
          </>
        ) : (
          <>
            <WifiOff size={18} />
            <span className="text-sm font-medium">You're offline. Playback paused.</span>
          </>
        )}
      </div>
      <button
        onClick={() => setShowBanner(false)}
        className="text-white/80 hover:text-white transition text-xs underline"
      >
        Dismiss
      </button>
    </div>
  );
}
