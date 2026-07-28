'use client';

// #113 — useWebSocket: manages a WebSocket connection for real-time
// notification delivery with exponential backoff reconnection and heartbeat.

import { useCallback, useEffect, useRef, useState } from 'react';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

interface UseWebSocketOptions {
  /** Called with every parsed incoming message. */
  onMessage?: (msg: WebSocketMessage) => void;
  /** Heartbeat interval in ms (default 30 000). */
  heartbeatIntervalMs?: number;
  /** Maximum reconnect delay in ms (default 30 000). */
  maxBackoffMs?: number;
  /** Skip connecting when false (e.g. user not authenticated). */
  enabled?: boolean;
}

const INITIAL_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_HEARTBEAT_MS = 30_000;

export function useWebSocket(url: string | null | undefined, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_MS,
    maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
    enabled = true,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    reconnectTimerRef.current = null;
    heartbeatTimerRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    setConnectionState('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      backoffRef.current = INITIAL_BACKOFF_MS;

      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, heartbeatIntervalMs);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data as string);
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
      // Reconnect with exponential backoff
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, maxBackoffMs);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [url, enabled, heartbeatIntervalMs, maxBackoffMs, clearTimers]);

  useEffect(() => {
    if (!enabled || !url) {
      disconnect();
      return;
    }
    connect();
    return disconnect;
  }, [url, enabled, connect, disconnect]);

  return { connectionState };
}
