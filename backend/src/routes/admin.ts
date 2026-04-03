import {
  AdminBranchScope,
  CouponScope,
  CouponStatus,
  DiscountType,
  MachineStatus,
  PaymentStatus,
  Prisma,
  WashSessionStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  getAdminWithScopes,
  getBranchWhereClause,
  getMachineBranchFilter,
  getPaymentBranchFilter,
  getScopedBranchIds,
  getSessionBranchFilter,
} from '../lib/admin-scope.js';
import { getRuntimeConfig } from '../lib/config.js';
import { signAdminAccessToken, signAdminRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import type { AppEnv } from '../lib/types.js';
import { requireAdmin } from '../middleware/auth.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { handleMachineEvent } from '../services/machine-events.js';
import { publishMachineCommand } from '../services/mqtt.js';
import { reconcilePayment } from '../services/payment-flow.js';

export const adminRoutes = new Hono<AppEnv>();
const runtimeConfig = getRuntimeConfig();
const adminAuthRateLimit = createRateLimitMiddleware({
  bucket: 'admin-auth',
  windowMs: runtimeConfig.authRateLimitWindowMs,
  max: Math.max(5, Math.floor(runtimeConfig.authRateLimitMax / 2)),
});

const machineStatuses: MachineStatus[] = ['idle', 'reserved', 'washing', 'maintenance', 'offline'];
const sessionStatuses: WashSessionStatus[] = [
  'pending_payment',
  'payment_failed',
  'ready_to_wash',
  'in_progress',
  'completed',
  'cancelled',
  'refunded',
];
const paymentStatuses: PaymentStatus[] = ['pending', 'confirmed', 'failed', 'cancelled', 'refunded', 'expired'];

type AdminWithScopes = NonNullable<Awaited<ReturnType<typeof getAdminWithScopes>>>;

const branchSettingsSchema = z
  .object({
    timezone: z.string().min(1).optional(),
    currency: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    pointsEarnRate: z.number().int().min(0).optional(),
    pointsMinSpend: z.number().int().min(0).optional(),
    allowsPointRedemption: z.boolean().optional(),
    receiptFooter: z.string().nullable().optional(),
    supportPhone: z.string().nullable().optional(),
    maxConcurrentSessions: z.number().int().min(1).optional(),
    washStartGraceMinutes: z.number().int().min(0).optional(),
  })
  .strict();

const branchScopeInputSchema = z.object({
  branchId: z.string().min(1),
  canViewRevenue: z.boolean().default(true),
  canManageMachines: z.boolean().default(true),
  canManageCoupons: z.boolean().default(true),
});

const createBranchSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  shortName: z.string().min(1).nullable().optional(),
  address: z.string().min(1),
  area: z.string().min(1),
  type: z.string().min(1).default('car'),
  ownershipType: z.enum(['company_owned', 'franchise']).default('franchise'),
  franchiseCode: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  promptPayId: z.string().min(1),
  promptPayName: z.string().min(1),
  ownerName: z.string().nullable().optional(),
  mapsUrl: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  settings: branchSettingsSchema.optional(),
});

const updateBranchSchema = createBranchSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one branch field is required'
);

const createAdminUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['hq_admin', 'branch_admin']),
  branchIds: z.array(z.string()).optional(),
  branchScopes: z.array(branchScopeInputSchema).optional(),
});

const updateAdminUserSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    name: z.string().min(1).optional(),
    role: z.enum(['hq_admin', 'branch_admin']).optional(),
    isActive: z.boolean().optional(),
    branchScopes: z.array(branchScopeInputSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one user field is required');

const packageBaseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  vehicleType: z.string().min(1).default('car'),
  priceS: z.number().int().min(0),
  priceM: z.number().int().min(0),
  priceL: z.number().int().min(0),
  steps: z.array(z.string().min(1)).min(1),
  stepDuration: z.number().int().min(1).default(300),
  features: z.unknown().nullable().optional(),
  image: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const createPackageSchema = packageBaseSchema;
const updatePackageSchema = packageBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one package field is required');

const packageActivationSchema = z.object({
  isActive: z.boolean(),
});

const branchPackageConfigSchema = z
  .object({
    isActive: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    displayName: z.string().nullable().optional(),
    descriptionOverride: z.string().nullable().optional(),
    priceOverrideS: z.number().int().min(0).nullable().optional(),
    priceOverrideM: z.number().int().min(0).nullable().optional(),
    priceOverrideL: z.number().int().min(0).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one branch package field is required');

const couponBaseObjectSchema = z.object({
  code: z.string().min(2),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  scope: z.enum(['all_branches', 'selected_branches', 'branch_only']),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().int().min(1),
  minSpend: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(0).default(0),
  maxUsesPerUser: z.number().int().min(0).default(1),
  packageIds: z.array(z.string().min(1)).default([]),
  branchIds: z.array(z.string().min(1)).default([]),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
});

function validateCouponDates(
  value: { validFrom?: Date; validUntil?: Date; discountType?: DiscountType; discountValue?: number },
  ctx: z.RefinementCtx
) {
  if (value.validFrom && value.validUntil && value.validUntil <= value.validFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'validUntil must be later than validFrom',
      path: ['validUntil'],
    });
  }

  if (value.discountType === 'percent' && typeof value.discountValue === 'number' && value.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Percent discount cannot exceed 100',
      path: ['discountValue'],
    });
  }
}

const createCouponSchema = couponBaseObjectSchema.superRefine((value, ctx) => {
  validateCouponDates(value, ctx);
});

const updateCouponSchema = couponBaseObjectSchema
  .partial()
  .superRefine((value, ctx) => {
    validateCouponDates(value, ctx);
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one coupon field is required');

const couponActivationSchema = z.object({
  isActive: z.boolean(),
});

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfLookbackDays(days: number) {
  const value = startOfDay();
  value.setDate(value.getDate() - (days - 1));
  return value;
}

function rangeStartFrom(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() - days);
  return value;
}

function mapScopePermissions(
  scope: AdminBranchScope & { branch?: { id: string; name: string; code: string } | null }
) {
  return {
    branchId: scope.branchId,
    canViewRevenue: scope.canViewRevenue,
    canManageMachines: scope.canManageMachines,
    canManageCoupons: scope.canManageCoupons,
    branch: scope.branch
      ? {
          id: scope.branch.id,
          name: scope.branch.name,
          code: scope.branch.code,
        }
      : null,
  };
}

function mapAdminIdentity(admin: AdminWithScopes) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    branchIds: getScopedBranchIds(admin.role, admin.branchScopes),
    scopes: admin.branchScopes.map((scope) => mapScopePermissions(scope)),
  };
}

function mapBranchSettings(
  settings:
    | {
        timezone: string;
        currency: string;
        locale: string;
        pointsEarnRate: number;
        pointsMinSpend: number;
        allowsPointRedemption: boolean;
        receiptFooter: string | null;
        supportPhone: string | null;
        maxConcurrentSessions: number;
        washStartGraceMinutes: number;
      }
    | null
    | undefined
) {
  if (!settings) {
    return null;
  }

  return {
    timezone: settings.timezone,
    currency: settings.currency,
    locale: settings.locale,
    pointsEarnRate: settings.pointsEarnRate,
    pointsMinSpend: settings.pointsMinSpend,
    allowsPointRedemption: settings.allowsPointRedemption,
    receiptFooter: settings.receiptFooter,
    supportPhone: settings.supportPhone,
    maxConcurrentSessions: settings.maxConcurrentSessions,
    washStartGraceMinutes: settings.washStartGraceMinutes,
  };
}

type AdminPackageRecord = Prisma.WashPackageGetPayload<{
  include: {
    branchConfigs: {
      include: {
        branch: {
          select: {
            id: true;
            code: true;
            name: true;
            shortName: true;
            isActive: true;
          };
        };
      };
    };
  };
}>;

function mapBranchPackageConfig(config: AdminPackageRecord['branchConfigs'][number], pkg: AdminPackageRecord) {
  return {
    id: config.id,
    branchId: config.branchId,
    isActive: config.isActive,
    isVisible: config.isVisible,
    displayName: config.displayName,
    descriptionOverride: config.descriptionOverride,
    priceOverrides: {
      S: config.priceOverrideS,
      M: config.priceOverrideM,
      L: config.priceOverrideL,
    },
    effectivePrices: {
      S: config.priceOverrideS ?? pkg.priceS,
      M: config.priceOverrideM ?? pkg.priceM,
      L: config.priceOverrideL ?? pkg.priceL,
    },
    branch: config.branch,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function mapAdminPackage(pkg: AdminPackageRecord) {
  const branchConfigs = pkg.branchConfigs.map((config) => mapBranchPackageConfig(config, pkg));

  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    description: pkg.description,
    vehicleType: pkg.vehicleType,
    prices: {
      S: pkg.priceS,
      M: pkg.priceM,
      L: pkg.priceL,
    },
    steps: Array.isArray(pkg.steps) ? pkg.steps : [],
    stepDuration: pkg.stepDuration,
    features: pkg.features,
    image: pkg.image,
    sortOrder: pkg.sortOrder,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    branchConfigs,
    branchConfigStats: {
      total: branchConfigs.length,
      active: branchConfigs.filter((config) => config.isActive).length,
      visible: branchConfigs.filter((config) => config.isVisible).length,
      overriddenPricing: branchConfigs.filter(
        (config) =>
          config.priceOverrides.S !== null || config.priceOverrides.M !== null || config.priceOverrides.L !== null
      ).length,
    },
  };
}

type AdminCouponRecord = Prisma.CouponGetPayload<{
  include: {
    branches: {
      include: {
        branch: {
          select: {
            id: true;
            code: true;
            name: true;
            shortName: true;
            isActive: true;
          };
        };
      };
    };
    _count: {
      select: {
        users: true;
        redemptions: true;
      };
    };
  };
}>;

function mapAdminCoupon(coupon: AdminCouponRecord, redemptionSummary: Record<string, { branchId: string; usedCount: number }[]>) {
  const assignedBranches = coupon.branches.map((item) => ({
    id: item.branch.id,
    code: item.branch.code,
    name: item.branch.name,
    shortName: item.branch.shortName,
    isActive: item.branch.isActive,
  }));

  const remainingUses = coupon.maxUses > 0 ? Math.max(coupon.maxUses - coupon.usedCount, 0) : null;

  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    scope: coupon.scope,
    status: coupon.status,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minSpend: coupon.minSpend,
    maxUses: coupon.maxUses,
    maxUsesPerUser: coupon.maxUsesPerUser,
    usedCount: coupon.usedCount,
    packageIds: coupon.packageIds,
    branchIds: assignedBranches.map((branch) => branch.id),
    validFrom: coupon.validFrom,
    validUntil: coupon.validUntil,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
    branches: assignedBranches,
    usage: {
      claimedCount: coupon._count.users,
      redemptionCount: coupon._count.redemptions,
      usedCount: coupon.usedCount,
      remainingUses,
      branchUsage: redemptionSummary[coupon.id] ?? [],
    },
  };
}

function toNullableJsonInput(
  value: unknown | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

async function logAdminAction(params: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorType: 'admin',
      adminUserId: params.adminUserId,
      branchId: params.branchId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata,
    },
  });
}

async function logSystemAction(params: {
  action: string;
  entityType: string;
  entityId?: string | null;
  branchId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorType: 'system',
      branchId: params.branchId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata,
    },
  });
}

function normalizeBranchScopes(input: {
  role: 'hq_admin' | 'branch_admin';
  branchIds?: string[];
  branchScopes?: Array<z.infer<typeof branchScopeInputSchema>>;
}) {
  if (input.role === 'hq_admin') {
    return [];
  }

  if (input.branchScopes?.length) {
    return input.branchScopes;
  }

  return (input.branchIds ?? []).map((branchId) => ({
    branchId,
    canViewRevenue: true,
    canManageMachines: true,
    canManageCoupons: true,
  }));
}

function ensureBranchAccess(admin: AdminWithScopes, branchId?: string | null) {
  if (!branchId) {
    return null;
  }

  if (admin.role === 'hq_admin') {
    return branchId;
  }

  if (!admin.branchScopes.some((scope) => scope.branchId === branchId)) {
    throw new Error('Branch access denied');
  }

  return branchId;
}

function ensureHqRole(admin: AdminWithScopes) {
  if (admin.role !== 'hq_admin') {
    throw new Error('Only HQ can manage global packages');
  }
}

function ensureCouponManagementAccess(admin: AdminWithScopes, branchId?: string | null) {
  if (admin.role === 'hq_admin') {
    return branchId ?? null;
  }

  if (!branchId) {
    return null;
  }

  const scope = admin.branchScopes.find((item) => item.branchId === branchId);
  if (!scope || !scope.canManageCoupons) {
    throw new Error('Coupon management access denied');
  }

  return branchId;
}

function getCouponManageableBranchIds(admin: AdminWithScopes) {
  if (admin.role === 'hq_admin') {
    return null;
  }

  return admin.branchScopes.filter((scope) => scope.canManageCoupons).map((scope) => scope.branchId);
}

function canManageCouponRecord(
  admin: AdminWithScopes,
  coupon: { scope: CouponScope; branches: Array<{ branchId: string }> }
) {
  if (admin.role === 'hq_admin') {
    return true;
  }

  const allowedBranchIds = getCouponManageableBranchIds(admin) ?? [];
  if (coupon.scope === 'all_branches') {
    return false;
  }

  if (coupon.scope === 'branch_only' && coupon.branches.length !== 1) {
    return false;
  }

  if (coupon.branches.length === 0) {
    return false;
  }

  return coupon.branches.every((branch) => allowedBranchIds.includes(branch.branchId));
}

async function validateCouponReferences(params: {
  packageIds?: string[];
  branchIds?: string[];
}) {
  if (params.packageIds?.length) {
    const packages = await prisma.washPackage.findMany({
      where: { id: { in: params.packageIds } },
      select: { id: true },
    });

    if (packages.length !== new Set(params.packageIds).size) {
      throw new Error('One or more packages were not found');
    }
  }

  if (params.branchIds?.length) {
    const branches = await prisma.branch.findMany({
      where: { id: { in: params.branchIds } },
      select: { id: true },
    });

    if (branches.length !== new Set(params.branchIds).size) {
      throw new Error('One or more branches were not found');
    }
  }
}

function resolveCouponBranchAssignments(
  admin: AdminWithScopes,
  scope: CouponScope,
  branchIds: string[] | undefined
) {
  const normalizedBranchIds = Array.from(new Set((branchIds ?? []).filter(Boolean)));
  const allowedBranchIds = getCouponManageableBranchIds(admin);

  if (scope === 'all_branches') {
    if (admin.role !== 'hq_admin') {
      throw new Error('Only HQ can create all-branch coupons');
    }
    return [];
  }

  if (allowedBranchIds && normalizedBranchIds.some((branchId) => !allowedBranchIds.includes(branchId))) {
    throw new Error('Coupon branch assignment is outside admin scope');
  }

  if (scope === 'branch_only') {
    if (normalizedBranchIds.length !== 1) {
      throw new Error('Branch-only coupons must be assigned to exactly one branch');
    }
    return normalizedBranchIds;
  }

  if (scope === 'selected_branches') {
    if (normalizedBranchIds.length === 0) {
      throw new Error('Selected-branch coupons require at least one branch');
    }
    return normalizedBranchIds;
  }

  return normalizedBranchIds;
}

function buildBranchFilter(
  admin: AdminWithScopes,
  branchId?: string | null
): {
  branchWhere: Prisma.BranchWhereInput;
  machineWhere: Prisma.MachineWhereInput;
  paymentWhere: Prisma.PaymentWhereInput;
  sessionWhere: Prisma.WashSessionWhereInput;
} {
  const scopedBranchId = ensureBranchAccess(admin, branchId);
  const branchWhere = getBranchWhereClause(admin.role, admin.branchScopes);
  const machineWhere = getMachineBranchFilter(admin.role, admin.branchScopes);
  const paymentWhere = getPaymentBranchFilter(admin.role, admin.branchScopes);
  const sessionWhere = getSessionBranchFilter(admin.role, admin.branchScopes);

  if (!scopedBranchId) {
    return { branchWhere, machineWhere, paymentWhere, sessionWhere };
  }

  return {
    branchWhere: { ...branchWhere, id: scopedBranchId },
    machineWhere: { ...machineWhere, branchId: scopedBranchId },
    paymentWhere: { ...paymentWhere, branchId: scopedBranchId },
    sessionWhere: { ...sessionWhere, branchId: scopedBranchId },
  };
}

async function resolveAdmin(c: any) {
  const admin = await getAdminWithScopes(c.get('adminId'));
  if (!admin) {
    return c.json({ message: 'Admin not found' }, 404);
  }
  return admin;
}

type AdminPaymentSummaryRecord = Prisma.PaymentGetPayload<{
  include: {
    branch: {
      select: {
        id: true;
        code: true;
        name: true;
        shortName: true;
      };
    };
    session: {
      select: {
        id: true;
        status: true;
        currentStep: true;
        totalSteps: true;
        progress: true;
        totalPrice: true;
        createdAt: true;
        machine: {
          select: {
            id: true;
            code: true;
            name: true;
            status: true;
          };
        };
        package: {
          select: {
            id: true;
            code: true;
            name: true;
          };
        };
        user: {
          select: {
            id: true;
            displayName: true;
            phone: true;
            lineUserId: true;
          };
        };
      };
    };
  };
}>;

type AdminPaymentRecord = Prisma.PaymentGetPayload<{
  include: {
    branch: {
      select: {
        id: true;
        code: true;
        name: true;
        shortName: true;
      };
    };
    session: {
      select: {
        id: true;
        status: true;
        currentStep: true;
        totalSteps: true;
        progress: true;
        totalPrice: true;
        createdAt: true;
        machine: {
          select: {
            id: true;
            code: true;
            name: true;
            status: true;
          };
        };
        package: {
          select: {
            id: true;
            code: true;
            name: true;
          };
        };
        user: {
          select: {
            id: true;
            displayName: true;
            phone: true;
            lineUserId: true;
          };
        };
      };
    };
    attempts: true;
  };
}>;

function mapPaymentAttempt(attempt: AdminPaymentRecord['attempts'][number]) {
  return {
    id: attempt.id,
    status: attempt.status,
    source: attempt.source,
    action: attempt.action,
    providerRef: attempt.providerRef,
    providerStatus: attempt.providerStatus,
    eventId: attempt.eventId,
    note: attempt.note,
    requestBody: attempt.requestBody,
    responseBody: attempt.responseBody,
    attemptedAt: attempt.attemptedAt,
  };
}

function getPaymentMetadata(payment: Pick<AdminPaymentSummaryRecord, 'metadata'>) {
  const metadata =
    payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata)
      ? (payment.metadata as Record<string, unknown>)
      : {};

  return metadata;
}

function mapPaymentBaseRecord(payment: AdminPaymentSummaryRecord | AdminPaymentRecord) {
  const metadata = getPaymentMetadata(payment);

  return {
    id: payment.id,
    sessionId: payment.sessionId,
    branchId: payment.branchId,
    userId: payment.userId,
    method: payment.method,
    provider: payment.provider,
    providerRef: payment.providerRef,
    providerStatus: payment.providerStatus,
    providerConfirmedAt: payment.providerConfirmedAt,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference,
    qrPayload: payment.qrPayload,
    expiresAt: payment.expiresAt,
    confirmedAt: payment.confirmedAt,
    failedAt: payment.failedAt,
    cancelledAt: payment.cancelledAt,
    refundedAt: payment.refundedAt,
    lastWebhookAt: payment.lastWebhookAt,
    lastWebhookEventId: payment.lastWebhookEventId,
    lastWebhookStatus: payment.lastWebhookStatus,
    lastReconciledAt: payment.lastReconciledAt,
    reconciliationAttempts: payment.reconciliationAttempts,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    needsManualReview: metadata.needsManualReview === true,
    manualReviewReason: typeof metadata.manualReviewReason === 'string' ? metadata.manualReviewReason : null,
    metadata,
    branch: payment.branch,
    session: {
      id: payment.session.id,
      status: payment.session.status,
      currentStep: payment.session.currentStep,
      totalSteps: payment.session.totalSteps,
      progress: payment.session.progress,
      totalPrice: payment.session.totalPrice,
      createdAt: payment.session.createdAt,
      machine: payment.session.machine,
      package: payment.session.package,
      user: payment.session.user,
    },
    diagnostics: {
      webhook: {
        lastWebhookAt: payment.lastWebhookAt,
        lastWebhookEventId: payment.lastWebhookEventId,
        lastWebhookStatus: payment.lastWebhookStatus,
      },
      reconcile: {
        lastReconciledAt: payment.lastReconciledAt,
        reconciliationAttempts: payment.reconciliationAttempts,
      },
      provider: {
        provider: payment.provider,
        providerRef: payment.providerRef,
        providerStatus: payment.providerStatus,
        providerConfirmedAt: payment.providerConfirmedAt,
      },
      review: {
        needsManualReview: metadata.needsManualReview === true,
        manualReviewReason: typeof metadata.manualReviewReason === 'string' ? metadata.manualReviewReason : null,
        lastTransitionSource:
          typeof metadata.lastTransitionSource === 'string' ? metadata.lastTransitionSource : null,
        lastTransitionAt: typeof metadata.lastTransitionAt === 'string' ? metadata.lastTransitionAt : null,
        lastTransitionNote:
          typeof metadata.lastTransitionNote === 'string' ? metadata.lastTransitionNote : null,
      },
    },
  };
}

function mapPaymentSummaryRecord(payment: AdminPaymentSummaryRecord) {
  return {
    ...mapPaymentBaseRecord(payment),
    attempts: [],
  };
}

function mapPaymentRecord(payment: AdminPaymentRecord) {
  return {
    ...mapPaymentBaseRecord(payment),
    attempts: payment.attempts.map((attempt) => mapPaymentAttempt(attempt)),
  };
}

adminRoutes.use('/login', adminAuthRateLimit);
adminRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = z
    .object({ email: z.string().email(), password: z.string().min(6) })
    .parse(body);

  const admin = await prisma.adminUser.findUnique({
    where: { email },
    include: {
      branchScopes: {
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!admin || !admin.isActive) {
    await logSystemAction({
      action: 'admin.login.failed',
      entityType: 'admin_user',
      metadata: { email, reason: 'unknown_or_inactive' },
    });
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    await logSystemAction({
      action: 'admin.login.failed',
      entityType: 'admin_user',
      entityId: admin.id,
      metadata: { email, reason: 'invalid_password' },
    });
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const branchIds = getScopedBranchIds(admin.role, admin.branchScopes);

  await logAdminAction({
    adminUserId: admin.id,
    action: 'admin.login.success',
    entityType: 'admin_user',
    entityId: admin.id,
    metadata: {
      role: admin.role,
      branchIds,
    },
  });

  return c.json({
    data: {
      admin: mapAdminIdentity(admin),
      token: signAdminAccessToken(admin.id, admin.role, branchIds),
      tokens: {
        accessToken: signAdminAccessToken(admin.id, admin.role, branchIds),
        refreshToken: signAdminRefreshToken(admin.id, admin.role, branchIds),
      },
    },
  });
});

adminRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(body);

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.subjectType !== 'admin' || payload.type !== 'refresh') {
      return c.json({ message: 'Invalid refresh token' }, 401);
    }

    const admin = await getAdminWithScopes(payload.subjectId);
    if (!admin || !admin.isActive) {
      return c.json({ message: 'Admin not found' }, 404);
    }

    const branchIds = getScopedBranchIds(admin.role, admin.branchScopes);

    return c.json({
      data: {
        accessToken: signAdminAccessToken(admin.id, admin.role, branchIds),
        admin: mapAdminIdentity(admin),
      },
    });
  } catch {
    return c.json({ message: 'Invalid refresh token' }, 401);
  }
});

adminRoutes.get('/me', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  return c.json({
    data: {
      admin: mapAdminIdentity(admin),
    },
  });
});

adminRoutes.get('/dashboard', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = c.req.query('branchId');
    const { branchWhere, machineWhere, paymentWhere, sessionWhere } = buildBranchFilter(admin, branchId);
    const today = startOfDay();
    const trendSince = startOfLookbackDays(7);
    const customerTrendSince = startOfLookbackDays(14);
    const previousCustomerWindowStart = rangeStartFrom(customerTrendSince, 14);

    const [
      branches,
      machines,
      todaysSessions,
      trendPayments,
      recentSessions,
      totalCustomers,
      totalSessions,
      totalRevenueAggregate,
      recentCustomerUsers,
    ] =
      await Promise.all([
        prisma.branch.findMany({
          where: branchWhere,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        }),
        prisma.machine.findMany({
          where: machineWhere,
          select: {
            id: true,
            branchId: true,
            status: true,
            lastHeartbeat: true,
          },
        }),
        prisma.washSession.findMany({
          where: {
            ...sessionWhere,
            createdAt: { gte: today },
          },
          select: {
            id: true,
            branchId: true,
            status: true,
            rating: true,
          },
        }),
        prisma.payment.findMany({
          where: {
            ...paymentWhere,
            status: 'confirmed',
            createdAt: { gte: trendSince },
          },
          select: {
            branchId: true,
            amount: true,
            createdAt: true,
          },
        }),
        prisma.washSession.findMany({
          where: sessionWhere,
          include: {
            branch: { select: { id: true, name: true, shortName: true } },
            machine: { select: { id: true, name: true, status: true } },
            package: { select: { id: true, name: true } },
            user: { select: { id: true, displayName: true } },
            payment: { select: { id: true, status: true, amount: true, reference: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        prisma.user.count({
          where: {
            sessions: {
              some: sessionWhere,
            },
          },
        }),
        prisma.washSession.count({
          where: sessionWhere,
        }),
        prisma.payment.aggregate({
          where: {
            ...paymentWhere,
            status: 'confirmed',
          },
          _sum: {
            amount: true,
          },
        }),
        prisma.user.findMany({
          where: {
            createdAt: { gte: previousCustomerWindowStart },
            sessions: {
              some: sessionWhere,
            },
          },
          select: {
            id: true,
            createdAt: true,
          },
        }),
      ]);

    const todayRevenue = trendPayments
      .filter((payment) => payment.createdAt >= today)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const machineSummary = machineStatuses.reduce(
      (summary, status) => {
        summary[status] = machines.filter((machine) => machine.status === status).length;
        return summary;
      },
      {} as Record<MachineStatus, number>
    );

    const sessionStatusSummary = sessionStatuses.reduce(
      (summary, status) => {
        summary[status] = todaysSessions.filter((session) => session.status === status).length;
        return summary;
      },
      {} as Record<WashSessionStatus, number>
    );

    const revenueTrendMap = new Map<string, { total: number; sessions: number }>();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(trendSince);
      date.setDate(trendSince.getDate() + offset);
      revenueTrendMap.set(date.toISOString().slice(0, 10), { total: 0, sessions: 0 });
    }

    trendPayments.forEach((payment) => {
      const key = payment.createdAt.toISOString().slice(0, 10);
      const entry = revenueTrendMap.get(key);
      if (entry) {
        entry.total += payment.amount;
        entry.sessions += 1;
      }
    });

    const customerGrowthTrendMap = new Map<string, number>();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(customerTrendSince);
      date.setDate(customerTrendSince.getDate() + offset);
      customerGrowthTrendMap.set(date.toISOString().slice(0, 10), 0);
    }

    let currentCustomerWindowCount = 0;
    let previousCustomerWindowCount = 0;

    recentCustomerUsers.forEach((user) => {
      if (user.createdAt >= customerTrendSince) {
        currentCustomerWindowCount += 1;
        const key = user.createdAt.toISOString().slice(0, 10);
        customerGrowthTrendMap.set(key, (customerGrowthTrendMap.get(key) ?? 0) + 1);
        return;
      }

      if (user.createdAt >= previousCustomerWindowStart) {
        previousCustomerWindowCount += 1;
      }
    });

    const machineHealth = {
      online: machines.filter((machine) => machine.status !== 'offline').length,
      offline: machines.filter((machine) => machine.status === 'offline').length,
      maintenance: machines.filter((machine) => machine.status === 'maintenance').length,
      washing: machines.filter((machine) => machine.status === 'washing').length,
      idle: machines.filter((machine) => machine.status === 'idle').length,
      reserved: machines.filter((machine) => machine.status === 'reserved').length,
      onlineRate:
        machines.length > 0
          ? Number(
              ((machines.filter((machine) => machine.status !== 'offline').length / machines.length) * 100).toFixed(1)
            )
          : 0,
    };

    return c.json({
      data: {
        admin: mapAdminIdentity(admin),
        selectedBranchId: branchId ?? null,
        summary: {
          totalBranches: branches.length,
          totalMachines: machines.length,
          activeMachines: machines.filter((machine) => machine.status !== 'offline').length,
          totalSessions,
          todaySessions: todaysSessions.length,
          activeSessions: todaysSessions.filter((session) =>
            ['ready_to_wash', 'in_progress'].includes(session.status)
          ).length,
          totalRevenue: totalRevenueAggregate._sum.amount ?? 0,
          todayRevenue,
          totalCustomers,
          customerGrowthCurrent: currentCustomerWindowCount,
          customerGrowthPrevious: previousCustomerWindowCount,
        },
        machineSummary,
        machineHealth,
        sessionStatusSummary,
        revenueTrend: Array.from(revenueTrendMap.entries()).map(([date, value]) => ({
          date,
          total: value.total,
          sessions: value.sessions,
          avgTicket: value.sessions > 0 ? Math.round(value.total / value.sessions) : 0,
        })),
        customerGrowthTrend: Array.from(customerGrowthTrendMap.entries()).map(([date, customers]) => ({
          date,
          customers,
        })),
        branchPerformance: branches.map((branch) => {
          const branchTodaySessions = todaysSessions.filter((session) => session.branchId === branch.id);
          const branchTodayRevenue = trendPayments
            .filter((payment) => payment.branchId === branch.id && payment.createdAt >= today)
            .reduce((sum, payment) => sum + payment.amount, 0);
          const branchMachines = machines.filter((machine) => machine.branchId === branch.id);
          const ratings = branchTodaySessions
            .map((session) => session.rating)
            .filter((value): value is number => typeof value === 'number');

          return {
            id: branch.id,
            code: branch.code,
            name: branch.name,
            shortName: branch.shortName,
            isActive: branch.isActive,
            todayRevenue: branchTodayRevenue,
            todaySessions: branchTodaySessions.length,
            activeSessions: branchTodaySessions.filter((session) =>
              ['ready_to_wash', 'in_progress'].includes(session.status)
            ).length,
            machineCount: branchMachines.length,
            machineSummary: {
              idle: branchMachines.filter((machine) => machine.status === 'idle').length,
              reserved: branchMachines.filter((machine) => machine.status === 'reserved').length,
              washing: branchMachines.filter((machine) => machine.status === 'washing').length,
              maintenance: branchMachines.filter((machine) => machine.status === 'maintenance').length,
              offline: branchMachines.filter((machine) => machine.status === 'offline').length,
            },
            avgRating:
              ratings.length > 0
                ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
                : null,
          };
        }),
        recentSessions: recentSessions.map((session) => ({
          id: session.id,
          branchId: session.branchId,
          machineId: session.machineId,
          userId: session.userId,
          status: session.status,
          progress: session.progress,
          currentStep: session.currentStep,
          totalSteps: session.totalSteps,
          totalPrice: session.totalPrice,
          carSize: session.carSize,
          rating: session.rating,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          completedAt: session.completedAt,
          branch: session.branch,
          machine: session.machine,
          package: session.package,
          user: session.user,
          payment: session.payment,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/branches', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = c.req.query('branchId');
    const { branchWhere } = buildBranchFilter(admin, branchId);
    const today = startOfDay();

    const branches = await prisma.branch.findMany({
      where: branchWhere,
      include: {
        settings: true,
        _count: {
          select: {
            machines: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const branchIds = branches.map((branch) => branch.id);
    const [todayPayments, todaySessions, ratings] = await Promise.all([
      prisma.payment.findMany({
        where: {
          branchId: { in: branchIds },
          status: 'confirmed',
          createdAt: { gte: today },
        },
        select: { branchId: true, amount: true },
      }),
      prisma.washSession.findMany({
        where: {
          branchId: { in: branchIds },
          createdAt: { gte: today },
        },
        select: { branchId: true },
      }),
      prisma.washSession.findMany({
        where: {
          branchId: { in: branchIds },
          rating: { not: null },
        },
        select: { branchId: true, rating: true },
      }),
    ]);

    return c.json({
      data: branches.map((branch) => {
        const branchRatings = ratings
          .filter((session) => session.branchId === branch.id && typeof session.rating === 'number')
          .map((session) => session.rating as number);

        return {
          id: branch.id,
          code: branch.code,
          name: branch.name,
          shortName: branch.shortName,
          address: branch.address,
          area: branch.area,
          type: branch.type,
          ownershipType: branch.ownershipType,
          franchiseCode: branch.franchiseCode,
          lat: branch.lat,
          lng: branch.lng,
          mapsUrl: branch.mapsUrl,
          promptPayId: branch.promptPayId,
          promptPayName: branch.promptPayName,
          ownerName: branch.ownerName,
          isActive: branch.isActive,
          hours: branch.hours,
          settings: mapBranchSettings(branch.settings),
          machineCount: branch._count.machines,
          todayRevenue: todayPayments
            .filter((payment) => payment.branchId === branch.id)
            .reduce((sum, payment) => sum + payment.amount, 0),
          todaySessions: todaySessions.filter((session) => session.branchId === branch.id).length,
          avgRating:
            branchRatings.length > 0
              ? Number((branchRatings.reduce((sum, rating) => sum + rating, 0) / branchRatings.length).toFixed(1))
              : null,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load branches';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.post('/branches', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  const adminId = c.get('adminId');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can create branches' }, 403);
  }

  const body = await c.req.json();
  const data = createBranchSchema.parse(body);

  const branch = await prisma.branch.create({
    data: {
      code: data.code,
      name: data.name,
      shortName: data.shortName ?? null,
      address: data.address,
      area: data.area,
      type: data.type,
      ownershipType: data.ownershipType,
      franchiseCode: data.franchiseCode ?? null,
      lat: data.lat,
      lng: data.lng,
      promptPayId: data.promptPayId,
      promptPayName: data.promptPayName,
      ownerName: data.ownerName ?? null,
      mapsUrl: data.mapsUrl ?? null,
      hours: data.hours ?? null,
      isActive: data.isActive ?? true,
    },
  });
  await prisma.branchSettings.create({
    data: {
      branchId: branch.id,
      ...data.settings,
    },
  });

  await logAdminAction({
    adminUserId: adminId,
    action: 'admin.branch.create',
    entityType: 'branch',
    entityId: branch.id,
    branchId: branch.id,
    metadata: {
      code: branch.code,
      name: branch.name,
    },
  });

  return c.json({ data: branch }, 201);
});

adminRoutes.patch('/branches/:id', requireAdmin, async (c) => {
  const id = c.req.param('id');
  const adminId = c.get('adminId');
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  if (
    admin.role !== 'hq_admin' &&
    !admin.branchScopes.some((scope: AdminBranchScope) => scope.branchId === id)
  ) {
    return c.json({ message: 'Branch access denied' }, 403);
  }

  const body = await c.req.json();
  const data = updateBranchSchema.parse(body);

  const branch = await prisma.branch.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      shortName: data.shortName,
      address: data.address,
      area: data.area,
      type: data.type,
      ownershipType: data.ownershipType,
      franchiseCode: data.franchiseCode,
      lat: data.lat,
      lng: data.lng,
      promptPayId: data.promptPayId,
      promptPayName: data.promptPayName,
      ownerName: data.ownerName,
      mapsUrl: data.mapsUrl,
      hours: data.hours,
      isActive: data.isActive,
    },
  });

  if (data.settings) {
    await prisma.branchSettings.upsert({
      where: { branchId: id },
      update: data.settings,
      create: {
        branchId: id,
        ...data.settings,
      },
    });
  }

  await logAdminAction({
    adminUserId: adminId,
    action: 'admin.branch.update',
    entityType: 'branch',
    entityId: id,
    branchId: id,
    metadata: data as unknown as Prisma.InputJsonValue,
  });

  return c.json({ data: branch });
});

adminRoutes.get('/machines', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = c.req.query('branchId');
    const status = c.req.query('status');
    const { machineWhere } = buildBranchFilter(admin, branchId);

    const where: Prisma.MachineWhereInput = { ...machineWhere };
    if (status && machineStatuses.includes(status as MachineStatus)) {
      where.status = status as MachineStatus;
    }

    const machines = await prisma.machine.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, shortName: true } },
        sessions: {
          select: {
            id: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ branchId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return c.json({
      data: machines.map((machine) => {
        const activeSession = machine.sessions.find((session) =>
          ['pending_payment', 'ready_to_wash', 'in_progress'].includes(session.status)
        );

        return {
          id: machine.id,
          branchId: machine.branchId,
          code: machine.code,
          name: machine.name,
          type: machine.type,
          status: machine.status,
          espDeviceId: machine.espDeviceId,
          isEnabled: machine.isEnabled,
          maintenanceNote: machine.maintenanceNote,
          firmwareVersion: machine.firmwareVersion,
          lastHeartbeat: machine.lastHeartbeat,
          totalWashes: machine.sessions.filter((session) => session.status === 'completed').length,
          currentSessionId: activeSession?.id ?? null,
          branch: machine.branch,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load machines';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.post('/machines/:id/command', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  const machineId = c.req.param('id');
  const body = await c.req.json();
  const { command } = z
    .object({ command: z.enum(['restart', 'maintenance_on', 'maintenance_off']) })
    .parse(body);

  if (admin instanceof Response) {
    return admin;
  }

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { branch: true },
  });

  if (!machine) {
    return c.json({ message: 'Machine not found' }, 404);
  }

  if (
    admin.role !== 'hq_admin' &&
    !admin.branchScopes.some(
      (scope: AdminBranchScope) => scope.branchId === machine.branchId && scope.canManageMachines
    )
  ) {
    return c.json({ message: 'Machine access denied' }, 403);
  }

  const sent = publishMachineCommand(machine.branchId, machine.espDeviceId, command);

  if (command === 'maintenance_on') {
    await handleMachineEvent(
      {
        type: 'maintenance',
        machineId,
        branchId: machine.branchId,
        espDeviceId: machine.espDeviceId,
        reason: 'admin_command.maintenance_on',
      },
      'admin'
    );
  } else if (command === 'maintenance_off') {
    await handleMachineEvent(
      {
        type: 'heartbeat',
        machineId,
        branchId: machine.branchId,
        espDeviceId: machine.espDeviceId,
        machineStatus: 'idle',
        reason: 'admin_command.maintenance_off',
      },
      'admin'
    );
  }

  await logAdminAction({
    adminUserId: admin.id,
    action: 'admin.machine.command',
    entityType: 'machine',
    entityId: machine.id,
    branchId: machine.branchId,
    metadata: {
      command,
      sent,
      machineCode: machine.code,
      espDeviceId: machine.espDeviceId,
    },
  });

  return c.json({
    data: {
      machineId,
      command,
      message: `Command ${command} ${sent ? 'sent' : 'queued (MQTT offline)'}`,
    },
  });
});

adminRoutes.get('/sessions', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 50);
    const status = c.req.query('status');
    const branchId = c.req.query('branchId');
    const { sessionWhere } = buildBranchFilter(admin, branchId);

    const where: Prisma.WashSessionWhereInput = {
      ...sessionWhere,
    };

    if (status && sessionStatuses.includes(status as WashSessionStatus)) {
      where.status = status as WashSessionStatus;
    }

    const [sessions, total] = await Promise.all([
      prisma.washSession.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, shortName: true } },
          machine: { select: { id: true, name: true, status: true } },
          package: { select: { id: true, name: true } },
          user: { select: { id: true, displayName: true } },
          payment: { select: { id: true, status: true, amount: true, reference: true, confirmedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.washSession.count({ where }),
    ]);

    return c.json({
      data: sessions.map((session) => ({
        id: session.id,
        branchId: session.branchId,
        machineId: session.machineId,
        userId: session.userId,
        status: session.status,
        currentStep: session.currentStep,
        totalSteps: session.totalSteps,
        progress: session.progress,
        carSize: session.carSize,
        totalPrice: session.totalPrice,
        rating: session.rating,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        branch: session.branch,
        machine: session.machine,
        package: session.package,
        user: session.user,
        payment: session.payment,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load sessions';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/revenue', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const days = Math.max(Number(c.req.query('days') || 30), 1);
    const branchId = c.req.query('branchId');
    const since = startOfLookbackDays(days);
    const { paymentWhere } = buildBranchFilter(admin, branchId);

    const payments = await prisma.payment.findMany({
      where: {
        ...paymentWhere,
        status: 'confirmed',
        createdAt: { gte: since },
      },
      include: {
        branch: { select: { id: true, name: true, shortName: true } },
        session: {
          select: {
            package: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { total: number; sessions: number }>();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setDate(since.getDate() + offset);
      dailyMap.set(date.toISOString().slice(0, 10), { total: 0, sessions: 0 });
    }

    const branchMap = new Map<string, { branchId: string; name: string; total: number; sessions: number }>();
    const packageMap = new Map<string, { packageId: string; name: string; total: number; sessions: number }>();

    payments.forEach((payment) => {
      const day = payment.createdAt.toISOString().slice(0, 10);
      const daily = dailyMap.get(day);
      if (daily) {
        daily.total += payment.amount;
        daily.sessions += 1;
      }

      const branchName = payment.branch.shortName || payment.branch.name;
      const branchEntry = branchMap.get(payment.branchId) ?? {
        branchId: payment.branchId,
        name: branchName,
        total: 0,
        sessions: 0,
      };
      branchEntry.total += payment.amount;
      branchEntry.sessions += 1;
      branchMap.set(payment.branchId, branchEntry);

      const packageId = payment.session?.package?.id ?? 'unknown';
      const packageName = payment.session?.package?.name ?? 'Unknown package';
      const packageEntry = packageMap.get(packageId) ?? {
        packageId,
        name: packageName,
        total: 0,
        sessions: 0,
      };
      packageEntry.total += payment.amount;
      packageEntry.sessions += 1;
      packageMap.set(packageId, packageEntry);
    });

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalSessions = payments.length;

    return c.json({
      data: {
        period: days,
        totalRevenue,
        sessionCount: totalSessions,
        avgTicket: totalSessions > 0 ? Math.round(totalRevenue / totalSessions) : 0,
        dailyRevenue: Array.from(dailyMap.entries()).map(([date, value]) => ({
          date,
          total: value.total,
          sessions: value.sessions,
          avgTicket: value.sessions > 0 ? Math.round(value.total / value.sessions) : 0,
        })),
        branchTotals: Array.from(branchMap.values()).sort((left, right) => right.total - left.total),
        packageBreakdown: Array.from(packageMap.values()).sort((left, right) => right.total - left.total),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load revenue';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/payments', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 50);
    const branchId = c.req.query('branchId');
    const status = c.req.query('status');
    const provider = c.req.query('provider');
    const search = c.req.query('search')?.trim();
    const { paymentWhere } = buildBranchFilter(admin, branchId);

    const where: Prisma.PaymentWhereInput = { ...paymentWhere };
    if (status && paymentStatuses.includes(status as PaymentStatus)) {
      where.status = status as PaymentStatus;
    }
    if (provider) {
      where.provider = provider;
    }
    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { reference: { contains: search, mode: 'insensitive' } },
            { providerRef: { contains: search, mode: 'insensitive' } },
            { sessionId: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          branch: { select: { id: true, code: true, name: true, shortName: true } },
          session: {
            select: {
              id: true,
              status: true,
              currentStep: true,
              totalSteps: true,
              progress: true,
              totalPrice: true,
              createdAt: true,
              machine: { select: { id: true, code: true, name: true, status: true } },
              package: { select: { id: true, code: true, name: true } },
              user: { select: { id: true, displayName: true, phone: true, lineUserId: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return c.json({
      data: payments.map((payment) => mapPaymentSummaryRecord(payment)),
      total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load payments';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/payments/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  const paymentId = c.req.param('id');

  if (admin instanceof Response) {
    return admin;
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
            shortName: true,
          },
        },
        session: {
          select: {
            id: true,
            status: true,
            currentStep: true,
            totalSteps: true,
            progress: true,
            totalPrice: true,
            createdAt: true,
            machine: {
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
              },
            },
            package: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                displayName: true,
                phone: true,
                lineUserId: true,
              },
            },
          },
        },
        attempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!payment) {
      return c.json({ message: 'Payment not found' }, 404);
    }

    if (
      admin.role !== 'hq_admin' &&
      !admin.branchScopes.some((scope: AdminBranchScope) => scope.branchId === payment.branchId)
    ) {
      return c.json({ message: 'Payment access denied' }, 403);
    }

    return c.json({ data: mapPaymentRecord(payment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load payment';
    return c.json({ message }, 400);
  }
});

adminRoutes.post('/payments/:id/reconcile', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  const paymentId = c.req.param('id');

  if (admin instanceof Response) {
    return admin;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, branchId: true },
  });

  if (!payment) {
    return c.json({ message: 'Payment not found' }, 404);
  }

  if (
    admin.role !== 'hq_admin' &&
    !admin.branchScopes.some((scope: AdminBranchScope) => scope.branchId === payment.branchId)
  ) {
    return c.json({ message: 'Payment access denied' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const payload = z
    .object({
      providerStatus: z.string().min(1).optional(),
      providerRef: z.string().min(1).optional(),
      amount: z.number().int().positive().optional(),
      note: z.string().min(1).optional(),
    })
    .parse(body);

  try {
    const session = await reconcilePayment({
      paymentId,
      ...payload,
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.payment.reconcile',
      entityType: 'payment',
      entityId: paymentId,
      branchId: payment.branchId,
      metadata: payload as unknown as Prisma.InputJsonValue,
    });

    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile payment';
    const status = message === 'Payment not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.post('/payments/:id/verify', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  const paymentId = c.req.param('id');

  if (admin instanceof Response) {
    return admin;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, branchId: true },
  });

  if (!payment) {
    return c.json({ message: 'Payment not found' }, 404);
  }

  if (
    admin.role !== 'hq_admin' &&
    !admin.branchScopes.some((scope: AdminBranchScope) => scope.branchId === payment.branchId)
  ) {
    return c.json({ message: 'Payment access denied' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const payload = z
    .object({
      note: z.string().min(1).optional(),
      providerRef: z.string().min(1).optional(),
    })
    .parse(body);

  try {
    const session = await reconcilePayment({
      paymentId,
      providerRef: payload.providerRef,
      note: payload.note ?? 'admin requested provider verification',
      forceProviderLookup: true,
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.payment.verify',
      entityType: 'payment',
      entityId: paymentId,
      branchId: payment.branchId,
      metadata: {
        providerRef: payload.providerRef ?? null,
        note: payload.note ?? null,
      },
    });

    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    const status = message === 'Payment not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/customers', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 50);
    const search = c.req.query('search')?.trim();
    const branchId = c.req.query('branchId');
    const { sessionWhere } = buildBranchFilter(admin, branchId);

    const userIds = await prisma.washSession.findMany({
      where: sessionWhere,
      distinct: ['userId'],
      select: { userId: true },
    });

    const scopedUserIds = userIds.map((entry) => entry.userId);
    if (scopedUserIds.length === 0) {
      return c.json({ data: [], total: 0, page, limit });
    }

    const userWhere: Prisma.UserWhereInput = {
      id: { in: scopedUserIds },
    };

    if (search) {
      userWhere.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { lineUserId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          lineUserId: true,
          displayName: true,
          avatarUrl: true,
          phone: true,
          tier: true,
          totalPoints: true,
          createdAt: true,
          vehicles: {
            select: {
              id: true,
              brand: true,
              model: true,
              plate: true,
              province: true,
              color: true,
              size: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          wallet: {
            select: { balance: true },
          },
          sessions: {
            where: sessionWhere,
            select: {
              id: true,
              totalPrice: true,
              status: true,
              createdAt: true,
              completedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where: userWhere }),
    ]);

    return c.json({
      data: customers.map((customer) => {
        const confirmedSessions = customer.sessions.filter((session) =>
          ['ready_to_wash', 'in_progress', 'completed'].includes(session.status)
        );
        const lastWash = customer.sessions[0]?.completedAt ?? customer.sessions[0]?.createdAt ?? null;

        return {
          id: customer.id,
          lineUserId: customer.lineUserId,
          displayName: customer.displayName,
          avatarUrl: customer.avatarUrl,
          phone: customer.phone,
          points: customer.wallet?.balance ?? customer.totalPoints,
          totalWashes: confirmedSessions.filter((session) => session.status === 'completed').length,
          totalSpend: confirmedSessions.reduce((sum, session) => sum + session.totalPrice, 0),
          memberTier: customer.tier,
          memberSince: customer.createdAt,
          lastWash,
          vehicles: customer.vehicles.map((vehicle) => ({
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            plate: vehicle.plate,
            province: vehicle.province,
            color: vehicle.color,
            size: vehicle.size,
            createdAt: vehicle.createdAt,
          })),
        };
      }),
      total,
      page,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load customers';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/meta', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  const [accessibleBranches, availableRoles] = await Promise.all([
    prisma.branch.findMany({
      where: getBranchWhereClause(admin.role, admin.branchScopes),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        isActive: true,
      },
    }),
    Promise.resolve(['hq_admin', 'branch_admin']),
  ]);

  return c.json({
    data: {
      machineStatuses,
      sessionStatuses,
      paymentStatuses,
      admin: mapAdminIdentity(admin),
      availableRoles,
      branches: accessibleBranches,
    },
  });
});

adminRoutes.get('/coupons', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = c.req.query('branchId');
    const status = c.req.query('status');
    const scope = c.req.query('scope');
    const search = c.req.query('search')?.trim();
    const includeArchived = c.req.query('includeArchived') === 'true';
    const scopedBranchId = ensureCouponManagementAccess(admin, branchId);
    const manageableBranchIds = getCouponManageableBranchIds(admin);

    const filters: Prisma.CouponWhereInput[] = [];

    if (status) {
      filters.push({ status: status as CouponStatus });
    } else if (!includeArchived) {
      filters.push({ status: { not: 'archived' } });
    }

    if (scope) {
      filters.push({ scope: scope as CouponScope });
    }

    if (search) {
      filters.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (scopedBranchId) {
      if (admin.role === 'hq_admin') {
        filters.push({
          OR: [{ scope: 'all_branches' }, { branches: { some: { branchId: scopedBranchId } } }],
        });
      } else {
        filters.push({ branches: { some: { branchId: scopedBranchId } } });
      }
    } else if (manageableBranchIds && manageableBranchIds.length > 0) {
      filters.push({ branches: { some: { branchId: { in: manageableBranchIds } } } });
    }

    const coupons = await prisma.coupon.findMany({
      where: filters.length > 0 ? { AND: filters } : {},
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ branchId: 'asc' }],
        },
        _count: {
          select: {
            users: true,
            redemptions: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const manageableCoupons = coupons.filter((coupon) => {
      if (!canManageCouponRecord(admin, coupon)) {
        return false;
      }

      if (!scopedBranchId) {
        return true;
      }

      return coupon.scope === 'all_branches' || coupon.branches.some((item) => item.branchId === scopedBranchId);
    });

    const branchUsage = manageableCoupons.length
      ? await prisma.couponRedemption.groupBy({
          by: ['couponId', 'branchId'],
          where: {
            couponId: { in: manageableCoupons.map((coupon) => coupon.id) },
            ...(scopedBranchId
              ? { branchId: scopedBranchId }
              : manageableBranchIds
                ? { branchId: { in: manageableBranchIds } }
                : {}),
          },
          _count: { _all: true },
        })
      : [];

    const redemptionSummary = branchUsage.reduce<Record<string, Array<{ branchId: string; usedCount: number }>>>(
      (accumulator, item) => {
        accumulator[item.couponId] ??= [];
        accumulator[item.couponId].push({
          branchId: item.branchId,
          usedCount: item._count._all,
        });
        return accumulator;
      },
      {}
    );

    return c.json({
      data: manageableCoupons.map((coupon) => mapAdminCoupon(coupon, redemptionSummary)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load coupons';
    const status =
      message === 'Coupon management access denied'
        ? 403
        : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.post('/coupons', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const payload = createCouponSchema.parse(await c.req.json());
    const branchIds = resolveCouponBranchAssignments(admin, payload.scope, payload.branchIds);
    const packageIds = Array.from(new Set(payload.packageIds));
    const nextStatus: CouponStatus = payload.status ?? 'active';

    if (admin.role !== 'hq_admin' && nextStatus === 'archived') {
      throw new Error('Branch admins cannot create archived coupons');
    }

    await validateCouponReferences({ packageIds, branchIds });

    const created = await prisma.coupon.create({
      data: {
        code: payload.code.trim().toUpperCase(),
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        scope: payload.scope,
        status: nextStatus,
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        minSpend: payload.minSpend,
        maxUses: payload.maxUses,
        maxUsesPerUser: payload.maxUsesPerUser,
        packageIds,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
        branches: branchIds.length
          ? {
              createMany: {
                data: branchIds.map((assignedBranchId) => ({
                  branchId: assignedBranchId,
                })),
              },
            }
          : undefined,
      },
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            redemptions: true,
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.coupon.create',
      entityType: 'coupon',
      entityId: created.id,
      branchId: payload.scope === 'branch_only' ? branchIds[0] : null,
      metadata: {
        code: created.code,
        scope: created.scope,
        status: created.status,
        branchIds,
      },
    });

    return c.json({ data: mapAdminCoupon(created, {}) }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create coupon';
    const status =
      message === 'Only HQ can create all-branch coupons' ||
      message === 'Coupon branch assignment is outside admin scope' ||
      message === 'Branch admins cannot create archived coupons'
        ? 403
        : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.patch('/coupons/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const couponId = c.req.param('id');
    const payload = updateCouponSchema.parse(await c.req.json());
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        branches: {
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!existing) {
      return c.json({ message: 'Coupon not found' }, 404);
    }

    if (!canManageCouponRecord(admin, existing)) {
      return c.json({ message: 'Coupon management access denied' }, 403);
    }

    const nextScope = payload.scope ?? existing.scope;
    const nextBranchIds = resolveCouponBranchAssignments(
      admin,
      nextScope,
      payload.branchIds ?? existing.branches.map((item) => item.branchId)
    );
    const nextPackageIds = payload.packageIds ? Array.from(new Set(payload.packageIds)) : existing.packageIds;
    const nextStatus = payload.status ?? existing.status;
    const nextValidFrom = payload.validFrom ?? existing.validFrom;
    const nextValidUntil = payload.validUntil ?? existing.validUntil;

    if (admin.role !== 'hq_admin' && nextStatus === 'archived') {
      throw new Error('Branch admins cannot archive coupons');
    }

    if (nextValidUntil <= nextValidFrom) {
      throw new Error('validUntil must be later than validFrom');
    }

    await validateCouponReferences({
      packageIds: nextPackageIds,
      branchIds: nextBranchIds,
    });

    await prisma.$transaction(async (tx) => {
      await tx.couponBranchLink.deleteMany({
        where: { couponId },
      });

      if (nextBranchIds.length) {
        await tx.couponBranchLink.createMany({
          data: nextBranchIds.map((assignedBranchId) => ({
            couponId,
            branchId: assignedBranchId,
          })),
        });
      }

      await tx.coupon.update({
        where: { id: couponId },
        data: {
          code: payload.code ? payload.code.trim().toUpperCase() : undefined,
          title: payload.title?.trim(),
          description:
            payload.description === undefined ? undefined : payload.description?.trim() || null,
          scope: nextScope,
          status: nextStatus,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          minSpend: payload.minSpend,
          maxUses: payload.maxUses,
          maxUsesPerUser: payload.maxUsesPerUser,
          packageIds: nextPackageIds,
          validFrom: payload.validFrom,
          validUntil: payload.validUntil,
        },
      });
    });

    const updated = await prisma.coupon.findUniqueOrThrow({
      where: { id: couponId },
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ branchId: 'asc' }],
        },
        _count: {
          select: {
            users: true,
            redemptions: true,
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.coupon.update',
      entityType: 'coupon',
      entityId: updated.id,
      branchId: updated.scope === 'branch_only' ? nextBranchIds[0] : null,
      metadata: {
        updatedFields: Object.keys(payload),
        scope: updated.scope,
        status: updated.status,
        branchIds: nextBranchIds,
      },
    });

    return c.json({ data: mapAdminCoupon(updated, {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update coupon';
    const status =
      message === 'Coupon management access denied' ||
      message === 'Only HQ can create all-branch coupons' ||
      message === 'Coupon branch assignment is outside admin scope' ||
      message === 'Branch admins cannot archive coupons'
        ? 403
        : message === 'Coupon not found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.patch('/coupons/:id/activation', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const couponId = c.req.param('id');
    const payload = couponActivationSchema.parse(await c.req.json());
    const existing = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        branches: {
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!existing) {
      return c.json({ message: 'Coupon not found' }, 404);
    }

    if (!canManageCouponRecord(admin, existing)) {
      return c.json({ message: 'Coupon management access denied' }, 403);
    }

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: payload.isActive ? 'active' : 'inactive',
      },
      include: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            redemptions: true,
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.coupon.activation',
      entityType: 'coupon',
      entityId: updated.id,
      branchId: updated.scope === 'branch_only' ? updated.branches[0]?.branchId ?? null : null,
      metadata: {
        status: updated.status,
      },
    });

    return c.json({ data: mapAdminCoupon(updated, {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update coupon activation';
    const status =
      message === 'Coupon management access denied'
        ? 403
        : message === 'Coupon not found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/packages', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = c.req.query('branchId');
    const includeInactive = c.req.query('includeInactive') === 'true';
    const scopedBranchId = ensureBranchAccess(admin, branchId);
    const accessibleBranchIds = admin.branchScopes.map((scope: AdminBranchScope) => scope.branchId);

    let branchConfigWhere: Prisma.BranchPackageConfigWhereInput | undefined;
    if (scopedBranchId) {
      branchConfigWhere = { branchId: scopedBranchId };
    } else if (admin.role !== 'hq_admin') {
      branchConfigWhere = { branchId: { in: accessibleBranchIds } };
    }

    const packages = await prisma.washPackage.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        branchConfigs: {
          where: branchConfigWhere,
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
          orderBy: [{ branchId: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return c.json({
      data: packages.map((pkg) => mapAdminPackage(pkg)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load packages';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.post('/packages', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const payload = createPackageSchema.parse(await c.req.json());

    const created = await prisma.washPackage.create({
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description ?? null,
        vehicleType: payload.vehicleType,
        priceS: payload.priceS,
        priceM: payload.priceM,
        priceL: payload.priceL,
        steps: payload.steps,
        stepDuration: payload.stepDuration,
        features: toNullableJsonInput(payload.features ?? null),
        image: payload.image ?? null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
      },
    });

    const createdRecord = await prisma.washPackage.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        branchConfigs: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.package.create',
      entityType: 'wash_package',
      entityId: created.id,
      metadata: {
        code: created.code,
        vehicleType: created.vehicleType,
      },
    });

    return c.json(
      {
        data: mapAdminPackage(createdRecord),
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create package';
    const status = message === 'Only HQ can manage global packages' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.patch('/packages/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const packageId = c.req.param('id');
    const payload = updatePackageSchema.parse(await c.req.json());

    const updated = await prisma.washPackage.update({
      where: { id: packageId },
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        vehicleType: payload.vehicleType,
        priceS: payload.priceS,
        priceM: payload.priceM,
        priceL: payload.priceL,
        steps: payload.steps,
        stepDuration: payload.stepDuration,
        features: toNullableJsonInput(payload.features),
        image: payload.image,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      },
    });

    const updatedRecord = await prisma.washPackage.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        branchConfigs: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.package.update',
      entityType: 'wash_package',
      entityId: updated.id,
      metadata: {
        updatedFields: Object.keys(payload),
      },
    });

    return c.json({
      data: mapAdminPackage(updatedRecord),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update package';
    const status =
      message === 'Only HQ can manage global packages'
        ? 403
        : message === 'No WashPackage found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.patch('/packages/:id/activation', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const packageId = c.req.param('id');
    const payload = packageActivationSchema.parse(await c.req.json());

    const updated = await prisma.washPackage.update({
      where: { id: packageId },
      data: {
        isActive: payload.isActive,
      },
    });

    const updatedRecord = await prisma.washPackage.findUniqueOrThrow({
      where: { id: updated.id },
      include: {
        branchConfigs: {
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: payload.isActive ? 'admin.package.activate' : 'admin.package.deactivate',
      entityType: 'wash_package',
      entityId: updated.id,
    });

    return c.json({
      data: mapAdminPackage(updatedRecord),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update package activation';
    const status =
      message === 'Only HQ can manage global packages'
        ? 403
        : message === 'No WashPackage found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.patch('/packages/:id/branches/:branchId', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const packageId = c.req.param('id');
    const branchId = c.req.param('branchId');
    ensureBranchAccess(admin, branchId);
    const payload = branchPackageConfigSchema.parse(await c.req.json());

    const [pkg, branch] = await Promise.all([
      prisma.washPackage.findUnique({
        where: { id: packageId },
      }),
      prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          isActive: true,
        },
      }),
    ]);

    if (!pkg) {
      return c.json({ message: 'Package not found' }, 404);
    }

    if (!branch) {
      return c.json({ message: 'Branch not found' }, 404);
    }

    await prisma.branchPackageConfig.upsert({
      where: {
        branchId_packageId: {
          branchId,
          packageId,
        },
      },
      update: payload,
      create: {
        branchId,
        packageId,
        isActive: payload.isActive ?? true,
        isVisible: payload.isVisible ?? true,
        displayName: payload.displayName ?? null,
        descriptionOverride: payload.descriptionOverride ?? null,
        priceOverrideS: payload.priceOverrideS,
        priceOverrideM: payload.priceOverrideM,
        priceOverrideL: payload.priceOverrideL,
      },
    });

    const updatedPackage = await prisma.washPackage.findUniqueOrThrow({
      where: { id: packageId },
      include: {
        branchConfigs: {
          where: { branchId },
          include: {
            branch: {
              select: {
                id: true,
                code: true,
                name: true,
                shortName: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.package.branch_config.update',
      entityType: 'branch_package_config',
      entityId: `${branchId}:${packageId}`,
      branchId,
      metadata: {
        packageId,
        branchId,
        updatedFields: Object.keys(payload),
      },
    });

    return c.json({
      data: {
        package: mapAdminPackage(updatedPackage),
        branch,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update branch package configuration';
    const status = message === 'Branch access denied' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminRoutes.get('/policies/branch-settings', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can manage global policies' }, 403);
  }

  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: {
      settings: true,
    },
  });

  return c.json({
    data: {
      branches: branches.map((branch) => ({
        id: branch.id,
        code: branch.code,
        name: branch.name,
        shortName: branch.shortName,
        isActive: branch.isActive,
        settings: mapBranchSettings(branch.settings),
      })),
      editableFields: Object.keys(branchSettingsSchema.shape),
    },
  });
});

adminRoutes.patch('/policies/branch-settings', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  const adminId = c.get('adminId');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can manage global policies' }, 403);
  }

  const body = await c.req.json();
  const payload = z
    .object({
      branchIds: z.array(z.string()).optional(),
      settings: branchSettingsSchema.refine(
        (value) => Object.keys(value).length > 0,
        'At least one settings field is required'
      ),
    })
    .parse(body);

  const targetBranches =
    payload.branchIds && payload.branchIds.length > 0
      ? payload.branchIds
      : (
          await prisma.branch.findMany({
            select: { id: true },
          })
        ).map((branch) => branch.id);

  await prisma.$transaction(
    targetBranches.map((branchId) =>
      prisma.branchSettings.upsert({
        where: { branchId },
        update: payload.settings,
        create: {
          branchId,
          ...payload.settings,
        },
      })
    )
  );

  await logAdminAction({
    adminUserId: adminId,
    action: 'admin.policy.apply_branch_settings',
    entityType: 'branch_settings',
    metadata: {
      branchIds: targetBranches,
      settings: payload.settings,
    } as unknown as Prisma.InputJsonValue,
  });

  return c.json({
    data: {
      updatedCount: targetBranches.length,
      branchIds: targetBranches,
      settings: payload.settings,
    },
  });
});

adminRoutes.get('/users', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can view admin users' }, 403);
  }

  const admins = await prisma.adminUser.findMany({
    include: {
      branchScopes: {
        include: {
          branch: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  return c.json({
    data: admins.map((adminUser) => mapAdminIdentity(adminUser)),
  });
});

adminRoutes.post('/users', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  const adminId = c.get('adminId');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can create admin users' }, 403);
  }

  const body = await c.req.json();
  const data = createAdminUserSchema.parse(body);
  const branchScopes = normalizeBranchScopes(data);

  const passwordHash = await bcrypt.hash(data.password, 12);

  const createdAdmin = await prisma.adminUser.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      branchScopes:
        branchScopes.length > 0
          ? {
              create: branchScopes,
            }
          : undefined,
    },
    include: {
      branchScopes: {
        include: {
          branch: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  await logAdminAction({
    adminUserId: adminId,
    action: 'admin.user.create',
    entityType: 'admin_user',
    entityId: createdAdmin.id,
    metadata: {
      role: createdAdmin.role,
      branchScopeCount: branchScopes.length,
    },
  });

  return c.json(
    {
      data: mapAdminIdentity(createdAdmin),
    },
    201
  );
});

adminRoutes.patch('/users/:id', requireAdmin, async (c) => {
  const role = c.get('adminRole');
  const actorAdminId = c.get('adminId');
  if (role !== 'hq_admin') {
    return c.json({ message: 'Only HQ can update admin users' }, 403);
  }

  const id = c.req.param('id');
  const body = await c.req.json();
  const data = updateAdminUserSchema.parse(body);

  if (actorAdminId === id && (data.isActive === false || data.role === 'branch_admin')) {
    return c.json({ message: 'You cannot deactivate or demote your own HQ account' }, 400);
  }

  const existing = await prisma.adminUser.findUnique({
    where: { id },
    include: {
      branchScopes: true,
    },
  });

  if (!existing) {
    return c.json({ message: 'Admin user not found' }, 404);
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : undefined;
  const nextRole = data.role ?? existing.role;
  const nextScopes = data.branchScopes
    ? normalizeBranchScopes({
        role: nextRole,
        branchScopes: data.branchScopes,
      })
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const adminUser = await tx.adminUser.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        passwordHash,
      },
    });

    if (nextScopes) {
      await tx.adminBranchScope.deleteMany({
        where: { adminUserId: id },
      });

      if (nextScopes.length > 0) {
        await tx.adminBranchScope.createMany({
          data: nextScopes.map((scope) => ({
            adminUserId: id,
            branchId: scope.branchId,
            canViewRevenue: scope.canViewRevenue,
            canManageMachines: scope.canManageMachines,
            canManageCoupons: scope.canManageCoupons,
          })),
        });
      }
    }

    return tx.adminUser.findUniqueOrThrow({
      where: { id: adminUser.id },
      include: {
        branchScopes: {
          include: {
            branch: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
  });

  await logAdminAction({
    adminUserId: actorAdminId,
    action: 'admin.user.update',
    entityType: 'admin_user',
    entityId: id,
    metadata: {
      updatedFields: Object.keys(data).filter((key) => key !== 'password'),
    },
  });

  return c.json({
    data: mapAdminIdentity(updated),
  });
});
