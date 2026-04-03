import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import type { AppEnv } from '../lib/types.js';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    if (payload.subjectType !== 'customer' || payload.type !== 'access') {
      return c.json({ message: 'Customer access required' }, 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.subjectId },
      select: { id: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return c.json({ message: 'Account is unavailable' }, 403);
    }

    c.set('userId', payload.subjectId);
    await next();
  } catch {
    return c.json({ message: 'Invalid or expired token' }, 401);
  }
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    if (payload.subjectType !== 'admin' || payload.type !== 'access') {
      return c.json({ message: 'Admin access required' }, 403);
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.subjectId },
      include: {
        branchScopes: {
          select: { branchId: true },
        },
      },
    });

    if (!admin || !admin.isActive) {
      return c.json({ message: 'Admin access required' }, 403);
    }

    c.set('adminId', admin.id);
    c.set('adminRole', admin.role);
    c.set(
      'adminBranchIds',
      admin.role === 'hq_admin' ? [] : admin.branchScopes.map((scope) => scope.branchId)
    );
    await next();
  } catch {
    return c.json({ message: 'Invalid or expired token' }, 401);
  }
});
