import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const pointsRoutes = new Hono<AppEnv>();
pointsRoutes.use('*', requireAuth);

// Get points balance
pointsRoutes.get('/balance', async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      wallet: {
        select: {
          balance: true,
          lifetimeEarned: true,
          lifetimeRedeemed: true,
        },
      },
    },
  });

  if (!user) return c.json({ message: 'User not found' }, 404);

  return c.json({
    data: {
      balance: user.wallet?.balance ?? 0,
      tier: user.tier,
      lifetimeEarned: user.wallet?.lifetimeEarned ?? 0,
      lifetimeRedeemed: user.wallet?.lifetimeRedeemed ?? 0,
    },
  });
});

// Get points history
pointsRoutes.get('/history', async (c) => {
  const userId = c.get('userId');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);

  const [transactions, total] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pointsTransaction.count({ where: { userId } }),
  ]);

  return c.json({ data: transactions, total, page, limit });
});

pointsRoutes.get('/rewards', async (c) => {
  const branchId = c.req.query('branchId');

  const rewards = await prisma.rewardCatalog.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const filtered = branchId
    ? rewards.filter((reward) => reward.branchIds.length === 0 || reward.branchIds.includes(branchId))
    : rewards;

  return c.json({
    data: filtered.map((reward) => ({
      id: reward.id,
      code: reward.code,
      name: reward.name,
      description: reward.description,
      points: reward.pointsCost,
      category: reward.category,
      tag: reward.tag,
      icon: reward.icon,
      iconBg: reward.iconBg,
      stock: reward.stock,
      branchIds: reward.branchIds,
    })),
  });
});

// Redeem points
pointsRoutes.post('/redeem', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { amount, rewardId } = z
    .object({ amount: z.number().positive(), rewardId: z.string() })
    .parse(body);

  const [user, reward] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    }),
    prisma.rewardCatalog.findUnique({
      where: { id: rewardId },
    }),
  ]);
  if (!user || !user.wallet) return c.json({ message: 'User wallet not found' }, 404);
  if (!reward || !reward.isActive) return c.json({ message: 'Reward not found' }, 404);
  if (reward.pointsCost !== amount) return c.json({ message: 'Reward points cost mismatch' }, 400);
  if (reward.stock != null && reward.stock <= 0) return c.json({ message: 'Reward out of stock' }, 400);

  if (user.wallet.balance < amount) {
    return c.json({ message: 'Insufficient points' }, 400);
  }

  const balanceAfter = user.wallet.balance - amount;

  const [transaction] = await prisma.$transaction([
    prisma.pointsTransaction.create({
      data: {
        walletId: user.wallet.id,
        userId,
        type: 'redeem',
        amount: -amount,
        balanceAfter,
        description: `Redeemed ${amount} points for reward ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          rewardCode: reward.code,
          rewardName: reward.name,
        },
      },
    }),
    prisma.pointWallet.update({
      where: { id: user.wallet.id },
      data: {
        balance: balanceAfter,
        lifetimeRedeemed: { increment: amount },
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { totalPoints: balanceAfter },
    }),
    ...(reward.stock != null
      ? [
          prisma.rewardCatalog.update({
            where: { id: reward.id },
            data: {
              stock: {
                decrement: 1,
              },
            },
          }),
        ]
      : []),
  ]);

  return c.json({ data: transaction });
});
