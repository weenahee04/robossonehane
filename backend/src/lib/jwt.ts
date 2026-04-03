import type { AdminRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

export interface TokenPayload {
  subjectId: string;
  subjectType: 'customer' | 'admin';
  type: 'access' | 'refresh';
  role?: AdminRole;
  branchIds?: string[];
}

function signToken(payload: TokenPayload, secret: string, expiresIn: jwt.SignOptions['expiresIn']) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function signAccessToken(userId: string): string {
  return signToken(
    {
      subjectId: userId,
      subjectType: 'customer',
      type: 'access',
    },
    JWT_SECRET,
    '1h'
  );
}

export function signRefreshToken(userId: string): string {
  return signToken(
    {
      subjectId: userId,
      subjectType: 'customer',
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    '30d'
  );
}

export function signAdminAccessToken(adminId: string, role: AdminRole, branchIds: string[]): string {
  return signToken(
    {
      subjectId: adminId,
      subjectType: 'admin',
      type: 'access',
      role,
      branchIds,
    },
    JWT_SECRET,
    '8h'
  );
}

export function signAdminRefreshToken(adminId: string, role: AdminRole, branchIds: string[]): string {
  return signToken(
    {
      subjectId: adminId,
      subjectType: 'admin',
      type: 'refresh',
      role,
      branchIds,
    },
    JWT_REFRESH_SECRET,
    '30d'
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
