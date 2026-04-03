import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';

export const packageRoutes = new Hono();

packageRoutes.get('/', async (c) => {
  const packages = await prisma.washPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return c.json({
    data: packages.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      vehicleType: p.vehicleType,
      prices: { S: p.priceS, M: p.priceM, L: p.priceL },
      steps: p.steps,
      stepDuration: p.stepDuration,
      features: p.features,
      image: p.image,
      isActive: p.isActive,
    })),
  });
});

packageRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const pkg = await prisma.washPackage.findUnique({ where: { id } });

  if (!pkg) {
    return c.json({ message: 'Package not found' }, 404);
  }

  return c.json({
    data: {
      id: pkg.id,
      code: pkg.code,
      name: pkg.name,
      description: pkg.description,
      vehicleType: pkg.vehicleType,
      prices: { S: pkg.priceS, M: pkg.priceM, L: pkg.priceL },
      steps: pkg.steps,
      stepDuration: pkg.stepDuration,
      features: pkg.features,
      image: pkg.image,
      isActive: pkg.isActive,
    },
  });
});
