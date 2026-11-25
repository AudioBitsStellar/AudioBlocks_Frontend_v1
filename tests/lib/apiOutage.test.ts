import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OUTAGE_FAILURE_THRESHOLD,
  getApiOutageState,
  recordApiFailure,
  recordApiSuccess,
  resetApiOutageState,
  subscribeApiOutage,
} from '@/lib/apiOutage';

beforeEach(() => {
  resetApiOutageState();
});

describe('API outage detection (#816)', () => {
  it('stays inactive until the failure threshold is reached', () => {
    for (let i = 1; i < OUTAGE_FAILURE_THRESHOLD; i++) recordApiFailure();
    expect(getApiOutageState().active).toBe(false);

    recordApiFailure();
    expect(getApiOutageState()).toEqual({
      active: true,
      consecutiveFailures: OUTAGE_FAILURE_THRESHOLD,
    });
  });

  it('leaves outage mode and resets the count on the first reachable response', () => {
    for (let i = 0; i < OUTAGE_FAILURE_THRESHOLD; i++) recordApiFailure();

    recordApiSuccess();

    expect(getApiOutageState()).toEqual({ active: false, consecutiveFailures: 0 });
  });

  it('a success between failures restarts the count', () => {
    recordApiFailure();
    recordApiSuccess();
    recordApiFailure();

    expect(getApiOutageState().active).toBe(false);
  });

  it('notifies subscribers on change and not for a no-op success', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeApiOutage(listener);

    recordApiSuccess();
    expect(listener).not.toHaveBeenCalled();

    recordApiFailure();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    recordApiFailure();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the state object stable while nothing changes, for useSyncExternalStore', () => {
    const before = getApiOutageState();
    recordApiSuccess();
    expect(getApiOutageState()).toBe(before);
  });
});
