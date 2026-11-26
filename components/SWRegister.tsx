'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SWRegister() {
  const pathname = usePathname();

  useEffect(() => {
    // Only one service worker controls a scope; with API mocking on, the MSW
    // worker owns `/` and registering /sw.js would replace it (#603).
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') return;
    // Do not register service worker inside third-party embeds (#686)
    if (pathname?.startsWith('/embed')) return;

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed:', err);
        });
      });
    }
  }, [pathname]);

  return null;
}
