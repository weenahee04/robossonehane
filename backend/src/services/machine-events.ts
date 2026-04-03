import type { MachineStatus, Prisma, WashSessionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getSessionDetail, requireSessionDetail } from './session-details.js';
import { completeWashSession, updateWashProgress } from './wash-flow.js';
import {
  publishLegacySessionProgress,
  publishMachineRealtimeEvent,
  publishSessionRealtimeEvent,
  type SessionRealtimeEventType,
} from './realtime-events.js';

const ACTIVE_SESSION_STATUSES: WashSessionStatus[] = [
  'pending_payment',
  'ready_to_wash',
  'in_progress',
];

export type MachineEventType =
  | 'heartbeat'
  | 'reserved'
  | 'washing_started'
  | 'progress_updated'
  | 'completed'
  | 'failed'
  | 'maintenance'
  | 'offline';

export type MachineEventSource = 'mqtt' | 'api' | 'system' | 'simulation' | 'admin';

export interface MachineEventInput {
  type: MachineEventType;
  machineId?: string;
  branchId?: string;
  espDeviceId?: string;
  sessionId?: string;
  machineStatus?: MachineStatus;
  currentStep?: number;
  progress?: number;
  firmwareVersion?: string;
  reason?: string;
  errorCode?: string;
  occurredAt?: Date | string;
  rawPayload?: Prisma.InputJsonValue;
}

function clampProgress(progress: number | undefined) {
  if (progress === undefined) return undefined;
  return Math.max(0, Math.min(100, progress));
}

function parseOccurredAt(value: Date | string | undefined) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function resolveMachineStatus(event: MachineEventInput): MachineStatus {
  if (event.machineStatus) return event.machineStatus;

  switch (event.type) {
    case 'heartbeat':
      return 'idle';
    case 'reserved':
      return 'reserved';
    case 'washing_started':
    case 'progress_updated':
      return 'washing';
    case 'completed':
      return 'idle';
    case 'maintenance':
      return 'maintenance';
    case 'offline':
      return 'offline';
    case 'failed':
    default:
      return 'idle';
  }
}

async function createAuditLog(
  branchId: string | null,
  action: string,
  entityId: string | null,
  metadata: Prisma.InputJsonValue
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: 'system',
        branchId: branchId ?? undefined,
        action,
        entityType: 'machine_event',
        entityId: entityId ?? undefined,
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to write machine event audit log:', error);
  }
}

async function findMachine(event: MachineEventInput) {
  if (event.machineId) {
    return prisma.machine.findFirst({
      where: {
        id: event.machineId,
        ...(event.branchId ? { branchId: event.branchId } : {}),
      },
    });
  }

  if (event.espDeviceId) {
    return prisma.machine.findFirst({
      where: {
        espDeviceId: event.espDeviceId,
        ...(event.branchId ? { branchId: event.branchId } : {}),
      },
    });
  }

  throw new Error('Machine lookup data is required');
}

async function findRelevantSession(machineId: string, sessionId?: string) {
  if (sessionId) {
    return prisma.washSession.findUnique({
      where: { id: sessionId },
      include: { payment: true, machine: true },
    });
  }

  return prisma.washSession.findFirst({
    where: {
      machineId,
      status: { in: ACTIVE_SESSION_STATUSES },
    },
    include: { payment: true, machine: true },
    orderBy: { createdAt: 'desc' },
  });
}

function validateEventState(params: {
  event: MachineEventInput;
  machineStatus: MachineStatus;
  sessionStatus?: WashSessionStatus;
  paymentStatus?: string | null;
}) {
  if (
    ['washing_started', 'progress_updated', 'completed', 'failed'].includes(params.event.type) &&
    !params.sessionStatus
  ) {
    throw new Error(`Session is required for ${params.event.type}`);
  }

  if (
    ['washing_started', 'progress_updated', 'completed'].includes(params.event.type) &&
    params.paymentStatus &&
    params.paymentStatus !== 'confirmed'
  ) {
    throw new Error(`Payment status ${params.paymentStatus} cannot be used for ${params.event.type}`);
  }

  if (
    params.event.type === 'washing_started' &&
    params.sessionStatus &&
    !['ready_to_wash', 'in_progress'].includes(params.sessionStatus)
  ) {
    throw new Error(`Session status ${params.sessionStatus} cannot start washing`);
  }

  if (
    params.event.type === 'progress_updated' &&
    params.sessionStatus &&
    !['ready_to_wash', 'in_progress'].includes(params.sessionStatus)
  ) {
    throw new Error(`Session status ${params.sessionStatus} cannot accept progress updates`);
  }

  if (
    params.event.type === 'completed' &&
    params.sessionStatus &&
    !['ready_to_wash', 'in_progress'].includes(params.sessionStatus)
  ) {
    throw new Error(`Session status ${params.sessionStatus} cannot be completed`);
  }

  if (
    params.event.type === 'reserved' &&
    !['idle', 'reserved'].includes(params.machineStatus)
  ) {
    throw new Error(`Machine status ${params.machineStatus} cannot transition to reserved`);
  }
}

async function syncMachineRecord(params: {
  machineId: string;
  status: MachineStatus;
  occurredAt: Date;
  firmwareVersion?: string;
}) {
  await prisma.machine.update({
    where: { id: params.machineId },
    data: {
      status: params.status,
      lastHeartbeat: params.occurredAt,
      ...(params.firmwareVersion ? { firmwareVersion: params.firmwareVersion } : {}),
    },
  });
}

async function failSession(params: {
  sessionId: string;
  machineId: string;
  nextMachineStatus: MachineStatus;
  occurredAt: Date;
}) {
  const session = await prisma.washSession.findUnique({
    where: { id: params.sessionId },
    include: { payment: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  await prisma.$transaction([
    prisma.washSession.update({
      where: { id: session.id },
      data: {
        status: session.payment?.status === 'confirmed' ? 'cancelled' : 'payment_failed',
        cancelledAt: session.cancelledAt ?? params.occurredAt,
      },
    }),
    prisma.machine.update({
      where: { id: params.machineId },
      data: {
        status: params.nextMachineStatus,
        lastHeartbeat: params.occurredAt,
      },
    }),
  ]);

  return requireSessionDetail(session.id);
}

export async function handleMachineEvent(event: MachineEventInput, source: MachineEventSource) {
  const occurredAt = parseOccurredAt(event.occurredAt);
  const machine = await findMachine(event);

  if (!machine) {
    throw new Error('Machine not found');
  }

  const relevantSession = await findRelevantSession(machine.id, event.sessionId);
  const nextMachineStatus = resolveMachineStatus(event);

  validateEventState({
    event,
    machineStatus: machine.status,
    sessionStatus: relevantSession?.status,
    paymentStatus: relevantSession?.payment?.status,
  });

  let sessionDetail = relevantSession ? await requireSessionDetail(relevantSession.id) : null;

  switch (event.type) {
    case 'heartbeat': {
      const derivedStatus =
        machine.status === 'offline'
          ? relevantSession?.status === 'in_progress'
            ? 'washing'
            : relevantSession?.status && ACTIVE_SESSION_STATUSES.includes(relevantSession.status)
              ? 'reserved'
              : 'idle'
          : machine.status;

      await syncMachineRecord({
        machineId: machine.id,
        status: derivedStatus,
        occurredAt,
        firmwareVersion: event.firmwareVersion,
      });
      break;
    }
    case 'reserved': {
      await syncMachineRecord({
        machineId: machine.id,
        status: 'reserved',
        occurredAt,
        firmwareVersion: event.firmwareVersion,
      });
      break;
    }
    case 'washing_started':
    case 'progress_updated': {
      if (!relevantSession) {
        throw new Error('Session not found');
      }

      sessionDetail = await updateWashProgress({
        sessionId: relevantSession.id,
        currentStep: event.currentStep,
        progress: clampProgress(event.progress),
        machineStatus: event.type === 'washing_started' ? 'washing' : nextMachineStatus,
      });
      break;
    }
    case 'completed': {
      if (!relevantSession) {
        throw new Error('Session not found');
      }

      if (event.progress !== undefined || event.currentStep !== undefined) {
        await updateWashProgress({
          sessionId: relevantSession.id,
          currentStep: event.currentStep,
          progress: clampProgress(event.progress) ?? 100,
          machineStatus: 'washing',
        });
      }

      sessionDetail = await completeWashSession(relevantSession.id);
      break;
    }
    case 'failed': {
      if (!relevantSession) {
        throw new Error('Session not found');
      }

      sessionDetail = await failSession({
        sessionId: relevantSession.id,
        machineId: machine.id,
        nextMachineStatus,
        occurredAt,
      });
      break;
    }
    case 'maintenance': {
      await syncMachineRecord({
        machineId: machine.id,
        status: 'maintenance',
        occurredAt,
        firmwareVersion: event.firmwareVersion,
      });

      if (relevantSession?.status === 'in_progress') {
        sessionDetail = await failSession({
          sessionId: relevantSession.id,
          machineId: machine.id,
          nextMachineStatus: 'maintenance',
          occurredAt,
        });
      }
      break;
    }
    case 'offline': {
      await syncMachineRecord({
        machineId: machine.id,
        status: 'offline',
        occurredAt,
        firmwareVersion: event.firmwareVersion,
      });

      if (relevantSession?.status === 'in_progress') {
        sessionDetail = await failSession({
          sessionId: relevantSession.id,
          machineId: machine.id,
          nextMachineStatus: 'offline',
          occurredAt,
        });
      }
      break;
    }
  }

  const updatedMachine = await prisma.machine.findUnique({
    where: { id: machine.id },
  });

  if (!updatedMachine) {
    throw new Error('Machine not found after update');
  }

  if (sessionDetail) {
    const sessionEventType: SessionRealtimeEventType | null =
      event.type === 'heartbeat'
        ? 'machine_status_changed'
        : event.type === 'failed'
          ? 'failed'
          : event.type;

    publishSessionRealtimeEvent({
      eventType: sessionEventType,
      source,
      session: sessionDetail,
      machine: updatedMachine,
      reason: event.reason,
      errorCode: event.errorCode,
      occurredAt,
    });

    publishLegacySessionProgress({
      session: sessionDetail,
      machineStatus: updatedMachine.status,
      sessionStatus: sessionDetail.status,
    });
  }

  publishMachineRealtimeEvent({
    eventType: event.type,
    source,
    machine: updatedMachine,
    session: sessionDetail,
    reason: event.reason,
    errorCode: event.errorCode,
    occurredAt,
  });

  await createAuditLog(updatedMachine.branchId, `machine_event.${event.type}`, updatedMachine.id, {
    source,
    branchId: updatedMachine.branchId,
    machineId: updatedMachine.id,
    sessionId: sessionDetail?.id ?? event.sessionId ?? null,
    machineStatus: updatedMachine.status,
    sessionStatus: sessionDetail?.status ?? null,
    progress: clampProgress(event.progress) ?? sessionDetail?.progress ?? null,
    currentStep: event.currentStep ?? sessionDetail?.currentStep ?? null,
    reason: event.reason ?? null,
    errorCode: event.errorCode ?? null,
    occurredAt: occurredAt.toISOString(),
    payload: event.rawPayload ?? null,
  });

  return {
    machine: updatedMachine,
    session: sessionDetail,
  };
}

export async function markStaleMachinesOffline() {
  const threshold = new Date(Date.now() - 2 * 60 * 1000);
  const staleMachines = await prisma.machine.findMany({
    where: {
      status: { not: 'offline' },
      lastHeartbeat: { lt: threshold },
    },
    select: {
      id: true,
      branchId: true,
      espDeviceId: true,
    },
  });

  for (const machine of staleMachines) {
    try {
      await handleMachineEvent(
        {
          type: 'offline',
          machineId: machine.id,
          branchId: machine.branchId,
          espDeviceId: machine.espDeviceId,
          occurredAt: new Date(),
          reason: 'heartbeat_timeout',
          errorCode: 'MACHINE_HEARTBEAT_TIMEOUT',
        },
        'system'
      );
    } catch (error) {
      console.error(`Failed to mark machine ${machine.id} offline:`, error);
    }
  }

  return staleMachines.length;
}
