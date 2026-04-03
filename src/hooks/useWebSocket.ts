import { useEffect, useRef, useCallback, useState } from 'react';
import api from '@/services/api';

type MessageHandler = (data: unknown) => void;

interface UseWebSocketOptions {
  onMessage?: MessageHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token) return;

    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
    const ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
      optionsRef.current.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        optionsRef.current.onMessage?.(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      optionsRef.current.onDisconnect?.();

      if (optionsRef.current.autoReconnect !== false) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const subscribeSession = useCallback((sessionId: string) => {
    send({ type: 'subscribe_session', sessionId });
  }, [send]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, send, subscribeSession };
}
