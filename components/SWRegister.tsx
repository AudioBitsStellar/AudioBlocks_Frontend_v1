'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    // Only one service worker controls a scope; with API mocking on, the MSW
    // worker owns `/` and registering /sw.js would replace it (#603).
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') return;
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed:', err);
        });
      });
    }
  }, []);

  return null;
}
