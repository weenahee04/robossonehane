// Admin roles and types for RBAC
export type AdminRole = 'hq_admin' | 'branch_admin';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  branchIds: string[];  // สาขาที่ดูแล (empty = ทุกสาขา สำหรับ HQ)
  avatar?: string;
  createdAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  area: string;
  location: { lat: number; lng: number };
  mapsUrl?: string;
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

export interface DailyRevenue {
  date: string;
  revenue: number;
  sessions: number;
  avgTicket: number;
}

export interface PackageStats {
  name: string;
  sessions: number;
  revenue: number;
  percentage: number;
}

// ─── Mock Data ────────────────────────────────────────────────

export const MOCK_ADMIN: AdminUser = {
  uid: 'admin_001',
  email: 'admin@roboss.co.th',
  displayName: 'Admin ROBOSS',
  role: 'hq_admin',
  branchIds: [],
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&h=100',
  createdAt: new Date('2024-01-01'),
};

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'b001',
    name: 'ROBOSS รามอินทรา 109',
    address: '99/9 ถ.รามอินทรา กม.9 แขวงคันนายาว เขตคันนายาว',
    area: 'กรุงเทพฯ',
    location: { lat: 13.8682, lng: 100.6378 },
    mapsUrl: 'https://maps.app.goo.gl/ut1MVhuveKSvmiS27',
    promptPayId: '0891234567',
    ownerId: 'owner_001',
    isActive: true,
    operatingHours: { open: '07:00', close: '21:00' },
    machineCount: 3,
    todayRevenue: 14250,
    todaySessions: 32,
    avgRating: 4.7,
  },
  {
    id: 'b002',
    name: 'ROBOSS พระราม 9',
    address: '1 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง',
    area: 'กรุงเทพฯ',
    location: { lat: 13.7489, lng: 100.5714 },
    mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7',
    promptPayId: '0892345678',
    ownerId: 'owner_001',
    isActive: true,
    operatingHours: { open: '07:00', close: '22:00' },
    machineCount: 4,
    todayRevenue: 21800,
    todaySessions: 48,
    avgRating: 4.8,
  },
  {
    id: 'b003',
    name: 'ROBOSS ท่าพระ',
    address: '8/1 ถ.ท่าพระ แขวงบางยี่เรือ เขตธนบุรี',
    area: 'กรุงเทพฯ',
    location: { lat: 13.7260, lng: 100.4785 },
    mapsUrl: 'https://maps.app.goo.gl/SC7SsTxuR1bpcpnq9',
    promptPayId: '0893456789',
    ownerId: 'owner_002',
    isActive: true,
    operatingHours: { open: '06:00', close: '21:00' },
    machineCount: 3,
    todayRevenue: 11600,
    todaySessions: 26,
    avgRating: 4.6,
  },
  {
    id: 'b004',
    name: 'ROBOSS ชลบุรี',
    address: '99 ถ.สุขุมวิท ต.บ้านสวน อ.เมือง จ.ชลบุรี',
    area: 'ชลบุรี',
    location: { lat: 13.3611, lng: 100.9847 },
    mapsUrl: 'https://maps.app.goo.gl/H1xqWbL8BETheHpc6',
    promptPayId: '0894567890',
    ownerId: 'owner_002',
    isActive: true,
    operatingHours: { open: '07:00', close: '21:00' },
    machineCount: 3,
    todayRevenue: 12900,
    todaySessions: 29,
    avgRating: 4.5,
  },
  {
    id: 'b005',
    name: 'ROBOSS สตูล',
    address: '15 ถ.สตูลธานี ต.พิมาน อ.เมือง จ.สตูล',
    area: 'สตูล',
    location: { lat: 6.6238, lng: 100.0674 },
    mapsUrl: 'https://maps.app.goo.gl/tQLW2vdJ1bHygoBF7',
    promptPayId: '0895678901',
    ownerId: 'owner_003',
    isActive: true,
    operatingHours: { open: '07:00', close: '20:00' },
    machineCount: 2,
    todayRevenue: 7400,
    todaySessions: 17,
    avgRating: 4.6,
  },
  {
    id: 'b006',
    name: 'ROBOSS นครศรีธรรมราช',
    address: '55 ถ.ราชดำเนิน ต.ในเมือง อ.เมือง จ.นครศรีธรรมราช',
    area: 'นครศรีธรรมราช',
    location: { lat: 8.4327, lng: 99.9638 },
    mapsUrl: 'https://maps.app.goo.gl/qdMDCMGr6LfagE2N8',
    promptPayId: '0896789012',
    ownerId: 'owner_003',
    isActive: true,
    operatingHours: { open: '07:00', close: '21:00' },
    machineCount: 2,
    todayRevenue: 9200,
    todaySessions: 21,
    avgRating: 4.7,
  },
  {
    id: 'b007',
    name: 'ROBOSS อุทัยธานี',
    address: '123 ถ.ศรีอุทัย ต.อุทัยใหม่ อ.เมือง จ.อุทัยธานี',
    area: 'อุทัยธานี',
    location: { lat: 15.3833, lng: 100.0247 },
    mapsUrl: 'https://maps.app.goo.gl/8dn8U7UiKFwY3dST7',
    promptPayId: '0897890123',
    ownerId: 'owner_004',
    isActive: true,
    operatingHours: { open: '07:00', close: '20:00' },
    machineCount: 2,
    todayRevenue: 6800,
    todaySessions: 15,
    avgRating: 4.5,
  },
];

export const MOCK_MACHINES: Machine[] = [
  // รามอินทรา 109
  { id: 'm001', branchId: 'b001', branchName: 'ROBOSS รามอินทรา 109', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b001-A1', lastHeartbeat: new Date(), totalWashes: 1420 },
  { id: 'm002', branchId: 'b001', branchName: 'ROBOSS รามอินทรา 109', name: 'ตู้ A2', type: 'car', status: 'washing', espDeviceId: 'ESP32-b001-A2', lastHeartbeat: new Date(), totalWashes: 1355, currentSessionId: 's001' },
  { id: 'm003', branchId: 'b001', branchName: 'ROBOSS รามอินทรา 109', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b001-B1', lastHeartbeat: new Date(), totalWashes: 890 },
  // พระราม 9
  { id: 'm004', branchId: 'b002', branchName: 'ROBOSS พระราม 9', name: 'ตู้ A1', type: 'car', status: 'washing', espDeviceId: 'ESP32-b002-A1', lastHeartbeat: new Date(), totalWashes: 2100, currentSessionId: 's002' },
  { id: 'm005', branchId: 'b002', branchName: 'ROBOSS พระราม 9', name: 'ตู้ A2', type: 'car', status: 'idle', espDeviceId: 'ESP32-b002-A2', lastHeartbeat: new Date(), totalWashes: 1980 },
  { id: 'm006', branchId: 'b002', branchName: 'ROBOSS พระราม 9', name: 'ตู้ A3', type: 'car', status: 'maintenance', espDeviceId: 'ESP32-b002-A3', lastHeartbeat: new Date(Date.now() - 3600000), totalWashes: 2350 },
  { id: 'm007', branchId: 'b002', branchName: 'ROBOSS พระราม 9', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b002-B1', lastHeartbeat: new Date(), totalWashes: 1240 },
  // ท่าพระ
  { id: 'm008', branchId: 'b003', branchName: 'ROBOSS ท่าพระ', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b003-A1', lastHeartbeat: new Date(), totalWashes: 870 },
  { id: 'm009', branchId: 'b003', branchName: 'ROBOSS ท่าพระ', name: 'ตู้ A2', type: 'car', status: 'washing', espDeviceId: 'ESP32-b003-A2', lastHeartbeat: new Date(), totalWashes: 720, currentSessionId: 's003' },
  { id: 'm010', branchId: 'b003', branchName: 'ROBOSS ท่าพระ', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b003-B1', lastHeartbeat: new Date(), totalWashes: 430 },
  // ชลบุรี
  { id: 'm011', branchId: 'b004', branchName: 'ROBOSS ชลบุรี', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b004-A1', lastHeartbeat: new Date(), totalWashes: 960 },
  { id: 'm012', branchId: 'b004', branchName: 'ROBOSS ชลบุรี', name: 'ตู้ A2', type: 'car', status: 'idle', espDeviceId: 'ESP32-b004-A2', lastHeartbeat: new Date(), totalWashes: 830 },
  { id: 'm013', branchId: 'b004', branchName: 'ROBOSS ชลบุรี', name: 'ตู้ B1', type: 'motorcycle', status: 'offline', espDeviceId: 'ESP32-b004-B1', lastHeartbeat: new Date(Date.now() - 86400000), totalWashes: 320 },
  // สตูล
  { id: 'm014', branchId: 'b005', branchName: 'ROBOSS สตูล', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b005-A1', lastHeartbeat: new Date(), totalWashes: 540 },
  { id: 'm015', branchId: 'b005', branchName: 'ROBOSS สตูล', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b005-B1', lastHeartbeat: new Date(), totalWashes: 280 },
  // นครศรีธรรมราช
  { id: 'm016', branchId: 'b006', branchName: 'ROBOSS นครศรีธรรมราช', name: 'ตู้ A1', type: 'car', status: 'washing', espDeviceId: 'ESP32-b006-A1', lastHeartbeat: new Date(), totalWashes: 680, currentSessionId: 's004' },
  { id: 'm017', branchId: 'b006', branchName: 'ROBOSS นครศรีธรรมราช', name: 'ตู้ B1', type: 'motorcycle', status: 'idle', espDeviceId: 'ESP32-b006-B1', lastHeartbeat: new Date(), totalWashes: 410 },
  // อุทัยธานี
  { id: 'm018', branchId: 'b007', branchName: 'ROBOSS อุทัยธานี', name: 'ตู้ A1', type: 'car', status: 'idle', espDeviceId: 'ESP32-b007-A1', lastHeartbeat: new Date(), totalWashes: 390 },
  { id: 'm019', branchId: 'b007', branchName: 'ROBOSS อุทัยธานี', name: 'ตู้ B1', type: 'motorcycle', status: 'maintenance', espDeviceId: 'ESP32-b007-B1', lastHeartbeat: new Date(Date.now() - 7200000), totalWashes: 210 },
];

export const MOCK_SESSIONS: WashSession[] = [
  { id: 's001', branchId: 'b001', branchName: 'ROBOSS รามอินทรา 109', machineId: 'm002', userId: 'u001', customerName: 'คุณสมชาย ใจดี', packageName: 'SHINE MODE', carSize: 'M', totalPrice: 149, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 600000), completedAt: null },
  { id: 's002', branchId: 'b002', branchName: 'ROBOSS พระราม 9', machineId: 'm004', userId: 'u002', customerName: 'คุณวิภา สวยงาม', packageName: 'QUICK & CLEAN', carSize: 'S', totalPrice: 99, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 300000), completedAt: null },
  { id: 's003', branchId: 'b003', branchName: 'ROBOSS ท่าพระ', machineId: 'm009', userId: 'u003', customerName: 'คุณประเสริฐ มั่นคง', packageName: 'SPECIAL MODE', carSize: 'L', totalPrice: 469, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 900000), completedAt: null },
  { id: 's004', branchId: 'b006', branchName: 'ROBOSS นครศรีธรรมราช', machineId: 'm016', userId: 'u006', customerName: 'คุณเอกชัย แกร่งดี', packageName: 'SHINE MODE', carSize: 'M', totalPrice: 149, paymentStatus: 'confirmed', washStatus: 'in_progress', rating: null, createdAt: new Date(Date.now() - 1200000), completedAt: null },
  { id: 's005', branchId: 'b001', branchName: 'ROBOSS รามอินทรา 109', machineId: 'm001', userId: 'u003', customerName: 'คุณประเสริฐ มั่นคง', packageName: 'SPECIAL MODE', carSize: 'L', totalPrice: 469, paymentStatus: 'confirmed', washStatus: 'completed', rating: 5, createdAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 2400000) },
  { id: 's006', branchId: 'b002', branchName: 'ROBOSS พระราม 9', machineId: 'm005', userId: 'u004', customerName: 'คุณนภา รักงาน', packageName: 'SHINE MODE', carSize: 'M', totalPrice: 149, paymentStatus: 'confirmed', washStatus: 'completed', rating: 4, createdAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 5400000) },
  { id: 's007', branchId: 'b004', branchName: 'ROBOSS ชลบุรี', machineId: 'm011', userId: 'u005', customerName: 'คุณสุดา พิมพ์สวย', packageName: 'QUICK & CLEAN', carSize: 'S', totalPrice: 79, paymentStatus: 'confirmed', washStatus: 'completed', rating: 5, createdAt: new Date(Date.now() - 10800000), completedAt: new Date(Date.now() - 9000000) },
  { id: 's008', branchId: 'b005', branchName: 'ROBOSS สตูล', machineId: 'm014', userId: 'u007', customerName: 'คุณมณีรัตน์ สุขใจ', packageName: 'QUICK & CLEAN', carSize: 'M', totalPrice: 99, paymentStatus: 'confirmed', washStatus: 'completed', rating: 5, createdAt: new Date(Date.now() - 14400000), completedAt: new Date(Date.now() - 12600000) },
  { id: 's009', branchId: 'b007', branchName: 'ROBOSS อุทัยธานี', machineId: 'm018', userId: 'u008', customerName: 'คุณธีรศักดิ์ ขยันดี', packageName: 'SHINE MODE', carSize: 'S', totalPrice: 119, paymentStatus: 'confirmed', washStatus: 'completed', rating: 4, createdAt: new Date(Date.now() - 18000000), completedAt: new Date(Date.now() - 16200000) },
  { id: 's010', branchId: 'b003', branchName: 'ROBOSS ท่าพระ', machineId: 'm008', userId: 'u002', customerName: 'คุณวิภา สวยงาม', packageName: 'ดูดฝุ่นภายใน', carSize: 'M', totalPrice: 99, paymentStatus: 'confirmed', washStatus: 'completed', rating: 5, createdAt: new Date(Date.now() - 21600000), completedAt: new Date(Date.now() - 19800000) },
];

// Generate 30 days of revenue data
export const MOCK_REVENUE: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  const base = 45000 + Math.random() * 40000;
  const sessions = Math.floor(80 + Math.random() * 80);
  return {
    date: d.toISOString().split('T')[0],
    revenue: Math.round(base),
    sessions,
    avgTicket: Math.round(base / sessions),
  };
});

export const MOCK_PACKAGE_STATS: PackageStats[] = [
  { name: 'QUICK & CLEAN', sessions: 482, revenue: 52300, percentage: 38 },
  { name: 'SHINE MODE', sessions: 356, revenue: 55400, percentage: 28 },
  { name: 'SPECIAL MODE', sessions: 198, revenue: 78200, percentage: 16 },
  { name: 'ดูดฝุ่นภายใน', sessions: 234, revenue: 22100, percentage: 18 },
];

// ─── Customer ────────────────────────────────────────────────
export type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Customer {
  id: string;
  lineUserId: string;
  displayName: string;
  phone?: string;
  points: number;
  totalWashes: number;
  totalSpend: number;
  memberTier: MemberTier;
  memberSince: Date;
  lastWash: Date | null;
}

// ─── Package ─────────────────────────────────────────────────
export interface WashPackage {
  id: string;
  branchId: 'all' | string;
  name: string;
  vehicleType: 'car' | 'motorcycle' | 'both';
  prices: { S: number; M: number; L: number };
  duration: number; // minutes
  steps: string[];
  isActive: boolean;
  color: string;
}

// ─── Coupon ──────────────────────────────────────────────────
export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrder: number;
  usedCount: number;
  maxUses: number;
  expiresAt: Date;
  isActive: boolean;
  branchId: 'all' | string;
}

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c001', lineUserId: 'Uabc001', displayName: 'คุณสมชาย ใจดี', phone: '089-111-1111', points: 2450, totalWashes: 48, totalSpend: 12800, memberTier: 'gold', memberSince: new Date('2023-05-12'), lastWash: new Date(Date.now() - 86400000) },
  { id: 'c002', lineUserId: 'Uabc002', displayName: 'คุณวิภา สวยงาม', phone: '089-222-2222', points: 890, totalWashes: 22, totalSpend: 5400, memberTier: 'silver', memberSince: new Date('2024-02-01'), lastWash: new Date(Date.now() - 300000) },
  { id: 'c003', lineUserId: 'Uabc003', displayName: 'คุณประเสริฐ มั่นคง', phone: '089-333-3333', points: 5800, totalWashes: 112, totalSpend: 32000, memberTier: 'platinum', memberSince: new Date('2023-01-15'), lastWash: new Date(Date.now() - 3600000) },
  { id: 'c004', lineUserId: 'Uabc004', displayName: 'คุณนภา รักงาน', phone: '089-444-4444', points: 340, totalWashes: 9, totalSpend: 2100, memberTier: 'bronze', memberSince: new Date('2024-08-20'), lastWash: new Date(Date.now() - 7200000) },
  { id: 'c005', lineUserId: 'Uabc005', displayName: 'คุณสุดา พิมพ์สวย', phone: '089-555-5555', points: 1120, totalWashes: 31, totalSpend: 8700, memberTier: 'silver', memberSince: new Date('2023-11-10'), lastWash: new Date(Date.now() - 10800000) },
  { id: 'c006', lineUserId: 'Uabc006', displayName: 'คุณเอกชัย แกร่งดี', phone: '089-666-6666', points: 3200, totalWashes: 67, totalSpend: 19500, memberTier: 'gold', memberSince: new Date('2023-03-28'), lastWash: new Date(Date.now() - 14400000) },
  { id: 'c007', lineUserId: 'Uabc007', displayName: 'คุณมณีรัตน์ สุขใจ', phone: '089-777-7777', points: 7600, totalWashes: 145, totalSpend: 48000, memberTier: 'platinum', memberSince: new Date('2022-12-01'), lastWash: new Date(Date.now() - 86400000 * 3) },
  { id: 'c008', lineUserId: 'Uabc008', displayName: 'คุณธีรศักดิ์ ขยันดี', phone: '089-888-8888', points: 180, totalWashes: 5, totalSpend: 900, memberTier: 'bronze', memberSince: new Date('2025-01-05'), lastWash: new Date(Date.now() - 86400000 * 7) },
];

export const MOCK_PACKAGES: WashPackage[] = [
  { id: 'pkg001', branchId: 'all', name: 'QUICK & CLEAN', vehicleType: 'both', prices: { S: 79, M: 99, L: 129 }, duration: 8, steps: ['โฟมล้าง', 'ล้างน้ำ', 'เป่าแห้ง'], isActive: true, color: '#3b82f6' },
  { id: 'pkg002', branchId: 'all', name: 'SHINE MODE', vehicleType: 'car', prices: { S: 119, M: 149, L: 189 }, duration: 12, steps: ['โฟมล้าง', 'แปรงล้อ', 'ล้างน้ำ', 'เคลือบเงา', 'เป่าแห้ง'], isActive: true, color: '#ef4444' },
  { id: 'pkg003', branchId: 'all', name: 'SPECIAL MODE', vehicleType: 'car', prices: { S: 289, M: 369, L: 499 }, duration: 20, steps: ['pre-soak', 'โฟมล้าง', 'แปรงล้อ', 'ล้างน้ำ', 'เคลือบเงา', 'เป่าแห้ง', 'เคลือบแว็กซ์'], isActive: true, color: '#f59e0b' },
  { id: 'pkg004', branchId: 'all', name: 'ดูดฝุ่นภายใน', vehicleType: 'car', prices: { S: 89, M: 99, L: 119 }, duration: 10, steps: ['ดูดฝุ่นเบาะ', 'ดูดฝุ่นพื้น', 'เช็ดแผงหน้าปัด'], isActive: true, color: '#22c55e' },
  { id: 'pkg005', branchId: 'b001', name: 'VIP TREATMENT', vehicleType: 'car', prices: { S: 499, M: 599, L: 799 }, duration: 30, steps: ['pre-soak', 'โฟมพรีเมียม', 'ล้อ & ยาง', 'ล้างน้ำ', 'เช็ดตัวรถ', 'เคลือบแว็กซ์ญี่ปุ่น', 'เช็ดกระจก'], isActive: false, color: '#a855f7' },
];

export const MOCK_COUPONS: Coupon[] = [
  { id: 'cp001', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 99, usedCount: 145, maxUses: 500, expiresAt: new Date('2025-12-31'), isActive: true, branchId: 'all' },
  { id: 'cp002', code: 'SAVE50', type: 'fixed', value: 50, minOrder: 200, usedCount: 89, maxUses: 200, expiresAt: new Date('2025-06-30'), isActive: true, branchId: 'all' },
  { id: 'cp003', code: 'BANGNA20', type: 'percent', value: 20, minOrder: 149, usedCount: 210, maxUses: 300, expiresAt: new Date('2025-04-30'), isActive: true, branchId: 'b002' },
  { id: 'cp004', code: 'NEWMEMBER', type: 'fixed', value: 30, minOrder: 0, usedCount: 502, maxUses: 1000, expiresAt: new Date('2026-12-31'), isActive: true, branchId: 'all' },
  { id: 'cp005', code: 'SUMMER25', type: 'percent', value: 25, minOrder: 200, usedCount: 300, maxUses: 300, expiresAt: new Date('2025-03-31'), isActive: false, branchId: 'all' },
];

// Summary stats
export function getOverviewStats() {
  const totalRevenue = MOCK_BRANCHES.reduce((s, b) => s + b.todayRevenue, 0);
  const totalSessions = MOCK_BRANCHES.reduce((s, b) => s + b.todaySessions, 0);
  const activeBranches = MOCK_BRANCHES.filter(b => b.isActive).length;
  const machinesBusy = MOCK_MACHINES.filter(m => m.status === 'washing' || m.status === 'reserved').length;
  const machinesIdle = MOCK_MACHINES.filter(m => m.status === 'idle').length;
  const machinesMaintenance = MOCK_MACHINES.filter(m => m.status === 'maintenance' || m.status === 'offline').length;
  const avgRating = MOCK_BRANCHES.filter(b => b.isActive).reduce((s, b) => s + b.avgRating, 0) / activeBranches;

  return {
    totalRevenue,
    totalSessions,
    activeBranches,
    totalBranches: MOCK_BRANCHES.length,
    machinesBusy,
    machinesIdle,
    machinesMaintenance,
    totalMachines: MOCK_MACHINES.length,
    avgRating: Math.round(avgRating * 10) / 10,
    monthlyRevenue: MOCK_REVENUE.reduce((s, d) => s + d.revenue, 0),
    monthlySessions: MOCK_REVENUE.reduce((s, d) => s + d.sessions, 0),
  };
}
