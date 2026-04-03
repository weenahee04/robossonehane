// Points / Loyalty Service
import { mockUser, POINTS_RATE, type User } from './mockData';

// In-memory user state
let currentUser: User = { ...mockUser };
let pointsHistory: { id: string; amount: number; reason: string; sessionId: string; createdAt: Date }[] = [
  { id: 'ph_001', amount: 1090, reason: 'QUICK & CLEAN ไซส์ M — สาขาลาดพร้าว', sessionId: 'old_1', createdAt: new Date('2025-12-20') },
  { id: 'ph_002', amount: 1490, reason: 'SHINE MODE ไซส์ M — สาขาบางนา', sessionId: 'old_2', createdAt: new Date('2026-01-05') },
  { id: 'ph_003', amount: -500, reason: 'แลกส่วนลด 50 บาท', sessionId: '', createdAt: new Date('2026-01-10') },
  { id: 'ph_004', amount: 3990, reason: 'SPECIAL MODE ไซส์ M — สาขาลาดพร้าว', sessionId: 'old_3', createdAt: new Date('2026-02-14') },
];

let listeners: ((user: User) => void)[] = [];

function notifyListeners() {
  listeners.forEach(cb => cb({ ...currentUser }));
}

export function getUser(): User {
  return { ...currentUser };
}

export function getUserPoints(): number {
  return currentUser.points;
}

export function addPoints(amount: number, reason: string, sessionId: string = ''): void {
  currentUser.points += amount;
  currentUser.totalWashes += 1;
  pointsHistory.unshift({
    id: 'ph_' + Date.now(),
    amount,
    reason,
    sessionId,
    createdAt: new Date(),
  });
  notifyListeners();
}

export function getPointsHistory() {
  return [...pointsHistory];
}

export function calculatePoints(totalPrice: number): number {
  return totalPrice * POINTS_RATE;
}

export function listenToUser(callback: (user: User) => void): () => void {
  listeners.push(callback);
  callback({ ...currentUser });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function formatPoints(points: number): string {
  return points.toLocaleString('th-TH');
}
