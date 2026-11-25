'use client';

// #113 — useWebSocket: manages a WebSocket connection for real-time
// notification delivery with exponential backoff reconnection and heartbeat.

import { useCallback, useEffect, useRef, useState } from 'react';
import { hasAuthSession } from '@/lib/session';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface UseWebSocketOptions {
  /** Called with every parsed incoming message. */
  onMessage?: (msg: WebSocketMessage) => void;
  /** Heartbeat interval in ms (default 30 000). */
  heartbeatIntervalMs?: number;
  /** Maximum reconnect delay in ms (default 30 000). */
  maxBackoffMs?: number;
  /** Skip connecting when false (e.g. user not authenticated). Defaults to hasAuthSession(). */
  enabled?: boolean;
}

const INITIAL_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_HEARTBEAT_MS = 30_000;

function resolveDefaultWsUrl(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws');
    }
  }
  return undefined;
}

export function useWebSocket(
  urlOrOptions?: string | null | UseWebSocketOptions,
  maybeOptions?: UseWebSocketOptions
) {
  let explicitUrl: string | null | undefined;
  let options: UseWebSocketOptions;

  if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    options = urlOrOptions;
    explicitUrl = undefined;
  } else {
    explicitUrl = urlOrOptions;
    options = maybeOptions ?? {};
  }

  const resolvedUrl = explicitUrl !== undefined ? explicitUrl : resolveDefaultWsUrl();

  const {
    onMessage,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_MS,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    enabled = hasAuthSession(),
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const isManuallyClosedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimers();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (!resolvedUrl || !enabled) {
      return;
    }

    isManuallyClosedRef.current = false;
    clearTimers();

    // Close any previous instance cleanly
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(resolvedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        backoffRef.current = INITIAL_BACKOFF_MS;

        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {
              // Ignore send error on heartbeat
            }
          }
        }, heartbeatIntervalMs);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : String(event.data);
          const msg: WebSocketMessage = JSON.parse(raw);
          if (msg.type !== 'pong') {
            onMessageRef.current?.(msg);
          }
        } catch {
          // Non-JSON frames are silently ignored
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
      };

      ws.onclose = () => {
        clearTimers();
        setConnectionState('disconnected');

        if (isManuallyClosedRef.current || !enabled) {
          return;
        }

        // Reconnect with exponential backoff (1s, 2s, 4s... up to maxBackoffMs)
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, maxBackoffMs);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    } catch {
      setConnectionState('error');
    }
  }, [resolvedUrl, enabled, heartbeatIntervalMs, maxBackoffMs, clearTimers]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!enabled || !resolvedUrl) {
      disconnect();
      return;
    }
    connect();
    return disconnect;
  }, [resolvedUrl, enabled, connect, disconnect]);

  return {
    connectionState,
    disconnect,
    reconnect: connect,
    sendMessage,
    ws: wsRef.current,
  };
}

export default useWebSocket;
