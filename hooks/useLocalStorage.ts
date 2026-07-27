'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseLocalStorageOptions<T> {
  /** Custom serializer — defaults to JSON.stringify. */
  serialize?: (value: T) => string;
  /** Custom deserializer — defaults to JSON.parse. */
  deserialize?: (raw: string) => T;
}

/**
 * Type-safe localStorage hook with SSR hydration safety and cross-tab sync.
 *
 * Returns a `[value, setValue]` tuple identical to `useState`. Setting the
 * value to `null` removes the key from storage.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {},
): [T, (value: T | null) => void] {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options;

  // SSR safety: always start with the default so server and client markup match.
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const initialised = useRef(false);

  // Hydrate from localStorage after mount (client-only).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setStoredValue(deserialize(raw));
      }
    } catch {
      // Corrupt or inaccessible storage — keep default.
    }
    initialised.current = true;
  }, [key, deserialize]);

  // Persist to localStorage whenever the value changes (skip the initial render
  // before hydration so we don't overwrite an existing stored value with the default).
  const setValue = useCallback(
    (value: T | null) => {
      setStoredValue(value ?? defaultValue);

      if (typeof window === 'undefined') return;

      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, serialize(value));
      }
    },
    [key, defaultValue, serialize],
  );

  // Cross-tab sync: listen for `storage` events on the same key.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return;

      if (e.newValue === null) {
        setStoredValue(defaultValue);
      } else {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch {
          setStoredValue(defaultValue);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, defaultValue, deserialize]);

  return [storedValue, setValue];
}
