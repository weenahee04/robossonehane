import { NotificationCategory, Prisma } from '@prisma/client';
import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminWithScopes } from '../lib/admin-scope.js';
import { prisma } from '../lib/prisma.js';
import type { AppEnv } from '../lib/types.js';
import { requireAdmin } from '../middleware/auth.js';

type AdminWithScopes = NonNullable<Awaited<ReturnType<typeof getAdminWithScopes>>>;

export const adminEngagementRoutes = new Hono<AppEnv>();

const promotionBaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  gradient: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  isActive: z.boolean().optional(),
  branchIds: z.array(z.string().min(1)).default([]),
});

const promotionSchema = promotionBaseSchema.superRefine((value, ctx) => {
    if (value.validUntil <= value.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validUntil'],
        message: 'validUntil must be later than validFrom',
      });
    }
  });

const promotionUpdateSchema = promotionBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one promotion field is required');

const rewardSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  pointsCost: z.number().int().min(1),
  category: z.string().min(1),
  tag: z.string().nullable().optional(),
  icon: z.string().min(1),
  iconBg: z.string().nullable().optional(),
  stock: z.number().int().min(0).nullable().optional(),
  branchIds: z.array(z.string().min(1)).default([]),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const rewardUpdateSchema = rewardSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one reward field is required');

const notificationCampaignSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().min(1),
    category: z.enum(['wash', 'coupon', 'points', 'system']),
    branchIds: z.array(z.string().min(1)).default([]),
  })
  .strict();

const feedbackUpdateSchema = z
  .object({
    status: z.string().min(1).optional(),
    adminNotes: z.string().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one feedback field is required');

async function resolveAdmin(c: any) {
  const admin = await getAdminWithScopes(c.get('adminId'));
  if (!admin) {
    return c.json({ message: 'Admin not found' }, 404);
  }

  return admin;
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

function getScopedBranchIds(admin: AdminWithScopes) {
  return admin.role === 'hq_admin' ? null : admin.branchScopes.map((scope) => scope.branchId);
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
    throw new Error('Only HQ can manage rewards');
  }
}

function validateBranchAssignments(admin: AdminWithScopes, branchIds: string[]) {
  const normalized = Array.from(new Set(branchIds.filter(Boolean)));
  const scopedBranchIds = getScopedBranchIds(admin);

  if (normalized.length === 0) {
    if (admin.role !== 'hq_admin') {
      throw new Error('Branch admins must assign at least one branch');
    }

    return normalized;
  }

  if (scopedBranchIds && normalized.some((branchId) => !scopedBranchIds.includes(branchId))) {
    throw new Error('Branch assignment is outside admin scope');
  }

  return normalized;
}

function canManagePromotion(admin: AdminWithScopes, promotion: { branchIds: string[] }) {
  if (admin.role === 'hq_admin') {
    return true;
  }

  if (promotion.branchIds.length === 0) {
    return false;
  }

  const scopedBranchIds = getScopedBranchIds(admin) ?? [];
  return promotion.branchIds.every((branchId) => scopedBranchIds.includes(branchId));
}

function canAccessFeedback(admin: AdminWithScopes, feedback: { branchId: string | null }) {
  if (admin.role === 'hq_admin') {
    return true;
  }

  if (!feedback.branchId) {
    return false;
  }

  return admin.branchScopes.some((scope) => scope.branchId === feedback.branchId);
}

adminEngagementRoutes.get('/promotions', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = ensureBranchAccess(admin, c.req.query('branchId'));
    const search = c.req.query('search')?.trim();
    const includeInactive = c.req.query('includeInactive') === 'true';
    const scopedBranchIds = getScopedBranchIds(admin);

    const promotions = await prisma.promotion.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ createdAt: 'desc' }],
    });

    const data = promotions.filter((promotion) => {
      if (search) {
        const haystack = `${promotion.title} ${promotion.description ?? ''} ${promotion.conditions ?? ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) {
          return false;
        }
      }

      if (branchId) {
        return promotion.branchIds.length === 0 ? admin.role === 'hq_admin' : promotion.branchIds.includes(branchId);
      }

      if (scopedBranchIds) {
        return promotion.branchIds.length > 0 && promotion.branchIds.every((id) => scopedBranchIds.includes(id));
      }

      return true;
    });

    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load promotions';
    return c.json({ message }, message === 'Branch access denied' ? 403 : 400);
  }
});

adminEngagementRoutes.post('/promotions', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const payload = promotionSchema.parse(await c.req.json());
    const branchIds = validateBranchAssignments(admin, payload.branchIds);

    const created = await prisma.promotion.create({
      data: {
        title: payload.title,
        description: payload.description ?? null,
        image: payload.image ?? null,
        gradient: payload.gradient ?? null,
        conditions: payload.conditions ?? null,
        validFrom: payload.validFrom,
        validUntil: payload.validUntil,
        isActive: payload.isActive ?? true,
        branchIds,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.promotion.create',
      entityType: 'promotion',
      entityId: created.id,
      branchId: branchIds.length === 1 ? branchIds[0] : null,
      metadata: {
        branchIds,
        isActive: created.isActive,
      },
    });

    return c.json({ data: created }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create promotion';
    const status =
      message === 'Branch admins must assign at least one branch' || message === 'Branch assignment is outside admin scope'
        ? 403
        : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.patch('/promotions/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const promotionId = c.req.param('id');
    const payload = promotionUpdateSchema.parse(await c.req.json());
    const existing = await prisma.promotion.findUnique({ where: { id: promotionId } });

    if (!existing) {
      return c.json({ message: 'Promotion not found' }, 404);
    }

    if (!canManagePromotion(admin, existing)) {
      return c.json({ message: 'Promotion access denied' }, 403);
    }

    const branchIds = payload.branchIds ? validateBranchAssignments(admin, payload.branchIds) : existing.branchIds;
    const validFrom = payload.validFrom ?? existing.validFrom;
    const validUntil = payload.validUntil ?? existing.validUntil;
    if (validUntil <= validFrom) {
      throw new Error('validUntil must be later than validFrom');
    }

    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        title: payload.title,
        description: payload.description,
        image: payload.image,
        gradient: payload.gradient,
        conditions: payload.conditions,
        validFrom,
        validUntil,
        isActive: payload.isActive,
        branchIds,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.promotion.update',
      entityType: 'promotion',
      entityId: updated.id,
      branchId: branchIds.length === 1 ? branchIds[0] : null,
      metadata: {
        updatedFields: Object.keys(payload),
        branchIds,
      },
    });

    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update promotion';
    const status =
      message === 'Promotion access denied' ||
      message === 'Branch admins must assign at least one branch' ||
      message === 'Branch assignment is outside admin scope'
        ? 403
        : message === 'Promotion not found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.patch('/promotions/:id/activation', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const promotionId = c.req.param('id');
    const payload = z.object({ isActive: z.boolean() }).parse(await c.req.json());
    const existing = await prisma.promotion.findUnique({ where: { id: promotionId } });

    if (!existing) {
      return c.json({ message: 'Promotion not found' }, 404);
    }

    if (!canManagePromotion(admin, existing)) {
      return c.json({ message: 'Promotion access denied' }, 403);
    }

    const updated = await prisma.promotion.update({
      where: { id: promotionId },
      data: { isActive: payload.isActive },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: payload.isActive ? 'admin.promotion.activate' : 'admin.promotion.deactivate',
      entityType: 'promotion',
      entityId: updated.id,
      branchId: updated.branchIds.length === 1 ? updated.branchIds[0] : null,
    });

    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update promotion activation';
    const status = message === 'Promotion access denied' ? 403 : message === 'Promotion not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.get('/rewards', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = ensureBranchAccess(admin, c.req.query('branchId'));
    const search = c.req.query('search')?.trim().toLowerCase();
    const includeInactive = c.req.query('includeInactive') === 'true';
    const scopedBranchIds = getScopedBranchIds(admin);

    const rewards = await prisma.rewardCatalog.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const data = rewards.filter((reward) => {
      if (search) {
        const haystack = `${reward.code} ${reward.name} ${reward.description ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (branchId) {
        return reward.branchIds.length === 0 || reward.branchIds.includes(branchId);
      }

      if (scopedBranchIds) {
        return reward.branchIds.length === 0 || reward.branchIds.every((id) => scopedBranchIds.includes(id));
      }

      return true;
    });

    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load rewards';
    return c.json({ message }, message === 'Branch access denied' ? 403 : 400);
  }
});

adminEngagementRoutes.post('/rewards', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const payload = rewardSchema.parse(await c.req.json());
    const branchIds = validateBranchAssignments(admin, payload.branchIds);

    const created = await prisma.rewardCatalog.create({
      data: {
        code: payload.code.toUpperCase(),
        name: payload.name,
        description: payload.description ?? null,
        pointsCost: payload.pointsCost,
        category: payload.category,
        tag: payload.tag ?? null,
        icon: payload.icon,
        iconBg: payload.iconBg ?? null,
        stock: payload.stock ?? null,
        branchIds,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.reward.create',
      entityType: 'reward_catalog',
      entityId: created.id,
      metadata: {
        code: created.code,
        branchIds,
      },
    });

    return c.json({ data: created }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reward';
    const status = message === 'Only HQ can manage rewards' ? 403 : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.patch('/rewards/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const rewardId = c.req.param('id');
    const payload = rewardUpdateSchema.parse(await c.req.json());
    const branchIds = payload.branchIds ? validateBranchAssignments(admin, payload.branchIds) : undefined;

    const updated = await prisma.rewardCatalog.update({
      where: { id: rewardId },
      data: {
        code: payload.code?.toUpperCase(),
        name: payload.name,
        description: payload.description,
        pointsCost: payload.pointsCost,
        category: payload.category,
        tag: payload.tag,
        icon: payload.icon,
        iconBg: payload.iconBg,
        stock: payload.stock,
        branchIds,
        isActive: payload.isActive,
        sortOrder: payload.sortOrder,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.reward.update',
      entityType: 'reward_catalog',
      entityId: updated.id,
      metadata: {
        updatedFields: Object.keys(payload),
      },
    });

    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reward';
    const status =
      message === 'Only HQ can manage rewards'
        ? 403
        : message === 'No RewardCatalog found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.patch('/rewards/:id/activation', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    ensureHqRole(admin);
    const rewardId = c.req.param('id');
    const payload = z.object({ isActive: z.boolean() }).parse(await c.req.json());

    const updated = await prisma.rewardCatalog.update({
      where: { id: rewardId },
      data: {
        isActive: payload.isActive,
      },
    });

    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update reward activation';
    const status =
      message === 'Only HQ can manage rewards'
        ? 403
        : message === 'No RewardCatalog found'
          ? 404
          : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.get('/notification-campaigns', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = ensureBranchAccess(admin, c.req.query('branchId'));
    const scopedBranchIds = getScopedBranchIds(admin);
    const campaigns = await prisma.notificationCampaign.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });

    const data = campaigns.filter((campaign) => {
      if (branchId) {
        return campaign.branchIds.length === 0 ? admin.role === 'hq_admin' : campaign.branchIds.includes(branchId);
      }

      if (scopedBranchIds) {
        return campaign.branchIds.length > 0 && campaign.branchIds.every((id) => scopedBranchIds.includes(id));
      }

      return true;
    });

    return c.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load notification campaigns';
    return c.json({ message }, message === 'Branch access denied' ? 403 : 400);
  }
});

adminEngagementRoutes.post('/notification-campaigns', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const payload = notificationCampaignSchema.parse(await c.req.json());
    const branchIds = validateBranchAssignments(admin, payload.branchIds);
    const scope = branchIds.length === 0 ? 'all_branches' : branchIds.length === 1 ? 'branch_only' : 'selected_branches';

    const targetUsers =
      branchIds.length === 0
        ? await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true },
          })
        : await prisma.washSession.findMany({
            where: {
              branchId: { in: branchIds },
            },
            distinct: ['userId'],
            select: { userId: true },
          });

    const userIds = Array.from(
      new Set(targetUsers.map((item) => ('userId' in item ? item.userId : item.id)).filter(Boolean))
    );

    const campaign = await prisma.notificationCampaign.create({
      data: {
        title: payload.title,
        body: payload.body,
        category: payload.category as NotificationCategory,
        scope,
        branchIds,
        targetUserCount: userIds.length,
        sentCount: userIds.length,
        createdByAdminId: admin.id,
      },
    });

    if (userIds.length > 0) {
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          title: payload.title,
          body: payload.body,
          category: payload.category as NotificationCategory,
        })),
      });
    }

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.notification.broadcast',
      entityType: 'notification_campaign',
      entityId: campaign.id,
      branchId: branchIds.length === 1 ? branchIds[0] : null,
      metadata: {
        scope,
        branchIds,
        targetUserCount: userIds.length,
      },
    });

    return c.json({ data: campaign }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to broadcast notification';
    const status =
      message === 'Branch admins must assign at least one branch' || message === 'Branch assignment is outside admin scope'
        ? 403
        : 400;
    return c.json({ message }, status);
  }
});

adminEngagementRoutes.get('/feedback', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const branchId = ensureBranchAccess(admin, c.req.query('branchId'));
    const status = c.req.query('status');
    const search = c.req.query('search')?.trim();
    const scopedBranchIds = getScopedBranchIds(admin);

    const where: Prisma.FeedbackWhereInput = {};
    if (branchId) {
      where.branchId = branchId;
    } else if (scopedBranchIds) {
      where.branchId = { in: scopedBranchIds };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { user: { displayName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const feedback = await prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            lineUserId: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });

    const branchIds = Array.from(new Set(feedback.map((item) => item.branchId).filter(Boolean))) as string[];
    const branchMap = branchIds.length
      ? new Map(
          (
            await prisma.branch.findMany({
              where: { id: { in: branchIds } },
              select: { id: true, code: true, name: true, shortName: true },
            })
          ).map((branch) => [branch.id, branch])
        )
      : new Map();

    return c.json({
      data: feedback.map((item) => ({
        ...item,
        branch: item.branchId ? branchMap.get(item.branchId) ?? null : null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback';
    return c.json({ message }, message === 'Branch access denied' ? 403 : 400);
  }
});

adminEngagementRoutes.patch('/feedback/:id', requireAdmin, async (c) => {
  const admin = await resolveAdmin(c);
  if (admin instanceof Response) {
    return admin;
  }

  try {
    const feedbackId = c.req.param('id');
    const payload = feedbackUpdateSchema.parse(await c.req.json());
    const existing = await prisma.feedback.findUnique({ where: { id: feedbackId } });

    if (!existing) {
      return c.json({ message: 'Feedback not found' }, 404);
    }

    if (!canAccessFeedback(admin, { branchId: existing.branchId })) {
      return c.json({ message: 'Feedback access denied' }, 403);
    }

    const nextStatus = payload.status ?? existing.status;
    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: payload.status,
        adminNotes: payload.adminNotes,
        resolvedAt: nextStatus === 'resolved' ? new Date() : payload.status ? null : existing.resolvedAt,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            phone: true,
            lineUserId: true,
          },
        },
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: 'admin.feedback.update',
      entityType: 'feedback',
      entityId: updated.id,
      branchId: updated.branchId,
      metadata: {
        updatedFields: Object.keys(payload),
        status: nextStatus,
      },
    });

    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update feedback';
    const status = message === 'Feedback access denied' ? 403 : message === 'Feedback not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});
