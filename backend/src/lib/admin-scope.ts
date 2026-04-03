import type { AdminRole, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function getAdminWithScopes(adminId: string) {
  return prisma.adminUser.findUnique({
    where: { id: adminId },
    include: {
      branchScopes: {
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });
}

export function getScopedBranchIds(
  role: AdminRole,
  branchScopes: Array<{ branchId: string }>
): string[] {
  return role === 'hq_admin' ? [] : branchScopes.map((scope) => scope.branchId);
}

export function getBranchWhereClause(
  role: AdminRole,
  branchScopes: Array<{ branchId: string }>
): Prisma.BranchWhereInput {
  if (role === 'hq_admin') {
    return {};
  }

  const branchIds = branchScopes.map((scope) => scope.branchId);
  return { id: { in: branchIds } };
}

export function getSessionBranchFilter(
  role: AdminRole,
  branchScopes: Array<{ branchId: string }>
): Prisma.WashSessionWhereInput {
  if (role === 'hq_admin') {
    return {};
  }

  const branchIds = branchScopes.map((scope) => scope.branchId);
  return { branchId: { in: branchIds } };
}

export function getMachineBranchFilter(
  role: AdminRole,
  branchScopes: Array<{ branchId: string }>
): Prisma.MachineWhereInput {
  if (role === 'hq_admin') {
    return {};
  }

  const branchIds = branchScopes.map((scope) => scope.branchId);
  return { branchId: { in: branchIds } };
}

export function getPaymentBranchFilter(
  role: AdminRole,
  branchScopes: Array<{ branchId: string }>
): Prisma.PaymentWhereInput {
  if (role === 'hq_admin') {
    return {};
  }

  const branchIds = branchScopes.map((scope) => scope.branchId);
  return { branchId: { in: branchIds } };
}
