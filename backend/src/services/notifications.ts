import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from './websocket.js';

type NotifCategory = 'wash' | 'coupon' | 'points' | 'system';

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  category: NotifCategory = 'system'
) {
  const notification = await prisma.notification.create({
    data: { userId, title, body, category },
  });

  // Push via WebSocket if user is connected
  broadcastToUser(userId, {
    type: 'notification',
    notification: {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      category: notification.category,
      createdAt: notification.createdAt.toISOString(),
    },
  });

  return notification;
}

export async function notifyWashComplete(userId: string, branchName: string, pointsEarned: number) {
  return createNotification(
    userId,
    'ล้างรถเสร็จแล้ว!',
    `สาขา${branchName} — คุณได้รับ ${pointsEarned.toLocaleString()} พ้อย`,
    'wash'
  );
}

export async function notifyPointsEarned(userId: string, amount: number, reason: string) {
  return createNotification(
    userId,
    'ได้รับพ้อยใหม่!',
    `+${amount.toLocaleString()} พ้อย — ${reason}`,
    'points'
  );
}

export async function notifyCouponReceived(userId: string, couponTitle: string) {
  return createNotification(
    userId,
    'คูปองใหม่!',
    `คุณได้รับคูปอง "${couponTitle}"`,
    'coupon'
  );
}

export async function notifyStampReward(userId: string) {
  return createNotification(
    userId,
    'สะสมแสตมป์ครบแล้ว!',
    'คุณสะสมแสตมป์ครบ 10 ดวง กดรับรางวัลได้เลย',
    'system'
  );
}
