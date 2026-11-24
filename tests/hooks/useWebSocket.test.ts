import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '@/hooks/useWebSocket';
import * as sessionModule from '@/lib/session';

// Mock WebSocket implementation
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helpers
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  triggerMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  triggerError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

describe('useWebSocket (#113)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('connects to WebSocket endpoint when user is authenticated', () => {
    const { result } = renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));

    expect(result.current.connectionState).toBe('connecting');
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('wss://api.audioblocks.com/ws');

    act(() => {
      MockWebSocket.instances[0].triggerOpen();
    });

    expect(result.current.connectionState).toBe('connected');
  });

  it('does not connect when unauthenticated (enabled: false)', () => {
    vi.spyOn(sessionModule, 'hasAuthSession').mockReturnValue(false);

    const { result } = renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));

    expect(result.current.connectionState).toBe('disconnected');
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('resolves URL from environment when not explicitly provided', () => {
    const prevEnv = process.env.NEXT_PUBLIC_WS_URL;
    process.env.NEXT_PUBLIC_WS_URL = 'wss://env.audioblocks.com/ws';

    try {
      const { result } = renderHook(() => useWebSocket());

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe('wss://env.audioblocks.com/ws');
      expect(result.current.connectionState).toBe('connecting');
    } finally {
      process.env.NEXT_PUBLIC_WS_URL = prevEnv;
    }
  });

  it('parses incoming JSON messages and invokes onMessage callback', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('wss://api.audioblocks.com/ws', { onMessage }));

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });

    act(() => {
      ws.triggerMessage(JSON.stringify({ type: 'notification', payload: { id: 'n1' } }));
    });

    expect(onMessage).toHaveBeenCalledWith({
      type: 'notification',
      payload: { id: 'n1' },
    });
  });

  it('ignores pong and non-JSON incoming messages without crashing', () => {
    const onMessage = vi.fn();
    renderHook(() => useWebSocket('wss://api.audioblocks.com/ws', { onMessage }));

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });

    // Pong should be ignored
    act(() => {
      ws.triggerMessage(JSON.stringify({ type: 'pong' }));
    });
    expect(onMessage).not.toHaveBeenCalled();

    // Invalid non-JSON string should not throw
    act(() => {
      ws.triggerMessage('invalid raw non-json message');
    });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('sets state to error when WebSocket emits error', () => {
    const { result } = renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.triggerError();
    });

    expect(result.current.connectionState).toBe('error');
  });

  it('auto-reconnects with exponential backoff (1s, 2s, 4s... max 30s)', () => {
    const { result } = renderHook(() =>
      useWebSocket('wss://api.audioblocks.com/ws', { maxBackoffMs: 30000 })
    );

    // Initial connection
    expect(MockWebSocket.instances).toHaveLength(1);
    const ws1 = MockWebSocket.instances[0];

    // Unexpected close triggers reconnect after 1s
    act(() => {
      ws1.triggerClose();
    });
    expect(result.current.connectionState).toBe('disconnected');
    expect(MockWebSocket.instances).toHaveLength(1);

    // Advance 1s -> should reconnect
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(result.current.connectionState).toBe('connecting');

    const ws2 = MockWebSocket.instances[1];
    // Next unexpected close -> backoff doubled to 2s
    act(() => {
      ws2.triggerClose();
    });
    expect(MockWebSocket.instances).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(2); // Still waiting

    act(() => {
      vi.advanceTimersByTime(1000); // 2s elapsed
    });
    expect(MockWebSocket.instances).toHaveLength(3); // Reconnected

    const ws3 = MockWebSocket.instances[2];
    // Third close -> backoff doubled to 4s
    act(() => {
      ws3.triggerClose();
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(MockWebSocket.instances).toHaveLength(4);
  });

  it('resets exponential backoff upon successful connection', () => {
    renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));

    const ws1 = MockWebSocket.instances[0];
    act(() => {
      ws1.triggerClose();
    });

    // 1st backoff = 1s
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);

    const ws2 = MockWebSocket.instances[1];
    // Successfully open ws2 -> should reset backoff to 1s
    act(() => {
      ws2.triggerOpen();
    });

    // Close ws2
    act(() => {
      ws2.triggerClose();
    });

    // Next reconnect should be 1s again, not 2s or 4s
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('sends heartbeat ping every 30 seconds while connected', () => {
    renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });

    expect(ws.sentMessages).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(ws.sentMessages).toEqual([JSON.stringify({ type: 'ping' })]);

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(ws.sentMessages).toEqual([
      JSON.stringify({ type: 'ping' }),
      JSON.stringify({ type: 'ping' }),
    ]);
  });

  it('performs clean disconnect on logout or unmount without reconnecting', () => {
    const { unmount } = renderHook(() => useWebSocket('wss://api.audioblocks.com/ws'));

    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.triggerOpen();
    });

    unmount();

    expect(ws.readyState).toBe(MockWebSocket.CLOSED);

    // Timers advancing should NOT create a new WebSocket instance
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
