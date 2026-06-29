'use client';

import { useEffect } from 'react';
import { validateEnv } from '@/lib/env';

export default function EnvCheck() {
  useEffect(() => {
    try {
      validateEnv();
    } catch {
      // Error is already logged by validateEnv
    }
  }, []);
  return null;
}
