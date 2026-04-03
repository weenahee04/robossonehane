// Admin roles and types for RBAC
export type AdminRole = 'hq_admin' | 'franchise_owner' | 'branch_manager';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  branchIds: string[];
  avatar?: string;
  createdAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  area: string;
  location: { lat: number; lng: number };
  promptPayId: string;
  ownerId: string;
  isActive: boolean;
  operatingHours: { open: string; close: string };
  machineCount: number;
  todayRevenue: number;
  todaySessions: number;
  avgRating: number;
}

export interface Machine {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  type: 'car' | 'motorcycle';
  status: 'idle' | 'reserved' | 'washing' | 'maintenance' | 'offline';
  espDeviceId: string;
  lastHeartbeat: Date;
  totalWashes: number;
  currentSessionId?: string;
}

export interface WashSession {
  id: string;
  branchId: string;
  branchName: string;
  machineId: string;
  userId: string;
  customerName: string;
  packageName: string;
  carSize: 'S' | 'M' | 'L';
  totalPrice: number;
  paymentStatus: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  washStatus: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  rating: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface DailyRevenue { date: string; revenue: number; sessions: number; avgTicket: number; }
export interface PackageStats { name: string; sessions: number; revenue: number; percentage: number; }

export const MOCK_ADMIN: AdminUser = {
  uid: 'admin_001', email: 'admin@roboss.co.th', displayName: 'Admin ROBOSS',
  role: 'hq_admin', branchIds: [],
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&h=100',
  createdAt: new Date('2024-01-01'),
};

// Branch managers - each can only see their assigned branches
export const MOCK_BRANCH_MANAGERS: AdminUser[] = [
  { uid: 'mgr_001', email: 'ladprao@roboss.co.th', displayName: 'ผู้จัดการ สาขาลาดพร้าว', role: 'branch_manager', branchIds: ['b001'], avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100', createdAt: new Date('2024-03-01') },
  { uid: 'mgr_002', email: 'bangna@roboss.co.th', displayName: 'ผู้จัดการ สาขาบางนา', role: 'branch_manager', branchIds: ['b002'], avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100', createdAt: new Date('2024-03-15') },
  { uid: 'mgr_003', email: 'rangsit@roboss.co.th', displayName: 'ผู้จัดการ สาขารังสิต', role: 'branch_manager', branchIds: ['b003'], avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100', createdAt: new Date('2024-04-01') },
  { uid: 'own_001', email: 'owner1@roboss.co.th', displayName: 'เจ้าของ กลุ่ม A', role: 'franchise_owner', branchIds: ['b001', 'b002'], avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&h=100', createdAt: new Date('2024-01-15') },
  { uid: 'own_002', email: 'owner2@roboss.co.th', displayName: 'เจ้าของ กลุ่ม B', role: 'franchise_owner', branchIds: ['b003', 'b004'], avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&h=100', createdAt: new Date('2024-02-01') },
];

export const ALL_USERS = [MOCK_ADMIN, ...MOCK_BRANCH_MANAGERS];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b001', name: 'ROBOSS ลาดพร้าว', address: '123 ลาดพร้าว ซ.25', area: 'กรุงเทพฯ', location: { lat: 13.817, lng: 100.561 }, promptPayId: '0891234567', ownerId: 'o1', isActive: true, operatingHours: { open: '07:00', close: '21:00' }, machineCount: 3, todayRevenue: 12450, todaySessions: 28, avgRating: 4.7 },
  { id: 'b002', name: 'ROBOSS บางนา', address: '456 บางนา-ตราด', area: 'กรุงเทพฯ', location: { lat: 13.662, lng: 100.652 }, promptPayId: '0892345678', ownerId: 'o1', isActive: true, operatingHours: { open: '07:00', close: '22:00' }, machineCount: 4, todayRevenue: 18200, todaySessions: 42, avgRating: 4.5 },
  { id: 'b003', name: 'ROBOSS รังสิต', address: '789 พหลโยธิน', area: 'ปทุมธานี', location: { lat: 13.981, lng: 100.614 }, promptPayId: '0893456789', ownerId: 'o2', isActive: true, operatingHours: { open: '06:00', close: '20:00' }, machineCount: 2, todayRevenue: 8900, todaySessions: 19, avgRating: 4.8 },
  { id: 'b004', name: 'ROBOSS พระราม 2', address: '321 พระราม 2', area: 'กรุงเทพฯ', location: { lat: 13.645, lng: 100.447 }, promptPayId: '0894567890', ownerId: 'o2', isActive: true, operatingHours: { open: '07:00', close: '21:00' }, machineCount: 3, todayRevenue: 15300, todaySessions: 35, avgRating: 4.6 },
  { id: 'b005', name: 'ROBOSS เมืองทอง', address: '555 แจ้งวัฒนะ', area: 'นนทบุรี', location: { lat: 13.916, lng: 100.548 }, promptPayId: '0895678901', ownerId: 'o3', isActive: true, operatingHours: { open: '07:00', close: '22:00' }, machineCount: 3, todayRevenue: 11200, todaySessions: 25, avgRating: 4.4 },
  { id: 'b006', name: 'ROBOSS สุขุมวิท', address: '88 สุขุมวิท 71', area: 'กรุงเทพฯ', location: { lat: 13.715, lng: 100.578 }, promptPayId: '0896789012', ownerId: 'o3', isActive: true, operatingHours: { open: '08:00', close: '22:00' }, machineCount: 2, todayRevenue: 9800, todaySessions: 21, avgRating: 4.9 },
  { id: 'b007', name: 'ROBOSS เชียงใหม่', address: '99 นิมมานฯ', area: 'เชียงใหม่', location: { lat: 18.797, lng: 98.968 }, promptPayId: '0897890123', ownerId: 'o4', isActive: true, operatingHours: { open: '07:00', close: '20:00' }, machineCount: 2, todayRevenue: 7600, todaySessions: 16, avgRating: 4.7 },
  { id: 'b008', name: 'ROBOSS พัทยา', address: '22 พัทยาสาย 2', area: 'ชลบุรี', location: { lat: 12.924, lng: 100.883 }, promptPayId: '0898901234', ownerId: 'o4', isActive: false, operatingHours: { open: '07:00', close: '21:00' }, machineCount: 2, todayRevenue: 0, todaySessions: 0, avgRating: 4.3 },
];

export const MOCK_MACHINES: Machine[] = [
  { id: 'm001', branchId: 'b001', branchName: 'ROBOSS ลาดพร้าว', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b001-A1', lastHeartbeat: new Date(), totalWashes: 1420 },
  { id: 'm002', branchId: 'b001', branchName: 'ROBOSS ลาดพร้าว', name: 'ตู้ A2', type: 'car', status: 'washing', espDeviceId: 'ESP32-b001-A2', lastHeartbeat: new Date(), totalWashes: 1355, currentSessionId: 's001' },
  { id: 'm003', branchId: 'b001', branchName: 'ROBOSS ลาดพร้าว', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b001-B1', lastHeartbeat: new Date(), totalWashes: 890 },
  { id: 'm004', branchId: 'b002', branchName: 'ROBOSS บางนา', name: 'ตู้ A1', type: 'car', status: 'washing', espDeviceId: 'ESP32-b002-A1', lastHeartbeat: new Date(), totalWashes: 2100, currentSessionId: 's002' },
  { id: 'm005', branchId: 'b002', branchName: 'ROBOSS บางนา', name: 'ตู้ A2', type: 'car', status: 'idle', espDeviceId: 'ESP32-b002-A2', lastHeartbeat: new Date(), totalWashes: 1980 },
  { id: 'm006', branchId: 'b002', branchName: 'ROBOSS บางนา', name: 'ตู้ A3', type: 'car', status: 'maintenance', espDeviceId: 'ESP32-b002-A3', lastHeartbeat: new Date(Date.now() - 3600000), totalWashes: 2350 },
  { id: 'm007', branchId: 'b003', branchName: 'ROBOSS รังสิต', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b003-A1', lastHeartbeat: new Date(), totalWashes: 670 },
  { id: 'm008', branchId: 'b003', branchName: 'ROBOSS รังสิต', name: 'ตู้ B1', type: 'motorcycle', status: 'offline', espDeviceId: 'ESP32-b003-B1', lastHeartbeat: new Date(Date.now() - 86400000), totalWashes: 430 },
];

export const MOCK_SESSIONS: WashSession[] = [
  { id: 's001', branchId: 'b001', branchName: 'ROBOSS ลาดพร้าว', machineId: 'm002', userId: 'u001', customerName: 'คุณสมชาย', packageName: 'SHINE MODE', carSize: 'M', totalPrice: 149, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 600000), completedAt: null },
  { id: 's002', branchId: 'b002', branchName: 'ROBOSS บางนา', machineId: 'm004', userId: 'u002', customerName: 'คุณวิภา', packageName: 'QUICK & CLEAN', carSize: 'S', totalPrice: 99, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 300000), completedAt: null },
  { id: 's003', branchId: 'b001', branchName: 'ROBOSS ลาดพร้าว', machineId: 'm001', userId: 'u003', customerName: 'คุณประเสริฐ', packageName: 'SPECIAL MODE', carSize: 'L', totalPrice: 469, paymentStatus: 'confirmed', washStatus: 'completed', rating: 5, createdAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 2400000) },
  { id: 's004', branchId: 'b002', branchName: 'ROBOSS บางนา', machineId: 'm005', userId: 'u004', customerName: 'คุณนภา', packageName: 'SHINE MODE', carSize: 'M', totalPrice: 149, paymentStatus: 'confirmed', washStatus: 'completed', rating: 4, createdAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 5400000) },
  { id: 's005', branchId: 'b004', branchName: 'ROBOSS พระราม 2', machineId: 'm010', userId: 'u005', customerName: 'คุณเอกชัย', packageName: 'SPECIAL MODE', carSize: 'L', totalPrice: 492, paymentStatus: 'confirmed', washStatus: 'completed', rating: 4, createdAt: new Date(Date.now() - 14400000), completedAt: new Date(Date.now() - 12600000) },
];

export const MOCK_REVENUE: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (29 - i));
  const base = 45000 + Math.random() * 40000;
  const sessions = Math.floor(80 + Math.random() * 80);
  return { date: d.toISOString().split('T')[0], revenue: Math.round(base), sessions, avgTicket: Math.round(base / sessions) };
});

export const MOCK_PACKAGE_STATS: PackageStats[] = [
  { name: 'QUICK & CLEAN', sessions: 482, revenue: 52300, percentage: 38 },
  { name: 'SHINE MODE', sessions: 356, revenue: 55400, percentage: 28 },
  { name: 'SPECIAL MODE', sessions: 198, revenue: 78200, percentage: 16 },
  { name: 'ดูดฝุ่นภายใน', sessions: 234, revenue: 22100, percentage: 18 },
];

export function getOverviewStats(branchIds?: string[]) {
  const branches = branchIds?.length ? MOCK_BRANCHES.filter(b => branchIds.includes(b.id)) : MOCK_BRANCHES;
  const machines = branchIds?.length ? MOCK_MACHINES.filter(m => branchIds.includes(m.branchId)) : MOCK_MACHINES;
  const totalRevenue = branches.reduce((s, b) => s + b.todayRevenue, 0);
  const totalSessions = branches.reduce((s, b) => s + b.todaySessions, 0);
  const activeBranches = branches.filter(b => b.isActive).length;
  const machinesBusy = machines.filter(m => m.status === 'washing' || m.status === 'reserved').length;
  const machinesIdle = machines.filter(m => m.status === 'idle').length;
  const machinesMaint = machines.filter(m => m.status === 'maintenance' || m.status === 'offline').length;
  const avgRating = branches.filter(b => b.isActive).length > 0 ? branches.filter(b => b.isActive).reduce((s, b) => s + b.avgRating, 0) / branches.filter(b => b.isActive).length : 0;
  return { totalRevenue, totalSessions, activeBranches, totalBranches: branches.length, machinesBusy, machinesIdle, machinesMaintenance: machinesMaint, totalMachines: machines.length, avgRating: Math.round(avgRating * 10) / 10, monthlyRevenue: MOCK_REVENUE.reduce((s, d) => s + d.revenue, 0), monthlySessions: MOCK_REVENUE.reduce((s, d) => s + d.sessions, 0) };
}

// Helper to filter data by branch
export function filterByBranch<T extends { branchId: string }>(data: T[], branchIds?: string[]): T[] {
  return branchIds?.length ? data.filter(d => branchIds.includes(d.branchId)) : data;
}
