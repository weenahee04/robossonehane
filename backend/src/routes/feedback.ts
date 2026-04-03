import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const feedbackRoutes = new Hono<AppEnv>();
feedbackRoutes.use('*', requireAuth);

const feedbackSchema = z.object({
  type: z.string().min(1),
  message: z.string().min(1).max(2000),
});

// Submit feedback
feedbackRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = feedbackSchema.parse(body);
  const latestSession = await prisma.washSession.findFirst({
    where: { userId },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      branchId: true,
    },
  });

  const feedback = await prisma.feedback.create({
    data: {
      userId,
      branchId: latestSession?.branchId ?? null,
      sessionId: latestSession?.id ?? null,
      ...data,
    },
  });

  return c.json({ data: feedback }, 201);
});

// Get user's feedback history
feedbackRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const feedback = await prisma.feedback.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ data: feedback });
});
