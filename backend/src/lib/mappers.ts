import type { MachineStatus, PaymentMethod, PaymentStatus, WashSessionStatus } from '@prisma/client';

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getCurrentMinutesInTimezone(timezone = 'Asia/Bangkok') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return (hour * 60) + minute;
}

function isAlwaysOpen(hours?: string | null) {
  if (!hours) {
    return false;
  }

  const normalized = hours.trim().toLowerCase();
  return ['24 ชม.', '24 ชม', '24h', '24 hrs', '24 hours'].includes(normalized);
}

function parseHoursRange(hours?: string | null) {
  if (!hours || isAlwaysOpen(hours)) {
    return null;
  }

  const match = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, openHour, openMinute, closeHour, closeMinute] = match;
  return {
    openMinutes: (Number(openHour) * 60) + Number(openMinute),
    closeMinutes: (Number(closeHour) * 60) + Number(closeMinute),
  };
}

function resolveOpenState(params: {
  isActive: boolean;
  hours?: string | null;
  timezone?: string | null;
}) {
  if (!params.isActive) {
    return false;
  }

  if (isAlwaysOpen(params.hours)) {
    return true;
  }

  const range = parseHoursRange(params.hours);
  if (!range) {
    return params.isActive;
  }

  const currentMinutes = getCurrentMinutesInTimezone(params.timezone ?? 'Asia/Bangkok');
  if (range.openMinutes === range.closeMinutes) {
    return true;
  }

  if (range.openMinutes < range.closeMinutes) {
    return currentMinutes >= range.openMinutes && currentMinutes < range.closeMinutes;
  }

  return currentMinutes >= range.openMinutes || currentMinutes < range.closeMinutes;
}

function matchesBranchMachineType(branchType: string, machineType?: string | null) {
  if (branchType === 'bike') {
    return machineType === 'motorcycle' || machineType === 'bike';
  }

  return machineType === 'car';
}

function summarizeBranchMachines(branchType: string, machines: Array<ReturnType<typeof mapCustomerMachine>>) {
  const relevantMachines = machines.filter(
    (machine) => machine.isEnabled !== false && matchesBranchMachineType(branchType, machine.type)
  );

  return {
    machinesTotal: relevantMachines.length,
    machinesFree: relevantMachines.filter((machine) => machine.status === 'idle').length,
  };
}

export function mapCustomerUser(user: {
  id: string;
  lineUserId?: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  tier: string;
  totalPoints: number;
  totalWashes: number;
  createdAt: Date | string;
}) {
  const createdAt = toIsoString(user.createdAt);

  return {
    id: user.id,
    lineUserId: user.lineUserId,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    tier: user.tier,
    totalPoints: user.totalPoints,
    totalWashes: user.totalWashes,
    memberSince: createdAt,
    createdAt,
  };
}

export function mapCustomerMachine(machine: {
  id: string;
  branchId?: string | null;
  code?: string | null;
  name: string;
  type?: string | null;
  status: MachineStatus;
  espDeviceId?: string | null;
  isEnabled?: boolean | null;
  maintenanceNote?: string | null;
  firmwareVersion?: string | null;
  lastHeartbeat?: Date | string | null;
}) {
  return {
    id: machine.id,
    branchId: machine.branchId ?? null,
    code: machine.code ?? null,
    name: machine.name,
    type: machine.type ?? 'car',
    status: machine.status,
    espDeviceId: machine.espDeviceId ?? '',
    isEnabled: machine.isEnabled ?? true,
    maintenanceNote: machine.maintenanceNote ?? null,
    firmwareVersion: machine.firmwareVersion ?? null,
    lastHeartbeat: toIsoString(machine.lastHeartbeat),
  };
}

export function mapCustomerPackage(pkg: {
  id: string;
  name: string;
  description?: string | null;
  vehicleType: string;
  steps?: unknown;
  stepDuration: number;
  features?: unknown;
  image?: string | null;
  isActive?: boolean;
  prices?: { S: number; M: number; L: number };
}) {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? null,
    vehicleType: pkg.vehicleType,
    prices: pkg.prices,
    steps: asStringArray(pkg.steps),
    stepDuration: pkg.stepDuration,
    features: asStringArray(pkg.features),
    isActive: pkg.isActive ?? true,
    image: pkg.image ?? null,
  };
}

export function mapCustomerBranch(branch: {
  id: string;
  name: string;
  shortName?: string | null;
  address: string;
  area: string;
  type: string;
  lat?: number;
  lng?: number;
  location?: { lat: number; lng: number };
  mapsUrl?: string | null;
  hours?: string | null;
  promptPayId: string;
  promptPayName: string;
  supportPhone?: string | null;
  timezone?: string | null;
  ownershipType?: string | null;
  ownerName?: string | null;
  isActive: boolean;
  machines?: Array<ReturnType<typeof mapCustomerMachine>>;
  packages?: Array<ReturnType<typeof mapCustomerPackage>>;
}) {
  const location = branch.location ?? {
    lat: branch.lat ?? 0,
    lng: branch.lng ?? 0,
  };
  const machines = branch.machines ?? [];
  const availability = summarizeBranchMachines(branch.type, machines);
  const isOpen = resolveOpenState({
    isActive: branch.isActive,
    hours: branch.hours,
    timezone: branch.timezone,
  });

  return {
    id: branch.id,
    name: branch.name,
    shortName: branch.shortName ?? null,
    address: branch.address,
    area: branch.area,
    type: branch.type,
    location,
    mapsUrl: branch.mapsUrl ?? null,
    hours: branch.hours ?? null,
    promptPayId: branch.promptPayId,
    promptPayName: branch.promptPayName,
    supportPhone: branch.supportPhone ?? null,
    ownershipType: branch.ownershipType ?? null,
    ownerName: branch.ownerName ?? null,
    isActive: branch.isActive,
    isOpen,
    machinesFree: availability.machinesFree,
    machinesTotal: availability.machinesTotal,
    machines: machines,
    packages: branch.packages ?? [],
  };
}

export function mapCustomerPayment(payment: {
  id: string;
  sessionId?: string;
  userId?: string;
  branchId?: string;
  method?: PaymentMethod;
  status: PaymentStatus;
  currency?: string;
  amount: number;
  provider?: string | null;
  providerRef?: string | null;
  providerStatus?: string | null;
  providerConfirmedAt?: Date | string | null;
  reference?: string | null;
  qrPayload?: string | null;
  expiresAt?: Date | string | null;
  confirmedAt?: Date | string | null;
  failedAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  refundedAt?: Date | string | null;
  metadata?: unknown;
  createdAt: Date | string;
  updatedAt?: Date | string;
  attempts?: Array<{
    id: string;
    status: string;
    source: string;
    action?: string | null;
    providerRef?: string | null;
    providerStatus?: string | null;
    eventId?: string | null;
    note?: string | null;
    attemptedAt: Date | string;
  }>;
}) {
  return {
    id: payment.id,
    sessionId: payment.sessionId ?? '',
    userId: payment.userId ?? '',
    branchId: payment.branchId ?? '',
    method: payment.method ?? 'promptpay',
    status: payment.status,
    currency: payment.currency ?? 'THB',
    amount: payment.amount,
    provider: payment.provider ?? null,
    providerRef: payment.providerRef ?? null,
    providerStatus: payment.providerStatus ?? null,
    providerConfirmedAt: toIsoString(payment.providerConfirmedAt),
    reference: payment.reference ?? null,
    qrPayload: payment.qrPayload ?? null,
    expiresAt: toIsoString(payment.expiresAt),
    confirmedAt: toIsoString(payment.confirmedAt),
    failedAt: toIsoString(payment.failedAt),
    cancelledAt: toIsoString(payment.cancelledAt),
    refundedAt: toIsoString(payment.refundedAt),
    metadata: payment.metadata ?? null,
    createdAt: toIsoString(payment.createdAt),
    updatedAt: toIsoString(payment.updatedAt),
    attempts: payment.attempts?.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      source: attempt.source,
      action: attempt.action ?? null,
      providerRef: attempt.providerRef ?? null,
      providerStatus: attempt.providerStatus ?? null,
      eventId: attempt.eventId ?? null,
      note: attempt.note ?? null,
      attemptedAt: toIsoString(attempt.attemptedAt),
    })),
  };
}

export function mapCustomerSession(session: {
  id: string;
  branchId: string;
  machineId: string;
  userId: string;
  packageId: string;
  carSize: string;
  addons?: unknown;
  subtotalPrice?: number;
  discountAmount?: number;
  totalPrice: number;
  status: WashSessionStatus;
  currentStep: number;
  totalSteps: number;
  progress: number;
  pointsEarned: number;
  rating?: number | null;
  reviewText?: string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  branch?: {
    id: string;
    name: string;
    shortName?: string | null;
    promptPayId?: string;
    promptPayName?: string;
  } | null;
  machine?: Parameters<typeof mapCustomerMachine>[0] | null;
  package?: Parameters<typeof mapCustomerPackage>[0] | null;
  payment?: Parameters<typeof mapCustomerPayment>[0] | null;
}) {
  return {
    id: session.id,
    branchId: session.branchId,
    machineId: session.machineId,
    userId: session.userId,
    packageId: session.packageId,
    carSize: session.carSize,
    addons: asStringArray(session.addons),
    subtotalPrice: session.subtotalPrice ?? session.totalPrice,
    discountAmount: session.discountAmount ?? 0,
    totalPrice: session.totalPrice,
    status: session.status,
    currentStep: session.currentStep,
    totalSteps: session.totalSteps,
    progress: session.progress,
    pointsEarned: session.pointsEarned,
    rating: session.rating ?? null,
    reviewText: session.reviewText ?? null,
    startedAt: toIsoString(session.startedAt),
    completedAt: toIsoString(session.completedAt),
    cancelledAt: toIsoString(session.cancelledAt),
    createdAt: toIsoString(session.createdAt),
    updatedAt: toIsoString(session.updatedAt),
    branch: session.branch
      ? {
          id: session.branch.id,
          name: session.branch.name,
          shortName: session.branch.shortName ?? null,
          promptPayId: session.branch.promptPayId ?? null,
          promptPayName: session.branch.promptPayName ?? null,
        }
      : null,
    machine: session.machine ? mapCustomerMachine(session.machine) : null,
    package: session.package ? mapCustomerPackage(session.package) : null,
    payment: session.payment ? mapCustomerPayment(session.payment) : null,
  };
}
