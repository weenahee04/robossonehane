const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const ACCESS_TOKEN_KEY = 'roboss_admin_access_token';
const REFRESH_TOKEN_KEY = 'roboss_admin_refresh_token';

export type AdminRole = 'hq_admin' | 'branch_admin';
export type MachineStatus = 'idle' | 'reserved' | 'washing' | 'maintenance' | 'offline';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
export type CouponScope = 'all_branches' | 'selected_branches' | 'branch_only';
export type CouponStatus = 'draft' | 'active' | 'inactive' | 'archived';
export type DiscountType = 'percent' | 'fixed';
export type SessionStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'ready_to_wash'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface BranchSettings {
  timezone: string;
  currency: string;
  locale: string;
  pointsEarnRate: number;
  pointsMinSpend: number;
  allowsPointRedemption: boolean;
  receiptFooter?: string | null;
  supportPhone?: string | null;
  maxConcurrentSessions: number;
  washStartGraceMinutes: number;
}

export interface BranchScope {
  branchId: string;
  canViewRevenue: boolean;
  canManageMachines: boolean;
  canManageCoupons: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  branchIds: string[];
  scopes: BranchScope[];
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  shortName?: string | null;
  isActive: boolean;
}

export interface BranchSummary {
  id: string;
  code: string;
  name: string;
  shortName?: string | null;
  address: string;
  area: string;
  type: string;
  ownershipType: 'company_owned' | 'franchise';
  franchiseCode?: string | null;
  lat: number;
  lng: number;
  mapsUrl?: string | null;
  promptPayId: string;
  promptPayName: string;
  ownerName?: string | null;
  isActive: boolean;
  hours?: string | null;
  settings: BranchSettings | null;
  machineCount: number;
  todayRevenue: number;
  todaySessions: number;
  avgRating: number | null;
}

export interface MachineRecord {
  id: string;
  branchId: string;
  code: string;
  name: string;
  type: string;
  status: MachineStatus;
  espDeviceId: string;
  isEnabled: boolean;
  maintenanceNote?: string | null;
  firmwareVersion?: string | null;
  lastHeartbeat?: string | null;
  totalWashes: number;
  currentSessionId?: string | null;
  branch: {
    id: string;
    name: string;
    shortName?: string | null;
  };
}

export interface SessionRecord {
  id: string;
  branchId: string;
  machineId: string;
  userId: string;
  status: SessionStatus;
  currentStep: number;
  totalSteps: number;
  progress: number;
  carSize: string;
  totalPrice: number;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  branch: {
    id: string;
    name: string;
    shortName?: string | null;
  };
  machine: {
    id: string;
    name: string;
    status: MachineStatus;
  };
  package: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    displayName: string;
  };
  payment?: {
    id: string;
    status: PaymentStatus;
    amount: number;
    reference?: string | null;
    confirmedAt?: string | null;
  } | null;
}

export interface PaymentAttemptRecord {
  id: string;
  status: PaymentStatus;
  source: string;
  action?: string | null;
  providerRef?: string | null;
  providerStatus?: string | null;
  eventId?: string | null;
  note?: string | null;
  requestBody?: unknown;
  responseBody?: unknown;
  attemptedAt: string;
}

export interface PaymentRecord {
  id: string;
  sessionId: string;
  branchId: string;
  userId: string;
  method: string;
  provider: string;
  providerRef?: string | null;
  providerStatus?: string | null;
  providerConfirmedAt?: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  reference?: string | null;
  qrPayload?: string | null;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  lastWebhookAt?: string | null;
  lastWebhookEventId?: string | null;
  lastWebhookStatus?: string | null;
  lastReconciledAt?: string | null;
  reconciliationAttempts: number;
  createdAt: string;
  updatedAt: string;
  needsManualReview: boolean;
  manualReviewReason?: string | null;
  metadata?: Record<string, unknown>;
  branch: {
    id: string;
    code: string;
    name: string;
    shortName?: string | null;
  };
  session: {
    id: string;
    status: SessionStatus;
    currentStep: number;
    totalSteps: number;
    progress: number;
    totalPrice: number;
    createdAt: string;
    machine: {
      id: string;
      code: string;
      name: string;
      status: MachineStatus;
    };
    package?: {
      id: string;
      code: string;
      name: string;
    } | null;
    user: {
      id: string;
      displayName: string;
      phone?: string | null;
      lineUserId: string;
    };
  };
  attempts: PaymentAttemptRecord[];
  diagnostics: {
    webhook: {
      lastWebhookAt?: string | null;
      lastWebhookEventId?: string | null;
      lastWebhookStatus?: string | null;
    };
    reconcile: {
      lastReconciledAt?: string | null;
      reconciliationAttempts: number;
    };
    provider: {
      provider: string;
      providerRef?: string | null;
      providerStatus?: string | null;
      providerConfirmedAt?: string | null;
    };
    review: {
      needsManualReview: boolean;
      manualReviewReason?: string | null;
      lastTransitionSource?: string | null;
      lastTransitionAt?: string | null;
      lastTransitionNote?: string | null;
    };
  };
}

export interface CustomerRecord {
  id: string;
  lineUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  points: number;
  totalWashes: number;
  totalSpend: number;
  memberTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  memberSince: string;
  lastWash?: string | null;
  vehicles: CustomerVehicleRecord[];
}

export interface CustomerVehicleRecord {
  id: string;
  brand: string;
  model: string;
  plate: string;
  province: string;
  color: string;
  size: string;
  createdAt: string;
}

export interface RevenuePoint {
  date: string;
  total: number;
  sessions: number;
  avgTicket: number;
}

export interface DashboardData {
  admin: AdminUser;
  selectedBranchId?: string | null;
  summary: {
    totalBranches: number;
    totalMachines: number;
    activeMachines: number;
    totalSessions: number;
    todaySessions: number;
    activeSessions: number;
    totalRevenue: number;
    todayRevenue: number;
    totalCustomers: number;
    customerGrowthCurrent: number;
    customerGrowthPrevious: number;
  };
  machineSummary: Record<MachineStatus, number>;
  machineHealth: {
    online: number;
    offline: number;
    maintenance: number;
    washing: number;
    idle: number;
    reserved: number;
    onlineRate: number;
  };
  sessionStatusSummary: Record<SessionStatus, number>;
  revenueTrend: RevenuePoint[];
  customerGrowthTrend: Array<{
    date: string;
    customers: number;
  }>;
  branchPerformance: Array<{
    id: string;
    code: string;
    name: string;
    shortName?: string | null;
    isActive: boolean;
    todayRevenue: number;
    todaySessions: number;
    activeSessions: number;
    machineCount: number;
    machineSummary: Record<MachineStatus, number>;
    avgRating: number | null;
  }>;
  recentSessions: SessionRecord[];
}

export interface RevenueData {
  period: number;
  totalRevenue: number;
  sessionCount: number;
  avgTicket: number;
  dailyRevenue: RevenuePoint[];
  branchTotals: Array<{ branchId: string; name: string; total: number; sessions: number }>;
  packageBreakdown: Array<{ packageId: string; name: string; total: number; sessions: number }>;
}

export interface AdminMeta {
  machineStatuses: MachineStatus[];
  sessionStatuses: SessionStatus[];
  paymentStatuses: PaymentStatus[];
  admin: AdminUser;
  availableRoles: AdminRole[];
  branches: BranchOption[];
}

export interface PolicySnapshot {
  branches: Array<BranchOption & { settings: BranchSettings | null }>;
  editableFields: string[];
}

export interface PackagePriceSet {
  S: number;
  M: number;
  L: number;
}

export interface AdminPackageBranchConfig {
  id: string;
  branchId: string;
  isActive: boolean;
  isVisible: boolean;
  displayName?: string | null;
  descriptionOverride?: string | null;
  priceOverrides: {
    S?: number | null;
    M?: number | null;
    L?: number | null;
  };
  effectivePrices: PackagePriceSet;
  branch: BranchOption;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPackageRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  vehicleType: string;
  prices: PackagePriceSet;
  steps: string[];
  stepDuration: number;
  features?: unknown;
  image?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchConfigs: AdminPackageBranchConfig[];
  branchConfigStats: {
    total: number;
    active: number;
    visible: number;
    overriddenPricing: number;
  };
}

export interface CouponUsageSummary {
  claimedCount: number;
  redemptionCount: number;
  usedCount: number;
  remainingUses: number | null;
  branchUsage: Array<{
    branchId: string;
    usedCount: number;
  }>;
}

export interface AdminCouponRecord {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  scope: CouponScope;
  status: CouponStatus;
  discountType: DiscountType;
  discountValue: number;
  minSpend: number;
  maxUses: number;
  maxUsesPerUser: number;
  usedCount: number;
  packageIds: string[];
  branchIds: string[];
  validFrom: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
  branches: BranchOption[];
  usage: CouponUsageSummary;
}

export interface AdminPromotionRecord {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  branchIds: string[];
  gradient?: string | null;
  conditions?: string | null;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRewardRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  pointsCost: number;
  category: string;
  tag?: string | null;
  icon: string;
  iconBg?: string | null;
  stock?: number | null;
  branchIds: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCampaignRecord {
  id: string;
  title: string;
  body: string;
  category: 'wash' | 'coupon' | 'points' | 'system';
  scope: string;
  branchIds: string[];
  targetUserCount: number;
  sentCount: number;
  createdByAdminId: string;
  createdAt: string;
}

export interface FeedbackInboxRecord {
  id: string;
  userId: string;
  branchId?: string | null;
  sessionId?: string | null;
  type: string;
  message: string;
  status: string;
  adminNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    phone?: string | null;
    lineUserId: string;
  };
  branch?: BranchOption | null;
}

type RequestOptions = RequestInit & { skipRefresh?: boolean };

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function withBranch(path: string, branchId?: string | null, extra?: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  if (branchId) {
    search.set('branchId', branchId);
  }

  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function mapAdmin(raw: any): AdminUser {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    role: raw.role,
    isActive: raw.isActive ?? true,
    lastLoginAt: raw.lastLoginAt ?? null,
    createdAt: raw.createdAt,
    branchIds: raw.branchIds ?? [],
    scopes: raw.scopes ?? [],
  };
}

async function refreshAdminSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  const response = await fetch(`${API_URL}/api/admin/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const body = (await response.json()) as { data: { accessToken: string; admin: any } };
  setTokens(body.data.accessToken, refreshToken);
  return mapAdmin(body.data.admin);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !options.skipRefresh && getRefreshToken()) {
    const refreshed = await refreshAdminSession();
    if (refreshed) {
      return request<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const response = await request<{ data: { admin: any; token?: string; tokens?: { accessToken: string; refreshToken: string } } }>(
    '/api/admin/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipRefresh: true,
    }
  );

  const accessToken = response.data.tokens?.accessToken ?? response.data.token;
  const refreshToken = response.data.tokens?.refreshToken ?? null;

  if (!accessToken) {
    throw new Error('Missing admin access token');
  }

  setTokens(accessToken, refreshToken);
  return mapAdmin(response.data.admin);
}

export async function getCurrentAdmin() {
  if (!getAccessToken() && !getRefreshToken()) {
    return null;
  }

  try {
    const response = await request<{ data: { admin: any } }>('/api/admin/me');
    return mapAdmin(response.data.admin);
  } catch {
    clearTokens();
    return null;
  }
}

export function logout() {
  clearTokens();
}

export async function fetchMeta() {
  const response = await request<{ data: Omit<AdminMeta, 'admin'> & { admin: any } }>('/api/admin/meta');
  return {
    ...response.data,
    admin: mapAdmin(response.data.admin),
  } satisfies AdminMeta;
}

export async function fetchDashboard(branchId?: string | null) {
  const response = await request<{ data: DashboardData }>(withBranch('/api/admin/dashboard', branchId));
  return response.data;
}

export async function fetchBranches(branchId?: string | null) {
  const response = await request<{ data: BranchSummary[] }>(withBranch('/api/admin/branches', branchId));
  return response.data;
}

export async function createBranch(payload: Omit<BranchSummary, 'id' | 'machineCount' | 'todayRevenue' | 'todaySessions' | 'avgRating'>) {
  const response = await request<{ data: BranchSummary }>('/api/admin/branches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateBranch(
  branchId: string,
  payload: Partial<Omit<BranchSummary, 'id' | 'machineCount' | 'todayRevenue' | 'todaySessions' | 'avgRating'>>
) {
  const response = await request<{ data: BranchSummary }>(`/api/admin/branches/${branchId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchMachines(params?: { branchId?: string | null; status?: string }) {
  const response = await request<{ data: MachineRecord[] }>(
    withBranch('/api/admin/machines', params?.branchId, { status: params?.status })
  );
  return response.data;
}

export async function sendMachineCommand(
  machineId: string,
  command: 'restart' | 'maintenance_on' | 'maintenance_off'
) {
  const response = await request<{ data: { message: string } }>(`/api/admin/machines/${machineId}/command`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
  return response.data;
}

export async function fetchSessions(params?: {
  branchId?: string | null;
  page?: number;
  limit?: number;
  status?: string;
}) {
  return request<{ data: SessionRecord[]; total: number; page: number; limit: number }>(
    withBranch('/api/admin/sessions', params?.branchId, {
      page: params?.page,
      limit: params?.limit,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
    })
  );
}

export async function fetchRevenue(days = 30, branchId?: string | null) {
  const response = await request<{ data: RevenueData }>(withBranch('/api/admin/revenue', branchId, { days }));
  return response.data;
}

export async function fetchCustomers(params?: {
  branchId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return request<{ data: CustomerRecord[]; total: number; page: number; limit: number }>(
    withBranch('/api/admin/customers', params?.branchId, {
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
    })
  );
}

export async function fetchPayments(params?: {
  branchId?: string | null;
  page?: number;
  limit?: number;
  status?: PaymentStatus | 'all';
  provider?: string | 'all';
  search?: string;
}) {
  return request<{ data: PaymentRecord[]; total: number; page: number; limit: number }>(
    withBranch('/api/admin/payments', params?.branchId, {
      page: params?.page,
      limit: params?.limit,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
      provider: params?.provider && params.provider !== 'all' ? params.provider : undefined,
      search: params?.search,
    })
  );
}

export async function fetchPaymentDetail(paymentId: string) {
  const response = await request<{ data: PaymentRecord }>(`/api/admin/payments/${paymentId}`);
  return response.data;
}

export async function verifyAdminPayment(
  paymentId: string,
  payload?: {
    note?: string;
    providerRef?: string;
  }
) {
  const response = await request<{ data: SessionRecord }>(`/api/admin/payments/${paymentId}/verify`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
  return response.data;
}

export async function reconcileAdminPayment(
  paymentId: string,
  payload?: {
    providerStatus?: string;
    providerRef?: string;
    amount?: number;
    note?: string;
  }
) {
  const response = await request<{ data: SessionRecord }>(`/api/admin/payments/${paymentId}/reconcile`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
  return response.data;
}

export async function fetchAdminUsers() {
  const response = await request<{ data: any[] }>('/api/admin/users');
  return response.data.map((item) => mapAdmin(item));
}

export async function createAdminUser(payload: {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  branchScopes: Array<{
    branchId: string;
    canViewRevenue: boolean;
    canManageMachines: boolean;
    canManageCoupons: boolean;
  }>;
}) {
  const response = await request<{ data: any }>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapAdmin(response.data);
}

export async function updateAdminUser(
  adminUserId: string,
  payload: Partial<{
    email: string;
    password: string;
    name: string;
    role: AdminRole;
    isActive: boolean;
    branchScopes: Array<{
      branchId: string;
      canViewRevenue: boolean;
      canManageMachines: boolean;
      canManageCoupons: boolean;
    }>;
  }>
) {
  const response = await request<{ data: any }>(`/api/admin/users/${adminUserId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapAdmin(response.data);
}

export async function fetchPolicySnapshot() {
  const response = await request<{ data: PolicySnapshot }>('/api/admin/policies/branch-settings');
  return response.data;
}

export async function applyBranchPolicies(payload: {
  branchIds?: string[];
  settings: Partial<BranchSettings>;
}) {
  const response = await request<{ data: { updatedCount: number; branchIds: string[]; settings: Partial<BranchSettings> } }>(
    '/api/admin/policies/branch-settings',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

export async function fetchAdminPackages(params?: { branchId?: string | null; includeInactive?: boolean }) {
  const response = await request<{ data: AdminPackageRecord[] }>(
    withBranch('/api/admin/packages', params?.branchId, {
      includeInactive: String(params?.includeInactive ?? true),
    })
  );
  return response.data;
}

export async function createAdminPackage(payload: {
  code: string;
  name: string;
  description?: string | null;
  vehicleType: string;
  priceS: number;
  priceM: number;
  priceL: number;
  steps: string[];
  stepDuration: number;
  features?: unknown;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const response = await request<{ data: AdminPackageRecord }>('/api/admin/packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAdminPackage(
  packageId: string,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    vehicleType: string;
    priceS: number;
    priceM: number;
    priceL: number;
    steps: string[];
    stepDuration: number;
    features: unknown;
    image: string | null;
    sortOrder: number;
    isActive: boolean;
  }>
) {
  const response = await request<{ data: AdminPackageRecord }>(`/api/admin/packages/${packageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setAdminPackageActivation(packageId: string, isActive: boolean) {
  const response = await request<{ data: AdminPackageRecord }>(`/api/admin/packages/${packageId}/activation`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return response.data;
}

export async function updateBranchPackageConfig(
  packageId: string,
  branchId: string,
  payload: Partial<{
    isActive: boolean;
    isVisible: boolean;
    displayName: string | null;
    descriptionOverride: string | null;
    priceOverrideS: number | null;
    priceOverrideM: number | null;
    priceOverrideL: number | null;
  }>
) {
  const response = await request<{ data: { package: AdminPackageRecord; branch: BranchOption } }>(
    `/api/admin/packages/${packageId}/branches/${branchId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
  return response.data;
}

export async function fetchAdminCoupons(params?: {
  branchId?: string | null;
  status?: CouponStatus | 'all';
  scope?: CouponScope | 'all';
  search?: string;
  includeArchived?: boolean;
}) {
  const response = await request<{ data: AdminCouponRecord[] }>(
    withBranch('/api/admin/coupons', params?.branchId, {
      status: params?.status && params.status !== 'all' ? params.status : undefined,
      scope: params?.scope && params.scope !== 'all' ? params.scope : undefined,
      search: params?.search,
      includeArchived: params?.includeArchived ? 'true' : undefined,
    })
  );
  return response.data;
}

export async function createAdminCoupon(payload: {
  code: string;
  title: string;
  description?: string | null;
  scope: CouponScope;
  status?: CouponStatus;
  discountType: DiscountType;
  discountValue: number;
  minSpend: number;
  maxUses: number;
  maxUsesPerUser: number;
  packageIds: string[];
  branchIds: string[];
  validFrom: string;
  validUntil: string;
}) {
  const response = await request<{ data: AdminCouponRecord }>('/api/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAdminCoupon(
  couponId: string,
  payload: Partial<{
    code: string;
    title: string;
    description: string | null;
    scope: CouponScope;
    status: CouponStatus;
    discountType: DiscountType;
    discountValue: number;
    minSpend: number;
    maxUses: number;
    maxUsesPerUser: number;
    packageIds: string[];
    branchIds: string[];
    validFrom: string;
    validUntil: string;
  }>
) {
  const response = await request<{ data: AdminCouponRecord }>(`/api/admin/coupons/${couponId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setAdminCouponActivation(couponId: string, isActive: boolean) {
  const response = await request<{ data: AdminCouponRecord }>(`/api/admin/coupons/${couponId}/activation`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return response.data;
}

export async function fetchAdminPromotions(params?: {
  branchId?: string | null;
  search?: string;
  includeInactive?: boolean;
}) {
  const response = await request<{ data: AdminPromotionRecord[] }>(
    withBranch('/api/admin/promotions', params?.branchId, {
      search: params?.search,
      includeInactive: params?.includeInactive ? 'true' : undefined,
    })
  );
  return response.data;
}

export async function createAdminPromotion(payload: {
  title: string;
  description?: string | null;
  image?: string | null;
  gradient?: string | null;
  conditions?: string | null;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  branchIds: string[];
}) {
  const response = await request<{ data: AdminPromotionRecord }>('/api/admin/promotions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAdminPromotion(
  promotionId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    image: string | null;
    gradient: string | null;
    conditions: string | null;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
    branchIds: string[];
  }>
) {
  const response = await request<{ data: AdminPromotionRecord }>(`/api/admin/promotions/${promotionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setAdminPromotionActivation(promotionId: string, isActive: boolean) {
  const response = await request<{ data: AdminPromotionRecord }>(`/api/admin/promotions/${promotionId}/activation`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return response.data;
}

export async function fetchAdminRewards(params?: {
  branchId?: string | null;
  search?: string;
  includeInactive?: boolean;
}) {
  const response = await request<{ data: AdminRewardRecord[] }>(
    withBranch('/api/admin/rewards', params?.branchId, {
      search: params?.search,
      includeInactive: params?.includeInactive ? 'true' : undefined,
    })
  );
  return response.data;
}

export async function createAdminReward(payload: {
  code: string;
  name: string;
  description?: string | null;
  pointsCost: number;
  category: string;
  tag?: string | null;
  icon: string;
  iconBg?: string | null;
  stock?: number | null;
  branchIds: string[];
  isActive?: boolean;
  sortOrder?: number;
}) {
  const response = await request<{ data: AdminRewardRecord }>('/api/admin/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateAdminReward(
  rewardId: string,
  payload: Partial<{
    code: string;
    name: string;
    description: string | null;
    pointsCost: number;
    category: string;
    tag: string | null;
    icon: string;
    iconBg: string | null;
    stock: number | null;
    branchIds: string[];
    isActive: boolean;
    sortOrder: number;
  }>
) {
  const response = await request<{ data: AdminRewardRecord }>(`/api/admin/rewards/${rewardId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function setAdminRewardActivation(rewardId: string, isActive: boolean) {
  const response = await request<{ data: AdminRewardRecord }>(`/api/admin/rewards/${rewardId}/activation`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return response.data;
}

export async function fetchNotificationCampaigns(branchId?: string | null) {
  const response = await request<{ data: NotificationCampaignRecord[] }>(
    withBranch('/api/admin/notification-campaigns', branchId)
  );
  return response.data;
}

export async function createNotificationCampaign(payload: {
  title: string;
  body: string;
  category: 'wash' | 'coupon' | 'points' | 'system';
  branchIds: string[];
}) {
  const response = await request<{ data: NotificationCampaignRecord }>('/api/admin/notification-campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function fetchFeedbackInbox(params?: {
  branchId?: string | null;
  status?: string;
  search?: string;
}) {
  const response = await request<{ data: FeedbackInboxRecord[] }>(
    withBranch('/api/admin/feedback', params?.branchId, {
      status: params?.status && params.status !== 'all' ? params.status : undefined,
      search: params?.search,
    })
  );
  return response.data;
}

export async function updateFeedbackInboxItem(
  feedbackId: string,
  payload: Partial<{
    status: string;
    adminNotes: string | null;
  }>
) {
  const response = await request<{ data: FeedbackInboxRecord }>(`/api/admin/feedback/${feedbackId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export const USE_API = !!import.meta.env.VITE_API_URL;

const api = {
  login,
  getCurrentAdmin,
  logout,
  fetchMeta,
  fetchDashboard,
  fetchBranches,
  createBranch,
  updateBranch,
  fetchMachines,
  fetchSessions,
  fetchRevenue,
  fetchCustomers,
  fetchPayments,
  fetchPaymentDetail,
  verifyAdminPayment,
  reconcileAdminPayment,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  fetchPolicySnapshot,
  applyBranchPolicies,
  fetchAdminPackages,
  createAdminPackage,
  updateAdminPackage,
  setAdminPackageActivation,
  updateBranchPackageConfig,
  fetchAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  setAdminCouponActivation,
  fetchAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  setAdminPromotionActivation,
  fetchAdminRewards,
  createAdminReward,
  updateAdminReward,
  setAdminRewardActivation,
  fetchNotificationCampaigns,
  createNotificationCampaign,
  fetchFeedbackInbox,
  updateFeedbackInboxItem,
  sendMachineCommand,
  USE_API,
};

export default api;
