// Shared types for the ROBOSS Car Wash system

export interface User {
  id: string;
  lineUserId?: string;
  displayName: string;
  avatarUrl: string | null;
  email?: string | null;
  phone?: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalPoints: number;
  totalWashes: number;
  memberSince: string;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  notificationGeneral: boolean;
  notificationWash: boolean;
  notificationCoupon: boolean;
  notificationPoints: boolean;
  locale: 'th' | 'en';
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  area: string;
  type: 'car' | 'bike';
  location: { lat: number; lng: number };
  mapsUrl?: string;
  hours?: string;
  promptPayId: string;
  promptPayName: string;
  supportPhone?: string | null;
  ownershipType?: 'company_owned' | 'franchise';
  ownerName?: string;
  operatingHours?: Record<string, string>;
  isActive: boolean;
  isOpen: boolean;
  machinesFree: number;
  machinesTotal: number;
  packages: WashPackage[];
  machines: Machine[];
}

export interface WashPackage {
  id: string;
  name: string;
  description?: string;
  vehicleType: 'car' | 'motorcycle';
  prices: { S: number; M: number; L: number };
  steps: string[];
  stepDuration: number;
  features?: string[];
  isActive: boolean;
  image?: string | null;
}

export interface Machine {
  id: string;
  branchId?: string;
  code?: string;
  name: string;
  type: 'car' | 'motorcycle';
  status: 'idle' | 'reserved' | 'washing' | 'maintenance' | 'offline';
  espDeviceId: string;
  isEnabled?: boolean;
  maintenanceNote?: string | null;
  lastHeartbeat?: string;
  firmwareVersion?: string;
}

export interface Payment {
  id: string;
  sessionId: string;
  userId: string;
  branchId: string;
  method: 'promptpay' | 'cash' | 'manual';
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  currency: string;
  amount: number;
  reference?: string | null;
  qrPayload?: string | null;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface WashSession {
  id: string;
  branchId: string;
  machineId: string;
  userId: string;
  packageId: string;
  carSize: 'S' | 'M' | 'L';
  addons: string[];
  subtotalPrice?: number;
  discountAmount?: number;
  totalPrice: number;
  status: 'pending_payment' | 'payment_failed' | 'ready_to_wash' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  currentStep: number;
  totalSteps: number;
  progress: number;
  pointsEarned: number;
  rating: number | null;
  reviewText?: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  branch?: Pick<Branch, 'id' | 'name' | 'shortName' | 'promptPayId' | 'promptPayName'>;
  machine?: Machine;
  package?: Pick<WashPackage, 'id' | 'name' | 'description' | 'vehicleType' | 'steps' | 'stepDuration' | 'image'>;
  payment?: Payment | null;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  scope?: 'all_branches' | 'selected_branches' | 'branch_only';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minSpend: number;
  maxUses: number;
  usedCount: number;
  branchIds?: string[];
  packageIds?: string[];
  validFrom: string;
  validUntil: string;
}

export interface UserCoupon {
  id: string;
  userId: string;
  couponId: string;
  coupon?: Coupon;
  isUsed: boolean;
  status?: 'claimed' | 'redeemed' | 'expired' | 'cancelled';
  usedAt?: string;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  sessionId?: string;
  type: 'earn' | 'redeem' | 'expire' | 'bonus';
  amount: number;
  description: string;
  createdAt: string;
}

export interface Stamp {
  id: string;
  userId: string;
  currentCount: number;
  targetCount: number;
  rewardClaimed: boolean;
  lastStampAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: 'wash' | 'coupon' | 'points' | 'system';
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'hq' | 'franchise_owner' | 'branch_manager';
  branchIds: string[];
  isActive: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationsResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Reward {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  points: number;
  category: string;
  tag?: string | null;
  icon: string;
  iconBg?: string | null;
  stock?: number | null;
  branchIds?: string[];
}

export interface AuthConfig {
  devLoginEnabled: boolean;
  lineLoginEnabled: boolean;
  clerkEnabled?: boolean;
  customerAuthMode?: 'mock' | 'legacy' | 'clerk';
}

export interface Vehicle {
  id: string;
  userId: string;
  brand: string;
  model: string;
  plate: string;
  province: string;
  color: string;
  size: 'S' | 'M' | 'L';
  createdAt: string;
}

export interface Promotion {
  id: string;
  title: string;
  description?: string;
  image?: string;
  branchIds: string[];
  gradient?: string;
  conditions?: string;
  validFrom: string;
  validUntil: string;
}
