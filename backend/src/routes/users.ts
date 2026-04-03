import { Hono } from 'hono';
import { z } from 'zod';
import { mapCustomerUser } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const userRoutes = new Hono<AppEnv>();

userRoutes.use('*', requireAuth);

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  avatarUrl: z.string().url().optional(),
});

const updateSettingsSchema = z.object({
  notificationGeneral: z.boolean().optional(),
  notificationWash: z.boolean().optional(),
  notificationCoupon: z.boolean().optional(),
  notificationPoints: z.boolean().optional(),
  locale: z.enum(['th', 'en']).optional(),
});

const accountActionSchema = z.object({
  action: z.enum(['deactivate', 'delete']),
});

function mapUserSettings(settings: {
  id: string;
  userId: string;
  notificationGeneral: boolean;
  notificationWash: boolean;
  notificationCoupon: boolean;
  notificationPoints: boolean;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: settings.id,
    userId: settings.userId,
    notificationGeneral: settings.notificationGeneral,
    notificationWash: settings.notificationWash,
    notificationCoupon: settings.notificationCoupon,
    notificationPoints: settings.notificationPoints,
    locale: settings.locale,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

userRoutes.patch('/me', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = updateProfileSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
    },
  });

  return c.json({ data: mapCustomerUser(user) });
});

userRoutes.get('/me/settings', async (c) => {
  const userId = c.get('userId');

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  return c.json({ data: mapUserSettings(settings) });
});

userRoutes.patch('/me/settings', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = updateSettingsSchema.parse(body);

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      ...data,
    },
  });

  return c.json({ data: mapUserSettings(settings) });
});

userRoutes.post('/me/account-action', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { action } = accountActionSchema.parse(body);

  if (action === 'deactivate') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    return c.json({
      data: {
        action,
        completed: true,
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lineUserId: true },
  });

  if (!user) {
    return c.json({ message: 'User not found' }, 404);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lineUserId: `deleted:${userId}:${Date.now()}:${user.lineUserId}`,
      displayName: 'Deleted Account',
      avatarUrl: null,
      email: null,
      phone: null,
      isActive: false,
      deactivatedAt: new Date(),
      deletedAt: new Date(),
    },
  });

  return c.json({
    data: {
      action,
      completed: true,
    },
  });
});

userRoutes.get('/me/stats', async (c) => {
  const userId = c.get('userId');

  const [user, sessionCount, totalSpent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { wallet: true } }),
    prisma.washSession.count({
      where: { userId, status: 'completed' },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'confirmed',
      },
      _sum: { amount: true },
    }),
  ]);

  return c.json({
    data: {
      totalWashes: sessionCount,
      totalSpent: totalSpent._sum.amount || 0,
      totalPoints: user?.wallet?.balance ?? user?.totalPoints ?? 0,
      tier: user?.tier || 'bronze',
    },
  });
});
