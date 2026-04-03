import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const notificationRoutes = new Hono<AppEnv>();
notificationRoutes.use('*', requireAuth);

// Get notifications
notificationRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);
  const category = c.req.query('category');

  const where: Record<string, unknown> = { userId };
  if (category) where.category = category;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return c.json({ data: notifications, total, page, limit, unreadCount });
});

// Mark as read
notificationRoutes.patch('/:id/read', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });

  return c.json({ data: { message: 'Marked as read' } });
});

// Mark all as read
notificationRoutes.patch('/read-all', async (c) => {
  const userId = c.get('userId');

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return c.json({ data: { message: 'All marked as read' } });
});
