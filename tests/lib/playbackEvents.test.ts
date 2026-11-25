import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'audioblocks_playback_outbox_v1';
let handlers: Record<string, EventListener>;
let request: ReturnType<typeof vi.fn>;
let originalBeacon: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
  handlers = {};
  originalBeacon = Object.getOwnPropertyDescriptor(navigator, 'sendBeacon');
  vi.stubEnv('NEXT_PUBLIC_PLAYBACK_EVENT_URL', '/plays/:id');
  vi.spyOn(window, 'addEventListener').mockImplementation((name, handler) => {
    handlers[name] = handler as EventListener;
  });
  vi.spyOn(document, 'addEventListener').mockImplementation(() => {});
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  request = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', request);
});

afterEach(() => {
  if (originalBeacon) Object.defineProperty(navigator, 'sendBeacon', originalBeacon);
  else Reflect.deleteProperty(navigator, 'sendBeacon');
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('playback outbox', () => {
  it('retains offline plays across reload and removes them only after acknowledgement', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const first = await import('@/lib/playbackEvents');
    first.reportPlaybackEvent('one');
    const original = JSON.parse(localStorage.getItem(KEY)!)[0];
    expect(request).not.toHaveBeenCalled();

    vi.clearAllTimers();
    vi.resetModules();
    const reloaded = await import('@/lib/playbackEvents');
    reloaded.reportPlaybackEvent('two');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await reloaded.flushPlaybackEvents();
    expect(JSON.parse(request.mock.calls[0][1].body).eventId).toBe(original.eventId);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual([]);
  });

  it('uses a beacon on tab exit but retains the stable id for retry', async () => {
    request.mockRejectedValue(new Error('network unavailable'));
    const beacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });
    const reporter = await import('@/lib/playbackEvents');
    reporter.reportPlaybackEvent('one');
    await vi.advanceTimersByTimeAsync(0);
    const original = JSON.parse(localStorage.getItem(KEY)!)[0];
    handlers.pagehide(new Event('pagehide'));
    expect(beacon).toHaveBeenCalledWith('/plays/one', expect.any(Blob));
    expect(JSON.parse(localStorage.getItem(KEY)!)[0].eventId).toBe(original.eventId);
    request.mockResolvedValue({ ok: true });
    await reporter.flushPlaybackEvents();
    expect(JSON.parse(request.mock.calls[request.mock.calls.length - 1][1].body).eventId).toBe(original.eventId);
  });

  it('retains HTTP failures and bounds offline storage', async () => {
    const reporter = await import('@/lib/playbackEvents');
    request.mockResolvedValue({ ok: false, status: 503 });
    reporter.reportPlaybackEvent('failed');
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(1);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    for (let i = 0; i < 110; i++) reporter.reportPlaybackEvent(String(i));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(100);
  });
});
