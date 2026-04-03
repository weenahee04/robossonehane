import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpired(now: number) {
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
}

export function createRateLimitMiddleware(options: {
  bucket: string;
  windowMs: number;
  max: number;
}) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const now = Date.now();
    cleanupExpired(now);

    const forwardedFor = c.req.header('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const key = `${options.bucket}:${ip}`;
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      await next();
      return;
    }

    if (current.count >= options.max) {
      c.header('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return c.json({ message: 'Too many requests' }, 429);
    }

    current.count += 1;
    rateLimitStore.set(key, current);
    await next();
  });
}
