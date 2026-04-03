import { Hono } from 'hono';
import { z } from 'zod';
import { getRuntimeConfig } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';
import { confirmPayment } from '../services/payment-flow.js';
import { getSessionDetail } from '../services/session-details.js';
import { mapCustomerSession } from '../lib/mappers.js';
import {
  cancelWashSession,
  completeWashSession,
  createWashSession,
  startWashSession,
  updateWashProgress,
} from '../services/wash-flow.js';

export const sessionRoutes = new Hono<AppEnv>();
const runtimeConfig = getRuntimeConfig();
sessionRoutes.use('*', requireAuth);

const createSessionSchema = z.object({
  branchId: z.string().min(1),
  machineId: z.string().min(1),
  packageId: z.string().min(1),
  carSize: z.enum(['S', 'M', 'L']),
  addons: z.array(z.string()).default([]),
  totalPrice: z.number().positive().optional(),
  couponId: z.string().min(1).optional(),
});

sessionRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = createSessionSchema.parse(body);

  try {
    const session = await createWashSession({ userId, ...data });
    return c.json({ data: session }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    const status = message === 'Package not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

sessionRoutes.post('/:id/start', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');

  try {
    const session = await startWashSession({ sessionId, userId });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start wash';
    const status = message === 'Session not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

sessionRoutes.post('/:id/confirm-payment', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');

  try {
    const session = await confirmPayment({ sessionId, userId });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    const status = ['Payment not found', 'Session not found'].includes(message) ? 404 : 400;
    return c.json({ message }, status);
  }
});

sessionRoutes.patch('/:id/progress', async (c) => {
  if (runtimeConfig.isProduction) {
    return c.json({ message: 'Progress updates must come from machine events in production' }, 403);
  }

  const sessionId = c.req.param('id');
  const body = await c.req.json();
  const { currentStep, progress, machineStatus } = z
    .object({
      currentStep: z.number().int().min(0).optional(),
      progress: z.number().min(0).max(100).optional(),
      machineStatus: z.enum(['idle', 'reserved', 'washing', 'maintenance', 'offline']).optional(),
    })
    .parse(body);

  try {
    const updated = await updateWashProgress({
      sessionId,
      currentStep,
      progress,
      machineStatus,
    });
    return c.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update progress';
    return c.json({ message }, 404);
  }
});

sessionRoutes.post('/:id/complete', async (c) => {
  if (runtimeConfig.isProduction) {
    return c.json({ message: 'Session completion must come from machine events in production' }, 403);
  }

  const sessionId = c.req.param('id');

  try {
    const session = await completeWashSession(sessionId);
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete session';
    return c.json({ message }, 404);
  }
});

sessionRoutes.post('/:id/cancel', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');

  try {
    const session = await cancelWashSession({ sessionId, userId });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel session';
    const status = message === 'Session not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

sessionRoutes.post('/:id/rate', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');
  const body = await c.req.json();
  const { rating, reviewText } = z
    .object({ rating: z.number().min(1).max(5), reviewText: z.string().optional() })
    .parse(body);

  const session = await prisma.washSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return c.json({ message: 'Session not found' }, 404);
  }

  if (session.status !== 'completed') {
    return c.json({ message: 'Session is not completed yet' }, 400);
  }

  await prisma.washSession.update({
    where: { id: sessionId },
    data: { rating, reviewText },
  });

  const detail = await getSessionDetail(sessionId);
  return c.json({ data: detail });
});

sessionRoutes.get('/history', async (c) => {
  const userId = c.get('userId');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);

  const [sessions, total] = await Promise.all([
    prisma.washSession.findMany({
      where: { userId },
      include: {
        branch: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true, type: true, status: true, espDeviceId: true } },
        package: { select: { id: true, name: true, description: true, vehicleType: true, steps: true, stepDuration: true, image: true } },
        payment: {
          select: {
            id: true,
            sessionId: true,
            userId: true,
            branchId: true,
            method: true,
            status: true,
            currency: true,
            amount: true,
            reference: true,
            expiresAt: true,
            confirmedAt: true,
            qrPayload: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.washSession.count({ where: { userId } }),
  ]);

  return c.json({
    data: sessions.map((session) => mapCustomerSession(session)),
    total,
    page,
    limit,
  });
});

sessionRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const sessionId = c.req.param('id');

  const session = await prisma.washSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return c.json({ message: 'Session not found' }, 404);
  }

  const detail = await getSessionDetail(session.id);
  return c.json({ data: detail });
});
