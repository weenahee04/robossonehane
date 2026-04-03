import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { AdminRole } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

type Principal =
  | {
      kind: 'customer';
      userId: string;
    }
  | {
      kind: 'admin';
      adminId: string;
      role: AdminRole;
      branchIds: string[];
    };

interface WsClient {
  ws: WebSocket;
  principal: Principal;
  sessionIds: Set<string>;
  machineIds: Set<string>;
  branchIds: Set<string>;
  adminFeedEnabled: boolean;
}

type RealtimeMessage = Record<string, unknown>;

const clients = new Map<string, WsClient>();

function sendJson(ws: WebSocket, message: RealtimeMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

async function resolvePrincipal(userId: string): Promise<Principal> {
  return {
    kind: 'customer',
    userId,
  };
}

async function resolveAdminPrincipal(adminId: string): Promise<Principal> {
  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    include: {
      branchScopes: {
        select: { branchId: true },
      },
    },
  });

  if (admin?.isActive) {
    return {
      kind: 'admin',
      adminId: admin.id,
      role: admin.role,
      branchIds: admin.role === 'hq_admin' ? [] : admin.branchScopes.map((scope) => scope.branchId),
    };
  }

  throw new Error('Admin not found');
}

async function canSubscribeToSession(client: WsClient, sessionId: string) {
  if (client.principal.kind === 'admin') {
    const session = await prisma.washSession.findUnique({
      where: { id: sessionId },
      select: { branchId: true },
    });

    if (!session) {
      return false;
    }

    return (
      client.principal.role === 'hq_admin' ||
      client.principal.branchIds.includes(session.branchId)
    );
  }

  const session = await prisma.washSession.findFirst({
    where: {
      id: sessionId,
      userId: client.principal.userId,
    },
    select: { id: true },
  });

  return Boolean(session);
}

function canSubscribeToBranch(client: WsClient, branchId: string) {
  return (
    client.principal.kind === 'admin' &&
    (client.principal.role === 'hq_admin' || client.principal.branchIds.includes(branchId))
  );
}

async function handleClientMessage(client: WsClient, ws: WebSocket, raw: WebSocket.RawData) {
  let message: Record<string, unknown>;

  try {
    message = JSON.parse(raw.toString()) as Record<string, unknown>;
  } catch {
    return;
  }

  if (message.type === 'ping') {
    sendJson(ws, { type: 'pong' });
    return;
  }

  if (message.type === 'subscribe_session' && typeof message.sessionId === 'string') {
    const allowed = await canSubscribeToSession(client, message.sessionId);
    if (!allowed) {
      sendJson(ws, { type: 'subscription_denied', target: 'session', sessionId: message.sessionId });
      return;
    }

    client.sessionIds.add(message.sessionId);
    sendJson(ws, { type: 'subscribed', target: 'session', sessionId: message.sessionId });
    return;
  }

  if (message.type === 'subscribe_machine' && typeof message.machineId === 'string') {
    if (client.principal.kind !== 'admin') {
      sendJson(ws, { type: 'subscription_denied', target: 'machine', machineId: message.machineId });
      return;
    }

    client.machineIds.add(message.machineId);
    sendJson(ws, { type: 'subscribed', target: 'machine', machineId: message.machineId });
    return;
  }

  if (message.type === 'subscribe_branch' && typeof message.branchId === 'string') {
    if (!canSubscribeToBranch(client, message.branchId)) {
      sendJson(ws, { type: 'subscription_denied', target: 'branch', branchId: message.branchId });
      return;
    }

    client.branchIds.add(message.branchId);
    sendJson(ws, { type: 'subscribed', target: 'branch', branchId: message.branchId });
    return;
  }

  if (message.type === 'subscribe_admin') {
    if (client.principal.kind !== 'admin') {
      sendJson(ws, { type: 'subscription_denied', target: 'admin_feed' });
      return;
    }

    client.adminFeedEnabled = true;

    const branchIds = Array.isArray(message.branchIds)
      ? message.branchIds.filter((value): value is string => typeof value === 'string')
      : [];

    if (branchIds.length > 0) {
      branchIds
        .filter((branchId) => canSubscribeToBranch(client, branchId))
        .forEach((branchId) => client.branchIds.add(branchId));
    } else if (client.principal.role !== 'hq_admin') {
      client.principal.branchIds.forEach((branchId) => client.branchIds.add(branchId));
    }

    sendJson(ws, {
      type: 'subscribed',
      target: 'admin_feed',
      branchIds: Array.from(client.branchIds),
      role: client.principal.role,
    });
  }
}

export function initWebSocket(server: ReturnType<typeof import('http').createServer>) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Token required');
      return;
    }

    let principal: Principal;

    try {
      const payload = verifyAccessToken(token);
      principal =
        payload.subjectType === 'admin'
          ? await resolveAdminPrincipal(payload.subjectId)
          : await resolvePrincipal(payload.subjectId);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const clientId = `${principal.kind}_${principal.kind === 'admin' ? principal.adminId : principal.userId}_${Date.now()}`;
    const client: WsClient = {
      ws,
      principal,
      sessionIds: new Set(),
      machineIds: new Set(),
      branchIds: new Set(),
      adminFeedEnabled: false,
    };

    clients.set(clientId, client);

    ws.on('message', async (raw) => {
      try {
        await handleClientMessage(client, ws, raw);
      } catch (error) {
        console.error('WebSocket message handling failed:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });

    sendJson(ws, {
      type: 'connected',
      principal: principal.kind,
      id: principal.kind === 'admin' ? principal.adminId : principal.userId,
      branchIds: principal.kind === 'admin' ? principal.branchIds : [],
      role: principal.kind === 'admin' ? principal.role : 'customer',
    });
  });

  return wss;
}

function matchesTarget(client: WsClient, target: {
  userId?: string;
  sessionId?: string;
  machineId?: string;
  branchId?: string;
}) {
  if (client.principal.kind === 'customer') {
    if (target.userId && client.principal.userId === target.userId) {
      return true;
    }

    if (target.sessionId && client.sessionIds.has(target.sessionId)) {
      return true;
    }

    return false;
  }

  if (!client.adminFeedEnabled) {
    return target.sessionId ? client.sessionIds.has(target.sessionId) : false;
  }

  if (target.sessionId && client.sessionIds.has(target.sessionId)) {
    return true;
  }

  if (target.machineId && client.machineIds.has(target.machineId)) {
    return true;
  }

  if (client.principal.role === 'hq_admin') {
    return true;
  }

  if (target.branchId && client.branchIds.has(target.branchId)) {
    return true;
  }

  return false;
}

export function broadcastRealtime(
  message: RealtimeMessage,
  target: {
    userId?: string;
    sessionId?: string;
    machineId?: string;
    branchId?: string;
  }
) {
  clients.forEach((client) => {
    if (matchesTarget(client, target)) {
      sendJson(client.ws, message);
    }
  });
}

export function broadcastToUser(userId: string, message: object) {
  broadcastRealtime(message as RealtimeMessage, { userId });
}

export function broadcastToSession(sessionId: string, message: object) {
  broadcastRealtime(message as RealtimeMessage, { sessionId });
}
