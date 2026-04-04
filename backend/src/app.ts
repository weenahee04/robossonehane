import crypto from 'node:crypto';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { adminRoutes } from './routes/admin.js';
import { adminEngagementRoutes } from './routes/admin-engagement.js';
import { authRoutes } from './routes/auth.js';
import { branchRoutes } from './routes/branches.js';
import { couponRoutes } from './routes/coupons.js';
import { feedbackRoutes } from './routes/feedback.js';
import { machineRoutes } from './routes/machines.js';
import { notificationRoutes } from './routes/notifications.js';
import { packageRoutes } from './routes/packages.js';
import { paymentRoutes } from './routes/payments.js';
import { pointsRoutes } from './routes/points.js';
import { promotionRoutes } from './routes/promotions.js';
import { sessionRoutes } from './routes/sessions.js';
import { stampRoutes } from './routes/stamps.js';
import { userRoutes } from './routes/users.js';
import { vehicleRoutes } from './routes/vehicles.js';
import { getRuntimeConfig, validateRuntimeEnv } from './lib/config.js';

function matchesAllowedOrigin(allowedOrigin: string, origin: string) {
  if (allowedOrigin === 'https://*.vercel.app') {
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  }

  return allowedOrigin === origin;
}

export function createApp() {
  const app = new Hono();
  const runtimeConfig = getRuntimeConfig();

  const validationIssues = validateRuntimeEnv(process.env);
  validationIssues
    .filter((issue) => issue.level === 'warning')
    .forEach((issue) => {
      console.warn(`[config warning] ${issue.key}: ${issue.message}`);
    });

  app.use('*', logger());
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    c.header('x-request-id', requestId);
    c.header('x-content-type-options', 'nosniff');
    c.header('x-frame-options', 'DENY');
    c.header('referrer-policy', 'no-referrer');
    c.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    c.header('cache-control', 'no-store');
    if (runtimeConfig.isProduction) {
      c.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
    }
    await next();
  });
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return runtimeConfig.corsOrigins[0];
        return runtimeConfig.corsOrigins.some((allowedOrigin) => matchesAllowedOrigin(allowedOrigin, origin))
          ? origin
          : runtimeConfig.corsOrigins[0];
      },
      credentials: true,
    })
  );

  app.get('/', (c) =>
    c.json({ message: 'ROBOSS Car Wash API', version: '2.0.0' })
  );
  app.get('/health', (c) => c.json({ ok: true, service: 'roboss-backend', env: runtimeConfig.nodeEnv }));
  app.get('/ready', (c) => {
    const errors = validationIssues.filter((issue) => issue.level === 'error');
    return c.json(
      {
        ok: errors.length === 0,
        env: runtimeConfig.nodeEnv,
        issues: validationIssues,
      },
      errors.length === 0 ? 200 : 503
    );
  });

  app.route('/api/auth', authRoutes);
  app.route('/api/users', userRoutes);
  app.route('/api/branches', branchRoutes);
  app.route('/api/packages', packageRoutes);
  app.route('/api/sessions', sessionRoutes);
  app.route('/api/payments', paymentRoutes);
  app.route('/api/points', pointsRoutes);
  app.route('/api/coupons', couponRoutes);
  app.route('/api/stamps', stampRoutes);
  app.route('/api/notifications', notificationRoutes);
  app.route('/api/feedback', feedbackRoutes);
  app.route('/api/vehicles', vehicleRoutes);
  app.route('/api/promotions', promotionRoutes);
  app.route('/api/admin', adminRoutes);
  app.route('/api/admin', adminEngagementRoutes);
  app.route('/api/machines', machineRoutes);

  app.notFound((c) => c.json({ message: 'Not Found' }, 404));

  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json(
      { message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message },
      500
    );
  });

  return app;
}
