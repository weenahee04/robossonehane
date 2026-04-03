import { createClerkClient, verifyToken } from '@clerk/backend';

function getRequiredClerkSecret() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured');
  }
  return secretKey;
}

export function isClerkAuthEnabled() {
  return process.env.CLERK_AUTH_MODE === 'clerk';
}

function getAuthorizedParties() {
  const allowed = new Set<string>();

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    for (const rawOrigin of corsOrigin.split(',')) {
      const origin = rawOrigin.trim();
      if (origin && origin !== '*') {
        allowed.add(origin);
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed.size > 0 ? Array.from(allowed) : undefined;
}

export async function verifyClerkSessionToken(token: string) {
  return verifyToken(token, {
    jwtKey: process.env.CLERK_JWT_KEY,
    secretKey: getRequiredClerkSecret(),
    authorizedParties: getAuthorizedParties(),
  });
}

export async function getClerkUser(userId: string) {
  const clerkClient = createClerkClient({
    secretKey: getRequiredClerkSecret(),
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  return clerkClient.users.getUser(userId);
}
