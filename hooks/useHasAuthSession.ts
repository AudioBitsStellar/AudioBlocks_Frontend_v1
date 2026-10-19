'use client';

import { useEffect, useState } from 'react';
import { hasAuthSession } from '@/lib/session';

/**
 * Whether an auth session cookie exists. Starts as `false` and is read after mount,
 * so server and client render the same markup.
 */
export function useHasAuthSession(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(hasAuthSession());
  }, []);

  return signedIn;
}
