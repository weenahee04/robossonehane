import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';

export const promotionRoutes = new Hono();

promotionRoutes.get('/', async (c) => {
  const branchId = c.req.query('branchId');

  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  let filtered = promotions;
  if (branchId) {
    filtered = promotions.filter((p) => {
      return p.branchIds.length === 0 || p.branchIds.includes(branchId);
    });
  }

  return c.json({
    data: filtered.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image: p.image,
      branchIds: p.branchIds,
      gradient: p.gradient,
      conditions: p.conditions,
      validFrom: p.validFrom.toISOString(),
      validUntil: p.validUntil.toISOString(),
    })),
  });
});

promotionRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const promotion = await prisma.promotion.findUnique({ where: { id } });

  if (!promotion) {
    return c.json({ message: 'Promotion not found' }, 404);
  }

  return c.json({ data: promotion });
});
