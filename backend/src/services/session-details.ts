import { mapCustomerSession } from '../lib/mappers.js';
import { prisma } from '../lib/prisma.js';

export async function getSessionDetail(sessionId: string) {
  const session = await prisma.washSession.findUnique({
    where: { id: sessionId },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          shortName: true,
          promptPayId: true,
          promptPayName: true,
        },
      },
      machine: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          espDeviceId: true,
        },
      },
      package: {
        select: {
          id: true,
          name: true,
          description: true,
          vehicleType: true,
          steps: true,
          stepDuration: true,
          image: true,
        },
      },
      payment: {
        include: {
          attempts: {
            orderBy: { attemptedAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return mapCustomerSession(session);
}

export async function requireSessionDetail(sessionId: string) {
  const session = await getSessionDetail(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
}
