import type { MachineStatus, PaymentStatus, SessionStatus } from './api';

const TOKEN_KEY = 'roboss_admin_access_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type AdminRealtimeEvent =
  | {
      type: 'machine_event';
      eventType: string;
      branchId: string | null;
      machineId: string;
      sessionId?: string | null;
      machine: {
        id: string;
        branchId: string | null;
        code?: string | null;
        name?: string | null;
        status: MachineStatus;
        espDeviceId?: string | null;
        lastHeartbeat?: string | null;
        isEnabled?: boolean | null;
        firmwareVersion?: string | null;
      };
      session?: {
        id: string;
        status: SessionStatus;
        paymentStatus?: PaymentStatus | null;
        progress?: number;
        currentStep?: number;
      } | null;
    }
  | {
      type: 'session_update';
      eventType: string;
      branchId: string;
      machineId: string;
      sessionId: string;
      session: {
        id: string;
        userId: string;
        branchId: string;
        machineId: string;
        status: SessionStatus;
        totalPrice: number;
        paymentStatus?: PaymentStatus | null;
        progress?: number;
        currentStep?: number;
        totalSteps?: number;
        carSize?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
        completedAt?: string | null;
      };
      machine?: {
        id: string;
        status: MachineStatus;
        name?: string | null;
      } | null;
    }
  | {
      type: 'connected' | 'subscribed' | 'subscription_denied' | 'pong';
      [key: string]: unknown;
    };

function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  return API_URL.replace(/^http/i, 'ws') + '/ws';
}

export function subscribeAdminRealtime(
  branchIds: string[],
  onEvent: (event: AdminRealtimeEvent) => void
) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return () => {};
  }

  const ws = new WebSocket(`${getWsUrl()}?token=${token}`);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: 'subscribe_admin',
        branchIds,
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data) as AdminRealtimeEvent);
    } catch {
      // Ignore malformed events.
    }
  };

  ws.onerror = () => {
    ws.close();
  };

  return () => {
    ws.close();
  };
}
