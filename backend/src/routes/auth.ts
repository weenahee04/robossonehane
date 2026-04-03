import { Hono } from 'hono';
import { z } from 'zod';
import { getClerkUser, isClerkAuthEnabled, verifyClerkSessionToken } from '../lib/clerk.js';
import { getRuntimeConfig } from '../lib/config.js';
import { mapCustomerUser } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import type { AppEnv } from '../lib/types.js';

export const authRoutes = new Hono<AppEnv>();
const runtimeConfig = getRuntimeConfig();
const authRateLimit = createRateLimitMiddleware({
  bucket: 'customer-auth',
  windowMs: runtimeConfig.authRateLimitWindowMs,
  max: runtimeConfig.authRateLimitMax,
});

const lineLoginSchema = z.object({
  accessToken: z.string().min(1),
});

const lineAuthorizeSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string().min(8).max(256),
});

const lineCallbackSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const clerkExchangeSchema = z.object({
  token: z.string().min(1),
});

async function ensureCustomerSidecars(userId: string, totalPoints = 0) {
  await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const existingStamp = await prisma.stamp.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!existingStamp) {
    await prisma.stamp.create({
      data: { userId, targetCount: 10 },
    });
  }

  await prisma.pointWallet.upsert({
    where: { userId },
    update: {
      balance: totalPoints,
      lifetimeEarned: Math.max(totalPoints, 0),
    },
    create: {
      userId,
      balance: totalPoints,
      lifetimeEarned: Math.max(totalPoints, 0),
    },
  });

  await prisma.piggyBank.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function upsertCustomerFromLineProfile(profile: {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}) {
  let user = await prisma.user.findUnique({
    where: { lineUserId: profile.userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        avatarUrl: profile.pictureUrl || null,
        settings: {
          create: {},
        },
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: profile.displayName,
        avatarUrl: profile.pictureUrl || user.avatarUrl,
        isActive: true,
        deactivatedAt: null,
      },
    });
  }

  await ensureCustomerSidecars(user.id, user.totalPoints);
  return user;
}

function buildDisplayName(clerkUser: any) {
  const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();
  return (
    fullName ||
    clerkUser.username ||
    clerkUser.primaryEmailAddress?.emailAddress ||
    'ROBOSS Customer'
  );
}

function resolvePrimaryEmail(clerkUser: any) {
  return (
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses?.find((item: any) => typeof item?.emailAddress === 'string')?.emailAddress ??
    null
  );
}

function resolveLineUserIdFromClerk(clerkUser: any) {
  const lineAccount = clerkUser.externalAccounts?.find((account: any) => {
    const provider = String(account?.provider ?? account?.providerName ?? '').toLowerCase();
    return provider.includes('line');
  });

  return (
    lineAccount?.providerUserId ??
    lineAccount?.externalId ??
    lineAccount?.username ??
    `clerk:${clerkUser.id}`
  );
}

async function upsertCustomerFromClerkUser(clerkUser: any) {
  const lineUserId = resolveLineUserIdFromClerk(clerkUser);
  const email = resolvePrimaryEmail(clerkUser);
  const phone = clerkUser.primaryPhoneNumber?.phoneNumber ?? null;

  let user = await prisma.user.findUnique({
    where: { lineUserId },
  });

  if (!user && email) {
    user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        lineUserId,
        displayName: buildDisplayName(clerkUser),
        avatarUrl: clerkUser.imageUrl ?? null,
        email,
        phone,
        settings: {
          create: {},
        },
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: buildDisplayName(clerkUser),
        avatarUrl: clerkUser.imageUrl ?? user.avatarUrl,
        email: email ?? user.email,
        phone: phone ?? user.phone,
        isActive: true,
        deactivatedAt: null,
      },
    });
  }

  await ensureCustomerSidecars(user.id, user.totalPoints);
  return user;
}

function createCustomerAuthResponse(user: Awaited<ReturnType<typeof upsertCustomerFromLineProfile>>) {
  return {
    user: mapCustomerUser(user),
    tokens: {
      accessToken: signAccessToken(user.id),
      refreshToken: signRefreshToken(user.id),
    },
  };
}

async function exchangeLineCodeForAccessToken(code: string, redirectUri: string) {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    throw new Error('LINE login is not configured');
  }

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return null;
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  return tokenJson.access_token ?? null;
}

authRoutes.get('/config', (c) => {
  const lineConfigured = Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
  const clerkEnabled =
    isClerkAuthEnabled() &&
    Boolean(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const customerAuthMode = clerkEnabled ? 'clerk' : 'legacy';

  return c.json({
    data: {
      devLoginEnabled: customerAuthMode === 'legacy' ? runtimeConfig.enableDevLogin : false,
      lineLoginEnabled: customerAuthMode === 'clerk' ? clerkEnabled : lineConfigured,
      clerkEnabled,
      customerAuthMode,
    },
  });
});

authRoutes.get('/line/url', async (c) => {
  const { redirectUri, state } = lineAuthorizeSchema.parse({
    redirectUri: c.req.query('redirectUri'),
    state: c.req.query('state'),
  });

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return c.json({ message: 'LINE login is not configured' }, 503);
  }

  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', channelId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile openid');

  return c.json({ data: { url: url.toString() } });
});

authRoutes.use('/line', authRateLimit);
authRoutes.post('/line', async (c) => {
  const body = await c.req.json();
  const { accessToken } = lineLoginSchema.parse(body);

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return c.json({ message: 'Invalid LINE access token' }, 401);
  }

  const profile = (await profileRes.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
  const user = await upsertCustomerFromLineProfile(profile);
  return c.json({ data: createCustomerAuthResponse(user) });
});

authRoutes.use('/line/callback', authRateLimit);
authRoutes.post('/line/callback', async (c) => {
  const body = await c.req.json();
  const { code, redirectUri } = lineCallbackSchema.parse(body);

  const accessToken = await exchangeLineCodeForAccessToken(code, redirectUri);
  if (!accessToken) {
    return c.json({ message: 'Unable to complete LINE login' }, 401);
  }

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return c.json({ message: 'Unable to load LINE profile' }, 401);
  }

  const profile = (await profileRes.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };

  const user = await upsertCustomerFromLineProfile(profile);
  return c.json({ data: createCustomerAuthResponse(user) });
});

authRoutes.use('/clerk/exchange', authRateLimit);
authRoutes.post('/clerk/exchange', async (c) => {
  if (!isClerkAuthEnabled()) {
    return c.json({ message: 'Clerk auth is not enabled' }, 503);
  }

  const body = await c.req.json();
  const { token } = clerkExchangeSchema.parse(body);

  try {
    const payload = await verifyClerkSessionToken(token);
    if (!payload?.sub) {
      return c.json({ message: 'Invalid Clerk token' }, 401);
    }

    const clerkUser = await getClerkUser(payload.sub);
    const user = await upsertCustomerFromClerkUser(clerkUser as any);
    return c.json({ data: createCustomerAuthResponse(user) });
  } catch (error) {
    console.error('[clerk-exchange] failed', error);
    const message =
      process.env.NODE_ENV === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unable to exchange Clerk session'
        : 'Unable to exchange Clerk session';
    return c.json({ message }, 401);
  }
});

authRoutes.use('/dev-login', authRateLimit);
authRoutes.post('/dev-login', async (c) => {
  if (!runtimeConfig.enableDevLogin) {
    return c.json({ message: 'Not available in production' }, 403);
  }

  const body = await c.req.json();
  const lineUserId = body.lineUserId || 'dev_user_001';

  let user = await prisma.user.findUnique({
    where: { lineUserId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        lineUserId,
        displayName: 'Dev User',
        avatarUrl: null,
        tier: 'gold',
        totalPoints: 1250,
        totalWashes: 14,
        settings: {
          create: {},
        },
      },
    });
  }

  await ensureCustomerSidecars(user.id, user.totalPoints);

  return c.json({ data: createCustomerAuthResponse(user) });
});

authRoutes.use('/refresh', authRateLimit);
authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = refreshSchema.parse(body);

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.subjectType !== 'customer' || payload.type !== 'refresh') {
      return c.json({ message: 'Invalid refresh token' }, 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.subjectId } });
    if (!user) {
      return c.json({ message: 'User not found' }, 404);
    }

    return c.json({
      data: {
        user: mapCustomerUser(user),
        tokens: {
          accessToken: signAccessToken(payload.subjectId),
          refreshToken: signRefreshToken(payload.subjectId),
        },
      },
    });
  } catch {
    return c.json({ message: 'Invalid refresh token' }, 401);
  }
});

authRoutes.get('/me', requireAuth, async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return c.json({ message: 'User not found' }, 404);
  }

  return c.json({ data: mapCustomerUser(user) });
});

authRoutes.post('/logout', requireAuth, async (c) => {
  return c.json({ data: { message: 'Logged out successfully' } });
});
