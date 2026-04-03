import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';
import {
  confirmPayment,
  createPaymentForSession,
  handlePaymentWebhook,
  reconcilePayment,
} from '../services/payment-flow.js';
import { getPaymentProvider } from '../services/payment-provider.js';

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.post('/webhook/provider', async (c) => {
  const rawBody = await c.req.text();
  const provider = getPaymentProvider();

  try {
    const signal = await provider.parseWebhook({
      rawBody,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
    });
    const session = await handlePaymentWebhook(signal);
    return c.json({ ok: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process webhook';
    const status =
      message === 'Payment not found'
        ? 404
        : message.toLowerCase().includes('signature') || message.toLowerCase().includes('secret')
          ? 401
          : 400;
    return c.json({ message }, status);
  }
});

paymentRoutes.use('*', requireAuth);

paymentRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { sessionId } = z.object({ sessionId: z.string().min(1) }).parse(body);

  try {
    const session = await createPaymentForSession({ sessionId, userId });
    return c.json({ data: session }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    const status = message === 'Session not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

paymentRoutes.post('/:id/confirm', async (c) => {
  const userId = c.get('userId');
  const paymentId = c.req.param('id');

  try {
    const session = await confirmPayment({ paymentId, userId });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    const status = message === 'Payment not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

paymentRoutes.post('/:id/verify', async (c) => {
  const userId = c.get('userId');
  const paymentId = c.req.param('id');
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
      userId,
      note: payload.note ?? 'manual provider verification requested',
      providerRef: payload.providerRef,
      forceProviderLookup: true,
    });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    const status = message === 'Payment not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});

paymentRoutes.post('/:id/reconcile', async (c) => {
  const userId = c.get('userId');
  const paymentId = c.req.param('id');
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
      userId,
      ...payload,
    });
    return c.json({ data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile payment';
    const status = message === 'Payment not found' ? 404 : 400;
    return c.json({ message }, status);
  }
});
