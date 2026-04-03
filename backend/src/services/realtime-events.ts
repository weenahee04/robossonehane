import type { MachineStatus, PaymentStatus, WashSessionStatus } from '@prisma/client';
import { broadcastRealtime } from './websocket.js';

type RealtimeSource = 'system' | 'api' | 'mqtt' | 'webhook' | 'reconciliation' | 'simulation' | 'admin';

export type SessionRealtimeEventType =
  | 'session_created'
  | 'payment_state_changed'
  | 'reserved'
  | 'washing_started'
  | 'progress_updated'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'maintenance'
  | 'offline'
  | 'machine_status_changed';

export type MachineRealtimeEventType =
  | 'heartbeat'
  | 'reserved'
  | 'washing_started'
  | 'progress_updated'
  | 'completed'
  | 'failed'
  | 'maintenance'
  | 'offline'
  | 'machine_status_changed';

export interface MachineSnapshotLike {
  id: string;
  branchId?: string | null;
  code?: string | null;
  name?: string | null;
  status: MachineStatus;
  espDeviceId?: string | null;
  isEnabled?: boolean | null;
  firmwareVersion?: string | null;
  lastHeartbeat?: Date | string | null;
}

export interface SessionSnapshotLike {
  id: string;
  userId: string;
  branchId: string;
  machineId: string;
  packageId?: string | null;
  status: WashSessionStatus;
  progress: number;
  currentStep: number;
  totalSteps?: number;
  totalPrice?: number;
  carSize?: string | null;
  pointsEarned?: number;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  payment?: { id?: string; status?: PaymentStatus | null; reference?: string | null; amount?: number | null } | null;
  machine?: MachineSnapshotLike | null;
  branch?: { id?: string; name?: string | null; shortName?: string | null } | null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function buildMachineSnapshot(machine: MachineSnapshotLike) {
  return {
    id: machine.id,
    branchId: machine.branchId ?? null,
    code: machine.code ?? null,
    name: machine.name ?? null,
    status: machine.status,
    espDeviceId: machine.espDeviceId ?? null,
    isEnabled: machine.isEnabled ?? null,
    firmwareVersion: machine.firmwareVersion ?? null,
    lastHeartbeat: toIso(machine.lastHeartbeat),
  };
}

export function buildSessionSnapshot(session: SessionSnapshotLike) {
  return {
    id: session.id,
    userId: session.userId,
    branchId: session.branchId,
    machineId: session.machineId,
    packageId: session.packageId ?? null,
    status: session.status,
    progress: session.progress,
    currentStep: session.currentStep,
    totalSteps: session.totalSteps ?? 0,
    totalPrice: session.totalPrice ?? 0,
    carSize: session.carSize ?? null,
    pointsEarned: session.pointsEarned ?? 0,
    startedAt: toIso(session.startedAt),
    completedAt: toIso(session.completedAt),
    cancelledAt: toIso(session.cancelledAt),
    createdAt: toIso(session.createdAt),
    updatedAt: toIso(session.updatedAt),
    paymentStatus: session.payment?.status ?? null,
    paymentReference: session.payment?.reference ?? null,
    machineStatus: session.machine?.status ?? null,
    branchName: session.branch?.name ?? null,
  };
}

export function publishSessionRealtimeEvent(params: {
  eventType: SessionRealtimeEventType;
  source: RealtimeSource;
  session: SessionSnapshotLike;
  machine?: MachineSnapshotLike | null;
  reason?: string;
  errorCode?: string;
  occurredAt?: Date;
}) {
  const occurredAt = (params.occurredAt ?? new Date()).toISOString();
  const sessionSnapshot = buildSessionSnapshot(params.session);
  const machineSnapshot = params.machine
    ? buildMachineSnapshot(params.machine)
    : params.session.machine
      ? buildMachineSnapshot(params.session.machine)
      : null;

  broadcastRealtime(
    {
      type: 'session_update',
      stream: 'session.updated',
      eventType: params.eventType,
      source: params.source,
      occurredAt,
      reason: params.reason ?? null,
      errorCode: params.errorCode ?? null,
      branchId: params.session.branchId,
      machineId: params.session.machineId,
      sessionId: params.session.id,
      session: sessionSnapshot,
      machine: machineSnapshot,
    },
    {
      sessionId: params.session.id,
      branchId: params.session.branchId,
      machineId: params.session.machineId,
      userId: params.session.userId,
    }
  );
}

export function publishMachineRealtimeEvent(params: {
  eventType: MachineRealtimeEventType;
  source: RealtimeSource;
  machine: MachineSnapshotLike;
  session?: SessionSnapshotLike | null;
  reason?: string;
  errorCode?: string;
  occurredAt?: Date;
}) {
  const occurredAt = (params.occurredAt ?? new Date()).toISOString();

  broadcastRealtime(
    {
      type: 'machine_event',
      stream: 'machine.events',
      eventType: params.eventType,
      source: params.source,
      occurredAt,
      reason: params.reason ?? null,
      errorCode: params.errorCode ?? null,
      branchId: params.machine.branchId ?? null,
      machineId: params.machine.id,
      sessionId: params.session?.id ?? null,
      machine: buildMachineSnapshot(params.machine),
      session: params.session ? buildSessionSnapshot(params.session) : null,
    },
    {
      branchId: params.machine.branchId ?? undefined,
      machineId: params.machine.id,
      sessionId: params.session?.id,
      userId: params.session?.userId,
    }
  );
}

export function publishLegacySessionProgress(params: {
  session: {
    id: string;
    progress: number;
    currentStep: number;
    status: WashSessionStatus;
    pointsEarned?: number;
  };
  machineStatus: MachineStatus;
  sessionStatus?: WashSessionStatus;
}) {
  broadcastRealtime(
    {
      type: 'session_progress',
      sessionId: params.session.id,
      currentStep: params.session.currentStep,
      progress: params.session.progress,
      status: params.machineStatus,
      sessionStatus: params.sessionStatus ?? params.session.status,
      pointsEarned: params.session.pointsEarned ?? 0,
    },
    {
      sessionId: params.session.id,
    }
  );
}
