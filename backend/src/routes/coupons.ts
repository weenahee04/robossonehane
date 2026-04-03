import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const couponRoutes = new Hono<AppEnv>();
couponRoutes.use('*', requireAuth);

couponRoutes.get('/available', async (c) => {
  const userId = c.get('userId');
  const branchId = c.req.query('branchId');
  const now = new Date();

  const [coupons, claimedCoupons] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        status: 'active',
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        branches: {
          select: { branchId: true },
        },
      },
      orderBy: [{ validUntil: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.userCoupon.findMany({
      where: { userId },
      select: { couponId: true },
    }),
  ]);

  const claimedCouponIds = new Set(claimedCoupons.map((item) => item.couponId));

  const filtered = coupons.filter((coupon) => {
    if (claimedCouponIds.has(coupon.id)) {
      return false;
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return false;
    }

    if (!branchId) {
      return true;
    }

    const branchIds = coupon.branches.map((branch) => branch.branchId);
    return coupon.scope === 'all_branches' || branchIds.includes(branchId);
  });

  return c.json({
    data: filtered.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      scope: coupon.scope,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minSpend: coupon.minSpend,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      branchIds: coupon.branches.map((branch) => branch.branchId),
      packageIds: coupon.packageIds,
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
    })),
  });
});

// Get user's coupons (optional ?branchId= filter)
couponRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const branchId = c.req.query('branchId');

  const userCoupons = await prisma.userCoupon.findMany({
    where: { userId },
    include: {
      coupon: {
        include: {
          branches: {
            select: { branchId: true },
          },
        },
      },
    },
    orderBy: { coupon: { validUntil: 'desc' } },
  });

  let filtered = userCoupons;
  if (branchId) {
    filtered = userCoupons.filter((uc) => {
      const ids = uc.coupon.branches.map((branch) => branch.branchId);
      return uc.coupon.scope === 'all_branches' || ids.includes(branchId);
    });
  }

  return c.json({
    data: filtered.map((uc) => ({
      id: uc.id,
      userId: uc.userId,
      couponId: uc.couponId,
      isUsed: uc.status === 'redeemed',
      usedAt: uc.redeemedAt?.toISOString() || null,
      status: uc.status,
      coupon: {
        id: uc.coupon.id,
        code: uc.coupon.code,
        title: uc.coupon.title,
        description: uc.coupon.description,
        scope: uc.coupon.scope,
        discountType: uc.coupon.discountType,
        discountValue: uc.coupon.discountValue,
        minSpend: uc.coupon.minSpend,
        branchIds: uc.coupon.branches.map((branch) => branch.branchId),
        packageIds: uc.coupon.packageIds,
        validFrom: uc.coupon.validFrom.toISOString(),
        validUntil: uc.coupon.validUntil.toISOString(),
      },
    })),
  });
});

// Claim a coupon by code
couponRoutes.post('/claim', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { code } = z.object({ code: z.string().min(1) }).parse(body);

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      branches: {
        select: { branchId: true },
      },
    },
  });

  if (!coupon) {
    return c.json({ message: 'Invalid coupon code' }, 404);
  }

  if (coupon.status !== 'active') {
    return c.json({ message: 'Coupon is not active' }, 400);
  }

  if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) {
    return c.json({ message: 'Coupon is not valid at this time' }, 400);
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return c.json({ message: 'Coupon usage limit reached' }, 400);
  }

  const existing = await prisma.userCoupon.findUnique({
    where: { userId_couponId: { userId, couponId: coupon.id } },
  });

  if (existing) {
    return c.json({ message: 'Coupon already claimed' }, 400);
  }

  const userCoupon = await prisma.userCoupon.create({
    data: { userId, couponId: coupon.id },
    include: { coupon: true },
  });

  return c.json({ data: userCoupon }, 201);
});

// Use a coupon
couponRoutes.post('/:id/use', async (c) => {
  const userId = c.get('userId');
  const couponId = c.req.param('id');
  const body = await c.req.json();
  const { sessionId } = z.object({ sessionId: z.string() }).parse(body);

  const userCoupon = await prisma.userCoupon.findFirst({
    where: { id: couponId, userId, status: 'claimed' },
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
    return c.json({ message: 'Coupon not found or already used' }, 400);
  }

  const session = await prisma.washSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return c.json({ message: 'Session not found' }, 404);
  }

  const allowedBranchIds = userCoupon.coupon.branches.map((branch) => branch.branchId);
  const isAllowedBranch =
    userCoupon.coupon.scope === 'all_branches' || allowedBranchIds.includes(session.branchId);

  if (!isAllowedBranch) {
    return c.json({ message: 'Coupon is not valid for this branch' }, 400);
  }

  const discountAmount =
    userCoupon.coupon.discountType === 'percent'
      ? Math.floor((session.subtotalPrice || session.totalPrice) * (userCoupon.coupon.discountValue / 100))
      : userCoupon.coupon.discountValue;

  const [updated] = await prisma.$transaction([
    prisma.userCoupon.update({
      where: { id: userCoupon.id },
      data: { status: 'redeemed', redeemedAt: new Date() },
      include: { coupon: true },
    }),
    prisma.couponRedemption.create({
      data: {
        userCouponId: userCoupon.id,
        couponId: userCoupon.couponId,
        userId,
        branchId: session.branchId,
        sessionId: session.id,
        discountAmount,
      },
    }),
    prisma.coupon.update({
      where: { id: userCoupon.couponId },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.washSession.update({
      where: { id: session.id },
      data: {
        discountAmount,
        totalPrice: Math.max(session.totalPrice - discountAmount, 0),
      },
    }),
  ]);

  return c.json({ data: updated });
});
