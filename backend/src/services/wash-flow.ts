import { WashSessionStatus } from '@prisma/client';
import { getRuntimeConfig } from '../lib/config.js';
import { mapCustomerBranch, mapCustomerMachine, mapCustomerPackage } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { isMqttReady, publishWashCommand } from './mqtt.js';
import { expireSessionIfNeeded } from './payment-flow.js';
import { getSessionDetail, requireSessionDetail } from './session-details.js';
import {
  publishLegacySessionProgress,
  publishMachineRealtimeEvent,
  publishSessionRealtimeEvent,
} from './realtime-events.js';

const DEFAULT_POINTS_RATE = 10;
const simulatedWashTimers = new Map<string, ReturnType<typeof setInterval>>();

const ACTIVE_SESSION_STATUSES: WashSessionStatus[] = [
  'pending_payment',
  'ready_to_wash',
  'in_progress',
];

export function parseQrPayload(qrData: string) {
  const trimmed = qrData.trim();

  const urlMatch = trimmed.match(/^roboss:\/\/([^/]+)\/([^/?#]+)$/i);
  if (urlMatch) {
    return { branchId: urlMatch[1], machineId: urlMatch[2] };
  }

  const legacyMatch = trimmed.match(/^roboss[:|]([^:|]+)[:|]([^:|]+)$/i);
  if (legacyMatch) {
    return { branchId: legacyMatch[1], machineId: legacyMatch[2] };
  }

  try {
    const parsed = JSON.parse(trimmed) as { branchId?: string; machineId?: string };
    if (parsed.branchId && parsed.machineId) {
      return { branchId: parsed.branchId, machineId: parsed.machineId };
    }
  } catch {
    // Ignore non-JSON payloads.
  }

  return null;
}

export async function resolveBranchMachineFromQr(qrData: string) {
  const parsed = parseQrPayload(qrData);
  if (!parsed) {
    return null;
  }

  const machine = await prisma.machine.findFirst({
    where: {
      id: parsed.machineId,
      branchId: parsed.branchId,
    },
    include: {
      branch: {
        include: {
          settings: true,
          machines: {
            select: {
              id: true,
              branchId: true,
              code: true,
              name: true,
              type: true,
              status: true,
              espDeviceId: true,
              isEnabled: true,
              maintenanceNote: true,
              firmwareVersion: true,
              lastHeartbeat: true,
            },
          },
          packageConfigs: {
            where: { isActive: true, isVisible: true },
            include: { package: true },
          },
        },
      },
    },
  });

  if (!machine) {
    return null;
  }

  const branch = machine.branch;
  return {
    qrData,
    branch: mapCustomerBranch({
      ...branch,
      supportPhone: branch.settings?.supportPhone ?? null,
      timezone: branch.settings?.timezone ?? 'Asia/Bangkok',
      machines: branch.machines.map((branchMachine) => mapCustomerMachine(branchMachine)),
      packages: branch.packageConfigs.map((config) =>
        mapCustomerPackage({
          id: config.package.id,
          name: config.displayName ?? config.package.name,
          description: config.descriptionOverride ?? config.package.description,
          vehicleType: config.package.vehicleType,
          prices: {
            S: config.priceOverrideS ?? config.package.priceS,
            M: config.priceOverrideM ?? config.package.priceM,
            L: config.priceOverrideL ?? config.package.priceL,
          },
          steps: config.package.steps,
          stepDuration: config.package.stepDuration,
          features: config.package.features,
          isActive: config.package.isActive,
          image: config.package.image,
        })
      ),
    }),
    machine: mapCustomerMachine(machine),
  };
}

export async function createWashSession(params: {
  userId: string;
  branchId: string;
  machineId: string;
  packageId: string;
  carSize: 'S' | 'M' | 'L';
  addons: string[];
  totalPrice?: number;
  couponId?: string;
}) {
  const machine = await prisma.machine.findUnique({
    where: { id: params.machineId },
  });

  if (!machine || !machine.isEnabled || machine.branchId !== params.branchId) {
    throw new Error('Machine is not available');
  }

  if (!['idle', 'reserved'].includes(machine.status)) {
    throw new Error('Machine is not available');
  }

  const existingSession = await prisma.washSession.findFirst({
    where: {
      machineId: params.machineId,
      status: { in: ACTIVE_SESSION_STATUSES },
    },
    include: { payment: true },
    orderBy: { createdAt: 'desc' },
  });

  if (existingSession) {
    await expireSessionIfNeeded(existingSession.id);
  }

  const blockingSession = await prisma.washSession.findFirst({
    where: {
      machineId: params.machineId,
      status: { in: ACTIVE_SESSION_STATUSES },
    },
  });

  if (blockingSession) {
    throw new Error('Machine is already reserved');
  }

  const branchPackageConfig = await prisma.branchPackageConfig.findUnique({
    where: {
      branchId_packageId: {
        branchId: params.branchId,
        packageId: params.packageId,
      },
    },
    include: {
      package: true,
    },
  });

  if (!branchPackageConfig || !branchPackageConfig.isActive || !branchPackageConfig.isVisible) {
    throw new Error('Package not found');
  }

  const pkg = branchPackageConfig.package;
  const resolvedPrice =
    params.carSize === 'S'
      ? branchPackageConfig.priceOverrideS ?? pkg.priceS
      : params.carSize === 'M'
        ? branchPackageConfig.priceOverrideM ?? pkg.priceM
        : branchPackageConfig.priceOverrideL ?? pkg.priceL;

  const subtotalPrice = params.totalPrice ?? resolvedPrice;
  const steps = Array.isArray(pkg.steps) ? pkg.steps : [];

  let couponSelection:
    | {
        userCouponId: string;
        couponId: string;
        discountAmount: number;
      }
    | null = null;

  if (params.couponId) {
    const userCoupon = await prisma.userCoupon.findFirst({
      where: {
        id: params.couponId,
        userId: params.userId,
        status: 'claimed',
      },
      include: {
        coupon: {
          include: {
            branches: {
              select: { branchId: true },
            },
          },
        },
      },
    });

    if (!userCoupon) {
      throw new Error('Coupon not found');
    }

    const now = new Date();
    const allowedBranchIds = userCoupon.coupon.branches.map((branch) => branch.branchId);
    const matchesBranch =
      userCoupon.coupon.scope === 'all_branches' || allowedBranchIds.includes(params.branchId);
    const matchesPackage =
      userCoupon.coupon.packageIds.length === 0 || userCoupon.coupon.packageIds.includes(params.packageId);

    if (userCoupon.coupon.status !== 'active') {
      throw new Error('Coupon is not active');
    }
    if (now < userCoupon.coupon.validFrom || now > userCoupon.coupon.validUntil) {
      throw new Error('Coupon is not valid at this time');
    }
    if (!matchesBranch) {
      throw new Error('Coupon is not valid for this branch');
    }
    if (!matchesPackage) {
      throw new Error('Coupon is not valid for this package');
    }
    if (subtotalPrice < userCoupon.coupon.minSpend) {
      throw new Error('Coupon minimum spend not reached');
    }

    const discountAmount =
      userCoupon.coupon.discountType === 'percent'
        ? Math.floor(subtotalPrice * (userCoupon.coupon.discountValue / 100))
        : userCoupon.coupon.discountValue;

    couponSelection = {
      userCouponId: userCoupon.id,
      couponId: userCoupon.couponId,
      discountAmount: Math.min(discountAmount, subtotalPrice),
    };
  }

  const discountAmount = couponSelection?.discountAmount ?? 0;
  const totalPrice = Math.max(subtotalPrice - discountAmount, 0);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.washSession.create({
      data: {
        userId: params.userId,
        branchId: params.branchId,
        machineId: params.machineId,
        packageId: params.packageId,
        branchPackageConfigId: branchPackageConfig.id,
        carSize: params.carSize,
        addons: params.addons,
        subtotalPrice,
        discountAmount,
        totalPrice,
        totalSteps: steps.length,
        status: 'pending_payment',
      },
    });

    if (couponSelection) {
      await tx.userCoupon.update({
        where: { id: couponSelection.userCouponId },
        data: {
          status: 'redeemed',
          redeemedAt: new Date(),
        },
      });

      await tx.couponRedemption.create({
        data: {
          userCouponId: couponSelection.userCouponId,
          couponId: couponSelection.couponId,
          userId: params.userId,
          branchId: params.branchId,
          sessionId: created.id,
          discountAmount: couponSelection.discountAmount,
        },
      });

      await tx.coupon.update({
        where: { id: couponSelection.couponId },
        data: {
          usedCount: { increment: 1 },
        },
      });
    }

    await tx.machine.update({
      where: { id: params.machineId },
      data: { status: 'reserved' },
    });

    return created;
  });

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'session_created',
    source: 'api',
    session: detail,
  });
  publishMachineRealtimeEvent({
    eventType: 'reserved',
    source: 'api',
    machine: detail.machine ?? {
      id: session.machineId,
      branchId: session.branchId,
      code: null,
      name: 'Unknown machine',
      status: 'reserved',
      espDeviceId: '',
      isEnabled: true,
      lastHeartbeat: null,
      firmwareVersion: null,
    },
    session: detail,
  });
  return detail;
}

export async function startWashSession(params: { sessionId: string; userId: string }) {
  const session = await prisma.washSession.findFirst({
    where: { id: params.sessionId, userId: params.userId },
    include: {
      branch: true,
      machine: true,
      payment: true,
      package: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'ready_to_wash') {
    throw new Error('Session is not ready to wash');
  }

  if (!session.payment || session.payment.status !== 'confirmed') {
    throw new Error('Payment is not confirmed');
  }

  const canUseSimulation = getRuntimeConfig().allowSimulatedWash;
  const commandChannelReady = isMqttReady();
  if (!commandChannelReady && !canUseSimulation) {
    throw new Error('Machine command channel is unavailable');
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.washSession.update({
      where: { id: session.id },
      data: {
        status: 'in_progress',
        startedAt: session.startedAt ?? now,
      },
    }),
    prisma.machine.update({
      where: { id: session.machineId },
      data: { status: 'washing' },
    }),
  ]);

  const commandSent = publishWashCommand(session.branchId, session.machine.espDeviceId, 'start', {
    sessionId: session.id,
    packageId: session.packageId,
    carSize: session.carSize,
  });

  if (!commandSent && canUseSimulation) {
    startSimulatedWash(session.id);
  }

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'washing_started',
    source: commandSent ? 'api' : 'simulation',
    session: detail,
  });
  publishMachineRealtimeEvent({
    eventType: 'washing_started',
    source: commandSent ? 'api' : 'simulation',
    machine: detail.machine ?? {
      id: session.machineId,
      branchId: session.branchId,
      code: session.machine.code,
      name: session.machine.name,
      status: 'washing',
      espDeviceId: session.machine.espDeviceId,
      isEnabled: session.machine.isEnabled,
      lastHeartbeat: session.machine.lastHeartbeat,
      firmwareVersion: session.machine.firmwareVersion,
    },
    session: detail,
  });
  publishLegacySessionProgress({
    session: detail,
    machineStatus: 'washing',
  });

  return detail;
}

export async function updateWashProgress(params: {
  sessionId: string;
  currentStep?: number;
  progress?: number;
  machineStatus?: 'idle' | 'reserved' | 'washing' | 'maintenance' | 'offline';
}) {
  const session = await prisma.washSession.findUnique({
    where: { id: params.sessionId },
    include: { machine: true, payment: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'in_progress' && session.status !== 'ready_to_wash') {
    return getSessionDetail(session.id);
  }

  const updateData: Record<string, unknown> = {};
  if (params.currentStep !== undefined) updateData.currentStep = params.currentStep;
  if (params.progress !== undefined) updateData.progress = Math.max(0, Math.min(100, params.progress));
  if (
    session.status === 'ready_to_wash' &&
    (!session.payment || session.payment.status !== 'confirmed')
  ) {
    throw new Error('Payment is not confirmed');
  }

  if (
    session.status === 'ready_to_wash' &&
    ((params.progress ?? 0) > 0 || params.machineStatus === 'washing')
  ) {
    updateData.status = 'in_progress';
    updateData.startedAt = session.startedAt ?? new Date();
  }

  await prisma.washSession.update({
    where: { id: session.id },
    data: updateData,
  });

  if (params.machineStatus) {
    await prisma.machine.update({
      where: { id: session.machineId },
      data: { status: params.machineStatus },
    });
  }

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'progress_updated',
    source: 'api',
    session: detail,
  });
  publishMachineRealtimeEvent({
    eventType: 'progress_updated',
    source: 'api',
    machine: detail.machine ?? {
      id: session.machineId,
      branchId: session.branchId,
      code: session.machine.code,
      name: session.machine.name,
      status: params.machineStatus ?? session.machine.status,
      espDeviceId: session.machine.espDeviceId,
      isEnabled: session.machine.isEnabled,
      lastHeartbeat: session.machine.lastHeartbeat,
      firmwareVersion: session.machine.firmwareVersion,
    },
    session: detail,
  });
  publishLegacySessionProgress({
    session: detail,
    machineStatus: (detail.machine?.status ?? params.machineStatus ?? session.machine.status) as
      | 'idle'
      | 'reserved'
      | 'washing'
      | 'maintenance'
      | 'offline',
  });

  if ((params.progress ?? session.progress) >= 100 || params.machineStatus === 'idle') {
    return completeWashSession(session.id);
  }

  return detail;
}

export async function completeWashSession(sessionId: string) {
  stopSimulatedWash(sessionId);

  const session = await prisma.washSession.findUnique({
    where: { id: sessionId },
    include: {
      branch: { include: { settings: true } },
      payment: true,
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status === 'completed') {
    return getSessionDetail(session.id);
  }

  if (!session.payment || session.payment.status !== 'confirmed') {
    throw new Error('Cannot complete session without confirmed payment');
  }

  if (!['in_progress', 'ready_to_wash'].includes(session.status)) {
    throw new Error('Session is not active');
  }

  const pointsRate = session.branch.settings?.pointsEarnRate ?? DEFAULT_POINTS_RATE;
  const pointsEarned = session.totalPrice * pointsRate;
  const now = new Date();

  const updatedSession = await prisma.$transaction(async (tx) => {
    const wallet = await tx.pointWallet.upsert({
      where: { userId: session.userId },
      update: {},
      create: { userId: session.userId },
    });

    const nextBalance = wallet.balance + pointsEarned;

    await tx.washSession.update({
      where: { id: session.id },
      data: {
        status: 'completed',
        progress: 100,
        currentStep: session.totalSteps > 0 ? session.totalSteps - 1 : 0,
        pointsEarned,
        completedAt: now,
      },
    });

    await tx.pointsTransaction.create({
      data: {
        walletId: wallet.id,
        userId: session.userId,
        branchId: session.branchId,
        sessionId: session.id,
        type: 'earn',
        amount: pointsEarned,
        balanceAfter: nextBalance,
        description: `Wash completed - ${pointsEarned} points`,
      },
    });

    await tx.pointWallet.update({
      where: { id: wallet.id },
      data: {
        balance: nextBalance,
        lifetimeEarned: { increment: pointsEarned },
      },
    });

    const user = await tx.user.update({
      where: { id: session.userId },
      data: {
        totalPoints: nextBalance,
        totalWashes: { increment: 1 },
      },
    });

    let nextTier = user.tier;
    const nextTotalWashes = user.totalWashes;
    if (nextTotalWashes >= 100) nextTier = 'platinum';
    else if (nextTotalWashes >= 50) nextTier = 'gold';
    else if (nextTotalWashes >= 20) nextTier = 'silver';

    if (nextTier !== user.tier) {
      await tx.user.update({
        where: { id: user.id },
        data: { tier: nextTier },
      });
    }

    await tx.machine.update({
      where: { id: session.machineId },
      data: { status: 'idle' },
    });

    await tx.stamp.updateMany({
      where: { userId: session.userId, rewardClaimed: false },
      data: {
        currentCount: { increment: 1 },
        lastStampAt: now,
      },
    });

    return tx.washSession.findUnique({
      where: { id: session.id },
      include: {
        branch: true,
        machine: true,
        package: true,
        payment: true,
      },
    });
  });

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'completed',
    source: 'api',
    session: detail,
  });
  publishMachineRealtimeEvent({
    eventType: 'completed',
    source: 'api',
    machine: detail.machine ?? {
      id: session.machineId,
      branchId: session.branchId,
      code: null,
      name: 'Unknown machine',
      status: 'idle',
      espDeviceId: '',
      isEnabled: true,
      lastHeartbeat: null,
      firmwareVersion: null,
    },
    session: detail,
  });
  publishLegacySessionProgress({
    session: detail,
    machineStatus: 'idle',
  });

  return detail;
}

export async function cancelWashSession(params: { sessionId: string; userId: string }) {
  const session = await prisma.washSession.findFirst({
    where: { id: params.sessionId, userId: params.userId },
    include: { payment: true, couponRedemption: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  if (!['pending_payment', 'ready_to_wash'].includes(session.status)) {
    throw new Error('Session cannot be cancelled');
  }

  await prisma.$transaction(async (tx) => {
    await tx.washSession.update({
      where: { id: session.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    await tx.machine.update({
      where: { id: session.machineId },
      data: { status: 'idle' },
    });

    if (session.payment) {
      await tx.payment.update({
        where: { id: session.payment.id },
        data: {
          status: session.payment.status === 'confirmed' ? 'refunded' : 'cancelled',
          cancelledAt: new Date(),
        },
      });
    }

    if (session.couponRedemption) {
      await tx.userCoupon.update({
        where: { id: session.couponRedemption.userCouponId },
        data: {
          status: 'claimed',
          redeemedAt: null,
        },
      });

      await tx.couponRedemption.delete({
        where: { id: session.couponRedemption.id },
      });

      await tx.coupon.update({
        where: { id: session.couponRedemption.couponId },
        data: {
          usedCount: { decrement: 1 },
        },
      });
    }
  });

  const detail = await requireSessionDetail(session.id);
  publishSessionRealtimeEvent({
    eventType: 'cancelled',
    source: 'api',
    session: detail,
  });
  publishMachineRealtimeEvent({
    eventType: 'machine_status_changed',
    source: 'api',
    machine: detail.machine ?? {
      id: session.machineId,
      branchId: session.branchId,
      code: null,
      name: 'Unknown machine',
      status: 'idle',
      espDeviceId: '',
      isEnabled: true,
      lastHeartbeat: null,
      firmwareVersion: null,
    },
    session: detail,
  });

  return detail;
}

function stopSimulatedWash(sessionId: string) {
  const timer = simulatedWashTimers.get(sessionId);
  if (timer) {
    clearInterval(timer);
    simulatedWashTimers.delete(sessionId);
  }
}

async function startSimulatedWash(sessionId: string) {
  if (!getRuntimeConfig().allowSimulatedWash) {
    return;
  }

  stopSimulatedWash(sessionId);

  const session = await prisma.washSession.findUnique({
    where: { id: sessionId },
    include: { package: true },
  });

  if (!session || session.status !== 'in_progress') {
    return;
  }

  const steps = Array.isArray(session.package.steps) ? session.package.steps.length : 0;
  const totalSteps = Math.max(steps, 1);
  let tick = 0;
  const totalTicks = totalSteps * 12;

  const timer = setInterval(async () => {
    tick += 1;
    const progress = Math.min(100, Math.round((tick / totalTicks) * 100));
    const currentStep = Math.min(totalSteps - 1, Math.floor((tick / totalTicks) * totalSteps));

    await updateWashProgress({
      sessionId,
      currentStep,
      progress,
      machineStatus: progress >= 100 ? 'idle' : 'washing',
    });

    if (progress >= 100) {
      stopSimulatedWash(sessionId);
    }
  }, 1000);

  simulatedWashTimers.set(sessionId, timer);
}
