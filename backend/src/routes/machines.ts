import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../lib/types.js';
import { handleMachineEvent } from '../services/machine-events.js';

export const machineRoutes = new Hono<AppEnv>();

const machineEventSchema = z.object({
  type: z.enum([
    'heartbeat',
    'reserved',
    'washing_started',
    'progress_updated',
    'completed',
    'failed',
    'maintenance',
    'offline',
  ]),
  machineId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  espDeviceId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  machineStatus: z.enum(['idle', 'reserved', 'washing', 'maintenance', 'offline']).optional(),
  currentStep: z.number().int().min(0).optional(),
  progress: z.number().min(0).max(100).optional(),
  firmwareVersion: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  errorCode: z.string().min(1).optional(),
  occurredAt: z.string().datetime().optional(),
});

function ensureMachineEventSecret(providedSecret: string | undefined) {
  const expectedSecret = process.env.MACHINE_EVENT_SECRET;

  if (!expectedSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Machine event secret is not configured');
    }
    return;
  }

  if (providedSecret !== expectedSecret) {
    throw new Error('Invalid machine event secret');
  }
}

machineRoutes.post('/events', async (c) => {
  try {
    ensureMachineEventSecret(c.req.header('x-machine-event-secret'));
    const body = await c.req.json();
    const payload = machineEventSchema.parse(body);
    const result = await handleMachineEvent(
      {
        ...payload,
        rawPayload: body,
      },
      'api'
    );
    return c.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process machine event';
    const status = message.includes('secret') ? 401 : message.includes('not found') ? 404 : 400;
    return c.json({ message }, status);
  }
});

machineRoutes.post('/heartbeat', async (c) => {
  try {
    ensureMachineEventSecret(c.req.header('x-machine-event-secret'));
    const body = await c.req.json();
    const payload = z
      .object({
        machineId: z.string().min(1).optional(),
        branchId: z.string().min(1).optional(),
        espDeviceId: z.string().min(1).optional(),
        firmwareVersion: z.string().min(1).optional(),
        occurredAt: z.string().datetime().optional(),
      })
      .parse(body);

    const result = await handleMachineEvent(
      {
        type: 'heartbeat',
        ...payload,
        rawPayload: body,
      },
      'api'
    );

    return c.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process heartbeat';
    const status = message.includes('secret') ? 401 : message.includes('not found') ? 404 : 400;
    return c.json({ message }, status);
  }
});
