import { PaymentStatus, Prisma, type MachineStatus, type WashSessionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getSessionDetail, requireSessionDetail } from './session-details.js';
import { publishMachineRealtimeEvent, publishSessionRealtimeEvent } from './realtime-events.js';
import {
  getPaymentProvider,
  isManualConfirmEnabled,
  type ProviderCreatePaymentResult,
  type ProviderStatusSnapshot,
  type ProviderWebhookSignal,
} from './payment-provider.js';

const PAYMENT_EXPIRY_MINUTES = 5;
const ACTIVE_SESSION_STATUSES: WashSessionStatus[] = [
  'pending_payment',
  'ready_to_wash',
  'in_progress',
];

type TransitionSource = 'manual_confirm' | 'webhook' | 'reconciliation' | 'system';

type ProviderSignal = {
  providerName?: string;
  paymentId?: string;
  sessionId?: string;
  reference?: string;
  providerRef?: string;
  providerStatus?: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  eventId?: string;
  occurredAt?: Date;
  requestBody?: Prisma.InputJsonValue;
  responseBody?: Prisma.InputJsonValue;
  note?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asMetadataObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

function asJsonInput(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value as Prisma.InputJsonValue | undefined;
}

function isPaymentTerminal(status: PaymentStatus) {
  return ['confirmed', 'failed', 'cancelled', 'refunded', 'expired'].includes(status);
}

function isSessionRecoverable(status: WashSessionStatus) {
  return ['pending_payment', 'payment_failed'].includes(status);
}

export function normalizeProviderStatus(status: string): PaymentStatus {
  const normalized = status.trim().toLowerCase();
  if (['confirmed', 'success', 'succeeded', 'paid'].includes(normalized)) {
    return 'confirmed';
  }
  if (['failed', 'declined', 'error'].includes(normalized)) {
    return 'failed';
  }
  if (['cancelled', 'canceled'].includes(normalized)) {
    return 'cancelled';
  }
  if (['expired', 'timeout'].includes(normalized)) {
    return 'expired';
  }
  if (['refunded'].includes(normalized)) {
    return 'refunded';
  }
  return 'pending';
}

async function findPayment(params: {
  paymentId?: string;
  sessionId?: string;
  reference?: string;
  providerRef?: string;
  userId?: string;
}) {
  const where: Prisma.PaymentWhereInput[] = [];

  if (params.paymentId) {
    where.push({ id: params.paymentId });
  }
  if (params.sessionId) {
    where.push({ sessionId: params.sessionId });
  }
  if (params.reference) {
    where.push({ reference: params.reference });
  }
  if (params.providerRef) {
    where.push({ providerRef: params.providerRef });
  }

  if (where.length === 0) {
    throw new Error('Payment lookup data is required');
  }

  return prisma.payment.findFirst({
    where: {
      AND: [
        params.userId ? { userId: params.userId } : {},
        where.length === 1 ? where[0] : { OR: where },
      ],
    },
    include: {
      session: {
        include: {
          machine: true,
          branch: {
            select: {
              promptPayId: true,
              promptPayName: true,
            },
          },
        },
      },
    },
  });
}

async function createPaymentAttemptSafe(
  tx: Prisma.TransactionClient,
  data: Prisma.PaymentAttemptUncheckedCreateInput
) {
  if (data.eventId) {
    const existing = await tx.paymentAttempt.findFirst({
      where: { paymentId: data.paymentId, eventId: data.eventId },
      select: { id: true },
    });

    if (existing) {
      return;
    }
  }

  try {
    await tx.paymentAttempt.create({ data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      data.eventId
    ) {
      return;
    }
    throw error;
  }
}

function buildProviderPaymentContext(payment: {
  id?: string;
  sessionId: string;
  userId: string;
  branchId: string;
  amount: number;
  currency: string;
  reference: string;
  expiresAt: Date;
  providerRef?: string | null;
  provider?: string;
  metadata?: Prisma.JsonValue | null;
  branchPromptPayId: string;
  branchPromptPayName: string;
}) {
  return {
    id: payment.id,
    sessionId: payment.sessionId,
    userId: payment.userId,
    branchId: payment.branchId,
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference,
    expiresAt: payment.expiresAt,
    providerRef: payment.providerRef,
    provider: payment.provider,
    metadata: asMetadataObject(payment.metadata),
    branchPromptPayId: payment.branchPromptPayId,
    branchPromptPayName: payment.branchPromptPayName,
  };
}

function buildProviderMetadata(
  currentMetadata: Prisma.JsonValue | null | undefined,
  providerResult: ProviderCreatePaymentResult
) {
  const metadata = asMetadataObject(currentMetadata);
  return {
    ...metadata,
    lastTransitionSource: 'system',
    providerMode: providerResult.metadata?.providerMode ?? metadata.providerMode ?? 'unknown',
    providerCreatePayload: providerResult.metadata?.createResponse ?? metadata.providerCreatePayload ?? null,
  };
}

function buildProviderFetchSignal(
  snapshot: ProviderStatusSnapshot,
  note: string,
  payment: Awaited<ReturnType<typeof findPayment>>
): ProviderSignal {
  return {
    providerName: snapshot.providerName,
    providerRef: snapshot.providerRef ?? payment?.providerRef ?? undefined,
    providerStatus: snapshot.providerStatus,
    amount: snapshot.amount,
    currency: snapshot.currency,
    occurredAt: snapshot.occurredAt,
    note,
    requestBody: {
      providerRef: snapshot.providerRef ?? payment?.providerRef ?? undefined,
      providerStatus: snapshot.providerStatus,
    } as Prisma.InputJsonValue,
    responseBody: (snapshot.raw ?? { providerStatus: snapshot.providerStatus }) as Prisma.InputJsonValue,
  };
}

async function expirePayment(
  tx: Prisma.TransactionClient,
  payment: Awaited<ReturnType<typeof findPayment>>,
  source: TransitionSource,
  note?: string
) {
  if (!payment) {
    throw new Error('Payment not found');
  }

  const now = new Date();
  const metadata = asMetadataObject(payment.metadata);

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: 'expired',
      failedAt: payment.failedAt ?? now,
      providerStatus: payment.providerStatus ?? 'expired',
      lastReconciledAt: source === 'reconciliation' ? now : payment.lastReconciledAt,
      reconciliationAttempts:
        source === 'reconciliation' ? { increment: 1 } : payment.reconciliationAttempts,
      metadata: {
        ...metadata,
        lastTransitionSource: source,
        lastTransitionAt: now.toISOString(),
        ...(note ? { lastTransitionNote: note } : {}),
      },
    },
  });

  if (payment.session.status === 'pending_payment') {
    await tx.washSession.update({
      where: { id: payment.sessionId },
      data: {
        status: 'payment_failed',
        cancelledAt: payment.session.cancelledAt ?? now,
      },
    });
  }

  if (['reserved', 'idle'].includes(payment.session.machine.status)) {
    await tx.machine.update({
      where: { id: payment.session.machineId },
      data: { status: 'idle' },
    });
  }

  await createPaymentAttemptSafe(tx, {
    paymentId: payment.id,
    status: 'expired',
    source,
    action: 'expire',
    providerRef: payment.providerRef,
    providerStatus: payment.providerStatus ?? 'expired',
    note: note ?? 'payment expired before confirmation',
    responseBody: { paymentId: payment.id, source },
  });
}

async function applyPaymentTransition(
  paymentId: string,
  nextStatus: PaymentStatus,
  source: TransitionSource,
  signal: Omit<ProviderSignal, 'status'> = {}
) {
  return prisma.$transaction(async (tx) => {
    if (signal.eventId) {
      const existingEvent = await tx.paymentAttempt.findFirst({
        where: { eventId: signal.eventId },
      });

      if (existingEvent) {
        return { duplicate: true };
      }
    }

    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        session: {
          include: {
            machine: true,
            branch: {
              select: {
                promptPayId: true,
                promptPayName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (
      payment.expiresAt &&
      payment.expiresAt <= new Date() &&
      payment.status === 'pending' &&
      nextStatus === 'confirmed'
    ) {
      await expirePayment(tx, payment, source, 'payment expired before confirmation was applied');
      return { duplicate: false, paymentStatus: 'expired' as PaymentStatus, sessionId: payment.sessionId };
    }

    if (payment.status === nextStatus) {
      await createPaymentAttemptSafe(tx, {
        paymentId: payment.id,
        status: nextStatus,
        source,
        action: `duplicate_${nextStatus}`,
        providerRef: signal.providerRef ?? payment.providerRef,
        providerStatus: signal.providerStatus ?? payment.providerStatus,
        eventId: signal.eventId,
        note: signal.note ?? `duplicate ${nextStatus} signal ignored`,
        requestBody: signal.requestBody,
        responseBody: signal.responseBody,
      });
      return { duplicate: true, paymentStatus: payment.status, sessionId: payment.sessionId };
    }

    const allowConfirmFrom: PaymentStatus[] =
      source === 'manual_confirm' ? ['pending'] : ['pending', 'failed', 'expired'];

    const allowedFrom: PaymentStatus[] =
      nextStatus === 'confirmed'
        ? allowConfirmFrom
        : nextStatus === 'refunded'
          ? ['confirmed']
          : ['pending'];

    if (!allowedFrom.includes(payment.status)) {
      await createPaymentAttemptSafe(tx, {
        paymentId: payment.id,
        status: payment.status,
        source,
        action: `ignored_${nextStatus}`,
        providerRef: signal.providerRef ?? payment.providerRef,
        providerStatus: signal.providerStatus ?? payment.providerStatus,
        eventId: signal.eventId,
        note: signal.note ?? `transition ${payment.status} -> ${nextStatus} was ignored`,
        requestBody: signal.requestBody,
        responseBody: signal.responseBody,
      });

      return { duplicate: true, paymentStatus: payment.status, sessionId: payment.sessionId };
    }

    const now = signal.occurredAt ?? new Date();
    const metadata = asMetadataObject(payment.metadata);
    let machineStatusUpdate: MachineStatus | null = null;
    let sessionStatusUpdate: WashSessionStatus | null = null;
    let sessionCancelledAt: Date | null | undefined;
    let manualReviewReason: string | null = null;

    if (nextStatus === 'confirmed') {
      if (isSessionRecoverable(payment.session.status)) {
        sessionStatusUpdate = 'ready_to_wash';
        sessionCancelledAt = null;
        machineStatusUpdate = 'reserved';

        const blockingSession = await tx.washSession.findFirst({
          where: {
            machineId: payment.session.machineId,
            id: { not: payment.sessionId },
            status: { in: ACTIVE_SESSION_STATUSES },
          },
          select: { id: true },
        });

        if (blockingSession) {
          machineStatusUpdate = null;
          sessionStatusUpdate = payment.session.status;
          manualReviewReason = 'machine_unavailable_for_recovery';
        }
      } else if (payment.session.status !== 'ready_to_wash' && payment.session.status !== 'in_progress') {
        manualReviewReason = `session_${payment.session.status}_cannot_auto_recover`;
      }
    }

    if (['failed', 'expired'].includes(nextStatus)) {
      if (payment.session.status === 'pending_payment') {
        sessionStatusUpdate = 'payment_failed';
        sessionCancelledAt = payment.session.cancelledAt ?? now;
        machineStatusUpdate = 'idle';
      }
    }

    if (nextStatus === 'cancelled' && ['pending_payment', 'ready_to_wash'].includes(payment.session.status)) {
      sessionStatusUpdate = 'cancelled';
      sessionCancelledAt = payment.session.cancelledAt ?? now;
      machineStatusUpdate = 'idle';
    }

    if (nextStatus === 'refunded' && payment.session.status !== 'completed') {
      sessionStatusUpdate = 'refunded';
      sessionCancelledAt = payment.session.cancelledAt ?? now;
      machineStatusUpdate = 'idle';
    }

    const paymentUpdate: Prisma.PaymentUpdateInput = {
      status: nextStatus,
      provider: signal.providerName ?? payment.provider,
      providerRef: signal.providerRef ?? payment.providerRef,
      providerStatus: signal.providerStatus ?? nextStatus,
      currency: signal.currency ?? payment.currency,
      confirmedAt: nextStatus === 'confirmed' ? payment.confirmedAt ?? now : payment.confirmedAt,
      failedAt: ['failed', 'expired'].includes(nextStatus) ? payment.failedAt ?? now : payment.failedAt,
      cancelledAt: nextStatus === 'cancelled' ? payment.cancelledAt ?? now : payment.cancelledAt,
      refundedAt: nextStatus === 'refunded' ? payment.refundedAt ?? now : payment.refundedAt,
      providerConfirmedAt:
        nextStatus === 'confirmed' ? payment.providerConfirmedAt ?? now : payment.providerConfirmedAt,
      lastWebhookAt: source === 'webhook' ? now : payment.lastWebhookAt,
      lastWebhookEventId: source === 'webhook' ? signal.eventId ?? payment.lastWebhookEventId : payment.lastWebhookEventId,
      lastWebhookStatus:
        source === 'webhook' ? signal.providerStatus ?? nextStatus : payment.lastWebhookStatus,
      lastReconciledAt: source === 'reconciliation' ? now : payment.lastReconciledAt,
      reconciliationAttempts:
        source === 'reconciliation' ? { increment: 1 } : undefined,
      metadata: {
        ...metadata,
        lastTransitionSource: source,
        lastTransitionAt: now.toISOString(),
        ...(manualReviewReason
          ? {
              needsManualReview: true,
              manualReviewReason,
            }
          : {
              needsManualReview: false,
              manualReviewReason: null,
            }),
      },
    };

    const updated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: allowedFrom },
      },
      data: paymentUpdate,
    });

    if (updated.count === 0) {
      const latest = await tx.payment.findUnique({ where: { id: payment.id } });
      return {
        duplicate: true,
        paymentStatus: latest?.status ?? payment.status,
        sessionId: payment.sessionId,
      };
    }

    if (sessionStatusUpdate && sessionStatusUpdate !== payment.session.status) {
      await tx.washSession.update({
        where: { id: payment.sessionId },
        data: {
          status: sessionStatusUpdate,
          ...(sessionCancelledAt !== undefined ? { cancelledAt: sessionCancelledAt } : {}),
        },
      });
    }

    if (machineStatusUpdate && payment.session.machine.status !== machineStatusUpdate) {
      await tx.machine.update({
        where: { id: payment.session.machineId },
        data: { status: machineStatusUpdate },
      });
    }

    await createPaymentAttemptSafe(tx, {
      paymentId: payment.id,
      status: nextStatus,
      source,
      action: signal.note ? `transition_${nextStatus}` : nextStatus,
      providerRef: signal.providerRef ?? payment.providerRef,
      providerStatus: signal.providerStatus ?? nextStatus,
      eventId: signal.eventId,
      note: signal.note,
      requestBody: signal.requestBody,
      responseBody: signal.responseBody,
    });

    return { duplicate: false, paymentStatus: nextStatus, sessionId: payment.sessionId };
  });
}

export async function expireSessionIfNeeded(sessionId: string) {
  const payment = await findPayment({ sessionId });
  if (!payment) {
    return getSessionDetail(sessionId);
  }

  if (
    payment.status === 'pending' &&
    payment.expiresAt &&
    payment.expiresAt <= new Date()
  ) {
    await expirePayment(
      prisma as unknown as Prisma.TransactionClient,
      payment,
      'system',
      'session access triggered payment expiry'
    );
  }

  const detail = await requireSessionDetail(sessionId);
  publishSessionRealtimeEvent({
    eventType: 'payment_state_changed',
    source: 'system',
    session: detail,
  });
  if (detail.machine) {
    publishMachineRealtimeEvent({
      eventType: 'machine_status_changed',
      source: 'system',
      machine: detail.machine,
      session: detail,
    });
  }
  return detail;
}

export async function createPaymentForSession(params: { sessionId: string; userId: string }) {
  const session = await prisma.washSession.findFirst({
    where: { id: params.sessionId, userId: params.userId },
    include: {
      branch: true,
      machine: true,
      payment: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (!['pending_payment', 'payment_failed'].includes(session.status)) {
    throw new Error('Session is not awaiting payment');
  }

  if (session.payment) {
    if (
      session.payment.status === 'pending' &&
      session.payment.expiresAt &&
      session.payment.expiresAt > new Date()
    ) {
      return getSessionDetail(session.id);
    }

    if (session.payment.status === 'confirmed') {
      return getSessionDetail(session.id);
    }
  }

  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);
  const reference = `PAY-${session.id.slice(0, 8).toUpperCase()}`;
  const provider = getPaymentProvider();
  const providerPayment = await provider.createPayment({
    sessionId: session.id,
    userId: session.userId,
    branchId: session.branchId,
    branchPromptPayId: session.branch.promptPayId,
    branchPromptPayName: session.branch.promptPayName,
    amount: session.totalPrice,
    currency: 'THB',
    reference,
    expiresAt,
    metadata: {
      createdFrom: 'customer_payment_flow',
    },
  });

  await prisma.$transaction(async (tx) => {
    if (session.status === 'payment_failed' && session.machine.status === 'idle') {
      await tx.machine.update({
        where: { id: session.machineId },
        data: { status: 'reserved' },
      });
    }

    if (session.status === 'payment_failed') {
      await tx.washSession.update({
        where: { id: session.id },
        data: {
          status: 'pending_payment',
          cancelledAt: null,
        },
      });
    }

    if (session.payment) {
      await tx.payment.update({
        where: { id: session.payment.id },
        data: {
          provider: providerPayment.providerName,
          status: 'pending',
          amount: session.totalPrice,
          expiresAt: providerPayment.expiresAt ?? expiresAt,
          confirmedAt: null,
          failedAt: null,
          cancelledAt: null,
          refundedAt: null,
          providerConfirmedAt: null,
          providerStatus: providerPayment.providerStatus,
          providerRef: providerPayment.providerRef ?? null,
          reference: providerPayment.reference ?? reference,
          qrPayload: providerPayment.qrPayload ?? null,
          lastWebhookAt: null,
          lastWebhookEventId: null,
          lastWebhookStatus: null,
          lastReconciledAt: null,
          reconciliationAttempts: 0,
          metadata: buildProviderMetadata(session.payment.metadata, providerPayment),
        },
      });

      await createPaymentAttemptSafe(tx, {
        paymentId: session.payment.id,
        status: 'pending',
        source: 'system',
        action: 'refresh',
        providerRef: providerPayment.providerRef ?? undefined,
        providerStatus: providerPayment.providerStatus,
        note: 'payment refreshed for session',
        responseBody: {
          reference: providerPayment.reference ?? reference,
          expiresAt: (providerPayment.expiresAt ?? expiresAt).toISOString(),
        },
      });
    } else {
      const createdPayment = await tx.payment.create({
        data: {
          sessionId: session.id,
          userId: session.userId,
          branchId: session.branchId,
          method: 'promptpay',
          provider: providerPayment.providerName,
          status: 'pending',
          amount: session.totalPrice,
          reference: providerPayment.reference ?? reference,
          qrPayload: providerPayment.qrPayload ?? null,
          expiresAt: providerPayment.expiresAt ?? expiresAt,
          providerStatus: providerPayment.providerStatus,
          providerRef: providerPayment.providerRef ?? null,
          metadata: buildProviderMetadata(null, providerPayment),
        },
      });

      await createPaymentAttemptSafe(tx, {
        paymentId: createdPayment.id,
        status: 'pending',
        source: 'system',
        action: 'create',
        providerRef: providerPayment.providerRef ?? undefined,
        providerStatus: providerPayment.providerStatus,
        note: 'payment created for session',
        responseBody: {
          reference: providerPayment.reference ?? reference,
          expiresAt: (providerPayment.expiresAt ?? expiresAt).toISOString(),
        },
      });
    }
  });

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'payment_state_changed',
    source: 'system',
    session: detail,
  });
  if (detail.machine) {
    publishMachineRealtimeEvent({
      eventType: 'machine_status_changed',
      source: 'system',
      machine: detail.machine,
      session: detail,
    });
  }
  return detail;
}

export async function confirmPayment(params: { paymentId?: string; sessionId?: string; userId: string }) {
  if (!isManualConfirmEnabled()) {
    throw new Error('Manual payment confirm is disabled');
  }

  const payment = await findPayment({
    paymentId: params.paymentId,
    sessionId: params.sessionId,
    userId: params.userId,
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  const result = await applyPaymentTransition(payment.id, 'confirmed', 'manual_confirm', {
    providerName: payment.provider,
    providerRef: payment.providerRef ?? `manual-confirm-${payment.sessionId}`,
    providerStatus: 'confirmed',
    requestBody: { paymentId: payment.id, sessionId: payment.sessionId },
    responseBody: { source: 'payments-confirm-endpoint' },
    note: 'manual confirm fallback path',
  });

  if (result.paymentStatus === 'expired') {
    throw new Error('Payment has expired');
  }

  const detail = await requireSessionDetail(payment.sessionId);
  publishSessionRealtimeEvent({
    eventType: 'payment_state_changed',
    source: 'api',
    session: detail,
  });
  if (detail.machine) {
    publishMachineRealtimeEvent({
      eventType: 'machine_status_changed',
      source: 'api',
      machine: detail.machine,
      session: detail,
    });
  }
  return detail;
}

export async function handlePaymentWebhook(signal: ProviderWebhookSignal) {
  const payment = await findPayment({
    paymentId: signal.paymentId,
    sessionId: signal.sessionId,
    reference: signal.reference,
    providerRef: signal.providerRef ?? undefined,
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (signal.amount !== undefined && signal.amount !== payment.amount) {
    await prisma.$transaction(async (tx) => {
      await createPaymentAttemptSafe(tx, {
        paymentId: payment.id,
        status: payment.status,
        source: 'webhook',
        action: 'rejected_amount_mismatch',
        providerRef: signal.providerRef ?? undefined,
        providerStatus: signal.providerStatus,
        eventId: signal.eventId,
        note: `webhook amount mismatch: expected ${payment.amount}, got ${signal.amount}`,
        requestBody: asJsonInput(signal.requestBody),
        responseBody: asJsonInput(signal.raw),
      });
    });
    throw new Error('Webhook amount mismatch');
  }

  const nextStatus = normalizeProviderStatus(signal.providerStatus ?? 'pending');
  await applyPaymentTransition(payment.id, nextStatus, 'webhook', {
    providerName: signal.providerName,
    paymentId: signal.paymentId,
    sessionId: signal.sessionId,
    reference: signal.reference,
    providerRef: signal.providerRef ?? undefined,
    providerStatus: signal.providerStatus,
    amount: signal.amount,
    currency: signal.currency,
    eventId: signal.eventId,
    occurredAt: signal.occurredAt,
    requestBody: asJsonInput(signal.requestBody),
    responseBody: asJsonInput(signal.raw),
  });
  const detail = await requireSessionDetail(payment.sessionId);
  publishSessionRealtimeEvent({
    eventType: 'payment_state_changed',
    source: 'webhook',
    session: detail,
  });
  if (detail.machine) {
    publishMachineRealtimeEvent({
      eventType: 'machine_status_changed',
      source: 'webhook',
      machine: detail.machine,
      session: detail,
    });
  }
  return detail;
}

export async function reconcilePayment(params: {
  paymentId?: string;
  sessionId?: string;
  userId?: string;
  providerStatus?: string;
  providerRef?: string;
  amount?: number;
  note?: string;
  forceProviderLookup?: boolean;
}) {
  const payment = await findPayment({
    paymentId: params.paymentId,
    sessionId: params.sessionId,
    userId: params.userId,
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (isPaymentTerminal(payment.status) && payment.status !== 'expired' && payment.status !== 'failed') {
    const detail = await requireSessionDetail(payment.sessionId);
    publishSessionRealtimeEvent({
      eventType: 'payment_state_changed',
      source: 'reconciliation',
      session: detail,
    });
    if (detail.machine) {
      publishMachineRealtimeEvent({
        eventType: 'machine_status_changed',
        source: 'reconciliation',
        machine: detail.machine,
        session: detail,
      });
    }
    return detail;
  }

  if (params.providerStatus) {
    await applyPaymentTransition(
      payment.id,
      normalizeProviderStatus(params.providerStatus),
      'reconciliation',
      {
        providerName: payment.provider,
        providerRef: params.providerRef ?? payment.providerRef ?? undefined,
        providerStatus: params.providerStatus,
        amount: params.amount,
        note: params.note ?? 'reconciled with provider evidence',
        requestBody: {
          providerStatus: params.providerStatus,
          providerRef: params.providerRef,
          amount: params.amount,
        },
        responseBody: { source: 'reconciliation' },
      }
    );

    const detail = await requireSessionDetail(payment.sessionId);
    publishSessionRealtimeEvent({
      eventType: 'payment_state_changed',
      source: 'reconciliation',
      session: detail,
    });
    if (detail.machine) {
      publishMachineRealtimeEvent({
        eventType: 'machine_status_changed',
        source: 'reconciliation',
        machine: detail.machine,
        session: detail,
      });
    }
    return detail;
  }

  const provider = getPaymentProvider();
  const providerSnapshot = await provider.fetchPaymentStatus(
    buildProviderPaymentContext({
      id: payment.id,
      sessionId: payment.sessionId,
      userId: payment.userId,
      branchId: payment.branchId,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.reference ?? payment.sessionId,
      expiresAt: payment.expiresAt ?? new Date(),
      providerRef: params.providerRef ?? payment.providerRef,
      provider: payment.provider,
      metadata: payment.metadata,
      branchPromptPayId: payment.session.branch.promptPayId,
      branchPromptPayName: payment.session.branch.promptPayName,
    })
  );

  if (providerSnapshot) {
    if (providerSnapshot.amount !== undefined && providerSnapshot.amount !== payment.amount) {
      await prisma.$transaction(async (tx) => {
        await createPaymentAttemptSafe(tx, {
          paymentId: payment.id,
          status: payment.status,
          source: 'reconciliation',
          action: 'rejected_amount_mismatch',
          providerRef: providerSnapshot.providerRef ?? payment.providerRef ?? undefined,
          providerStatus: providerSnapshot.providerStatus,
          note: `provider verify amount mismatch: expected ${payment.amount}, got ${providerSnapshot.amount}`,
          requestBody: {
            paymentId: payment.id,
            providerRef: providerSnapshot.providerRef,
          },
          responseBody: asJsonInput(providerSnapshot.raw),
        });
      });
      throw new Error('Provider verification amount mismatch');
    }

    await applyPaymentTransition(
      payment.id,
      normalizeProviderStatus(providerSnapshot.providerStatus),
      'reconciliation',
      buildProviderFetchSignal(
        providerSnapshot,
        params.note ?? 'verified with provider status API',
        payment
      )
    );

    const detail = await requireSessionDetail(payment.sessionId);
    publishSessionRealtimeEvent({
      eventType: 'payment_state_changed',
      source: 'reconciliation',
      session: detail,
    });
    if (detail.machine) {
      publishMachineRealtimeEvent({
        eventType: 'machine_status_changed',
        source: 'reconciliation',
        machine: detail.machine,
        session: detail,
      });
    }
    return detail;
  }

  if (
    payment.lastWebhookStatus &&
    payment.lastWebhookStatus !== 'pending' &&
    ['pending', 'failed', 'expired'].includes(payment.status)
  ) {
    await applyPaymentTransition(
      payment.id,
      normalizeProviderStatus(payment.lastWebhookStatus),
      'reconciliation',
      {
        providerRef: payment.providerRef ?? undefined,
        providerStatus: payment.lastWebhookStatus,
        eventId: payment.lastWebhookEventId ?? undefined,
        occurredAt: payment.lastWebhookAt ?? undefined,
        note: 'reconciled from latest stored webhook snapshot',
      }
    );

    const detail = await requireSessionDetail(payment.sessionId);
    publishSessionRealtimeEvent({
      eventType: 'payment_state_changed',
      source: 'reconciliation',
      session: detail,
    });
    if (detail.machine) {
      publishMachineRealtimeEvent({
        eventType: 'machine_status_changed',
        source: 'reconciliation',
        machine: detail.machine,
        session: detail,
      });
    }
    return detail;
  }

  if (payment.status === 'pending' && payment.expiresAt && payment.expiresAt <= new Date()) {
    await applyPaymentTransition(payment.id, 'expired', 'reconciliation', {
      providerRef: payment.providerRef ?? undefined,
      providerStatus: 'expired',
      note: 'reconciliation expired pending payment',
    });
    return getSessionDetail(payment.sessionId);
  }

  if (params.forceProviderLookup) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          lastReconciledAt: new Date(),
          reconciliationAttempts: { increment: 1 },
          metadata: {
            ...asMetadataObject(payment.metadata),
            lastTransitionSource: 'reconciliation',
            lastTransitionNote: 'provider verify was requested but no verify endpoint is configured',
          },
        },
      });

      await createPaymentAttemptSafe(tx, {
        paymentId: payment.id,
        status: payment.status,
        source: 'reconciliation',
        action: 'verify_unavailable',
        providerRef: params.providerRef ?? payment.providerRef ?? undefined,
        providerStatus: payment.providerStatus ?? undefined,
        note: 'provider verify endpoint is not configured',
        requestBody: {
          paymentId: payment.id,
          sessionId: payment.sessionId,
        },
        responseBody: { source: 'reconciliation' },
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          lastReconciledAt: new Date(),
          reconciliationAttempts: { increment: 1 },
          metadata: {
            ...asMetadataObject(payment.metadata),
            lastTransitionSource: 'reconciliation',
            lastTransitionNote: params.note ?? 'no provider evidence available',
          },
        },
      });

      await createPaymentAttemptSafe(tx, {
        paymentId: payment.id,
        status: payment.status,
        source: 'reconciliation',
        action: 'verify',
        providerRef: params.providerRef ?? payment.providerRef,
        providerStatus: params.providerStatus ?? payment.providerStatus,
        note: params.note ?? 'no provider evidence available; payment kept as-is',
        requestBody: {
          paymentId: payment.id,
          sessionId: payment.sessionId,
        },
        responseBody: { source: 'reconciliation' },
      });
    });
  }

  const detail = await requireSessionDetail(payment.sessionId);
  publishSessionRealtimeEvent({
    eventType: 'payment_state_changed',
    source: 'reconciliation',
    session: detail,
  });
  if (detail.machine) {
    publishMachineRealtimeEvent({
      eventType: 'machine_status_changed',
      source: 'reconciliation',
      machine: detail.machine,
      session: detail,
    });
  }
  return detail;
}
