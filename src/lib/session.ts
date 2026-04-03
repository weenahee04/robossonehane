import type { Payment, WashSession } from '@/types';

export type WashStage = 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled';

export function getSessionPaymentStatus(session: Pick<WashSession, 'status' | 'payment'>) {
  return (
    session.payment?.status ??
    (session.status === 'payment_failed'
      ? 'failed'
      : session.status === 'pending_payment'
        ? 'pending'
        : 'confirmed')
  ) as Payment['status'];
}

export function getSessionWashStage(session: Pick<WashSession, 'status'>): WashStage {
  switch (session.status) {
    case 'pending_payment':
    case 'payment_failed':
      return 'waiting';
    case 'ready_to_wash':
      return 'ready';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'cancelled';
  }
}
