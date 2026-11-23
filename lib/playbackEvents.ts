/** Durable, bounded play-count outbox. The receiver must deduplicate eventId. */
const KEY = 'audioblocks_playback_outbox_v1';
const LIMIT = 100;
const MAX_AGE = 24 * 60 * 60 * 1000;
type PlayEvent = { eventId: string; songId: string; createdAt: number; url: string };
let queue: PlayEvent[] = [];
let started = false;
let flushing = false;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch { /* Storage denial must never interrupt playback. */ }
}

function prune() {
  queue = queue.filter((event) => Date.now() - event.createdAt < MAX_AGE).slice(-LIMIT);
}

/** At most ten requests per flush; preserves the existing per-song POST API. */
export async function flushPlaybackEvents(): Promise<void> {
  if (flushing || navigator.onLine === false) return;
  prune();
  persist();
  flushing = true;
  try {
    await Promise.all(queue.slice(0, 10).map(async (event) => {
      try {
        const response = await fetch(event.url, {
          method: 'POST', credentials: 'include', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(10_000),
        });
        if (response.ok) {
          queue = queue.filter((item) => item.eventId !== event.eventId);
          persist();
        }
      } catch { /* Retry on the next timer/online event with the same eventId. */ }
    }));
  } finally {
    flushing = false;
  }
}

function flushOnExit() {
  prune();
  persist();
  if (navigator.onLine === false) return;
  for (const event of queue.slice(0, 10)) {
    // Keep the entry until an HTTP acknowledgement: true only means queued.
    try {
      const accepted = navigator.sendBeacon?.(
        event.url, new Blob([JSON.stringify(event)], { type: 'application/json' })
      );
      if (!accepted) void flushPlaybackEvents();
    } catch {
      void flushPlaybackEvents();
    }
  }
}

function start() {
  if (started) return;
  started = true;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(stored)) queue = stored.filter((event): event is PlayEvent => {
      if (!event || typeof event.eventId !== 'string' || typeof event.songId !== 'string' ||
          typeof event.createdAt !== 'number' || typeof event.url !== 'string') return false;
      const endpoint = process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL;
      return !!endpoint && event.url === endpoint.replace(':id', encodeURIComponent(event.songId));
    });
  } catch { /* Ignore corrupt or inaccessible storage. */ }
  window.addEventListener('online', () => { void flushPlaybackEvents(); });
  window.addEventListener('pagehide', flushOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });
  window.setInterval(() => { void flushPlaybackEvents(); }, 5000);
}

/** Resume an existing offline outbox when the listener mounts. */
export function initializePlaybackEvents(): void {
  if (typeof window === 'undefined' ||
      !process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL?.includes(':id')) return;
  start();
  void flushPlaybackEvents();
}

export function reportPlaybackEvent(songId: string): void {
  const endpoint = process.env.NEXT_PUBLIC_PLAYBACK_EVENT_URL;
  if (typeof window === 'undefined' || !endpoint?.includes(':id')) return;
  start();
  queue.push({
    eventId: crypto.randomUUID(), songId, createdAt: Date.now(),
    url: endpoint.replace(':id', encodeURIComponent(songId)),
  });
  prune();
  persist();
  void flushPlaybackEvents();
}
