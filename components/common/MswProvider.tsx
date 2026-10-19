'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Starts the MSW browser worker when `NEXT_PUBLIC_API_MOCKING=enabled` (#603)
 * and holds rendering until it is ready, so the first requests are mocked.
 * The env value is inlined at build time, so with mocking off the branch is
 * constant-false and `@/mocks/browser` is never bundled.
 */
export default function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled');

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('@/mocks/browser')
        .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
        .catch((err) => console.error('[MSW] Failed to start the mock service worker:', err))
        .finally(() => setReady(true));
    }
  }, []);

  return ready ? children : null;
}
