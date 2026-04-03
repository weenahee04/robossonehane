import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const vehicleRoutes = new Hono<AppEnv>();
vehicleRoutes.use('*', requireAuth);

vehicleRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ data: vehicles });
});

const createVehicleSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  plate: z.string().min(2),
  province: z.string().min(1),
  color: z.string().min(1),
  size: z.enum(['S', 'M', 'L']),
});

vehicleRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const data = createVehicleSchema.parse(body);

  const vehicle = await prisma.vehicle.create({
    data: { userId, ...data },
  });

  return c.json({ data: vehicle }, 201);
});

vehicleRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const vehicleId = c.req.param('id');

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
  });

  if (!vehicle) {
    return c.json({ message: 'Vehicle not found' }, 404);
  }

  await prisma.vehicle.delete({ where: { id: vehicleId } });
  return c.json({ data: { message: 'Vehicle deleted' } });
});
