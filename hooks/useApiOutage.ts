import { useSyncExternalStore } from 'react';
import { getApiOutageState, subscribeApiOutage, type ApiOutageState } from '@/lib/apiOutage';

/** Current API-outage state. The component re-renders when it changes (#816). */
export function useApiOutage(): ApiOutageState {
  return useSyncExternalStore(subscribeApiOutage, getApiOutageState, getApiOutageState);
}
