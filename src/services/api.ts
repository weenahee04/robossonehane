import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  User,
  Branch,
  WashSession,
  UserCoupon,
  Coupon,
  PointsTransaction,
  Stamp,
  Notification,
  LoginResponse,
  ApiResponse,
  PaginatedResponse,
  NotificationsResponse,
  Vehicle,
  Reward,
  Promotion,
  Machine,
  AuthConfig,
  UserSettings,
} from '@/types';

function normalizeApiBaseUrl(rawBaseUrl?: string) {
  if (!rawBaseUrl) {
    return '/api';
  }

  return rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const ACCESS_TOKEN_STORAGE_KEY = 'roboss_token';
const REFRESH_TOKEN_STORAGE_KEY = 'roboss_refresh_token';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;
  private authFailureHandler: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    this.client.interceptors.request.use((config) => {
      config.headers = config.headers ?? {};
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

        if (
          error.response?.status === 401 &&
          !isRefreshRequest &&
          !originalRequest?._retry &&
          this.refreshToken
        ) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            originalRequest.headers = {
              ...(originalRequest.headers ?? {}),
              Authorization: `Bearer ${this.accessToken}`,
            };
            return this.client.request(originalRequest);
          } catch {
            this.clearTokens();
            this.authFailureHandler?.();
          }
        } else if (error.response?.status === 401) {
          this.clearTokens();
          this.authFailureHandler?.();
        }

        return Promise.reject(error);
      }
    );

    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (storedAccessToken) {
      this.accessToken = storedAccessToken;
    }
    if (storedRefreshToken) {
      this.refreshToken = storedRefreshToken;
    }
  }

  private setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);

    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }

  setAuthFailureHandler(handler: (() => void) | null) {
    this.authFailureHandler = handler;
  }

  setToken(token: string) {
    this.setTokens(token);
  }

  clearToken() {
    this.clearTokens();
  }

  getToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const res = await this.client.request<ApiResponse<T>>(config);
    return res.data.data;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.client
        .post<ApiResponse<LoginResponse>>('/auth/refresh', {
          refreshToken: this.refreshToken,
        })
        .then((res) => {
          const { tokens } = res.data.data;
          this.setTokens(tokens.accessToken, tokens.refreshToken);
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  async getAuthConfig(): Promise<AuthConfig> {
    return this.request<AuthConfig>({ method: 'GET', url: '/auth/config' });
  }

  async exchangeClerkSession(clerkToken: string): Promise<LoginResponse> {
    try {
      const res = await this.client.post<ApiResponse<LoginResponse>>('/auth/clerk/exchange', {
        token: clerkToken,
      });
      const { tokens } = res.data.data;
      this.setTokens(tokens.accessToken, tokens.refreshToken);
      return res.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message;
        throw new Error(message);
      }

      throw error;
    }
  }

  async getLineLoginUrl(redirectUri: string, state: string): Promise<string> {
    const res = await this.client.get<ApiResponse<{ url: string }>>('/auth/line/url', {
      params: { redirectUri, state },
    });
    return res.data.data.url;
  }

  async loginWithLine(lineAccessToken: string): Promise<LoginResponse> {
    const res = await this.client.post<ApiResponse<LoginResponse>>('/auth/line', {
      accessToken: lineAccessToken,
    });
    const { tokens } = res.data.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return res.data.data;
  }

  async loginWithLineCallback(code: string, redirectUri: string): Promise<LoginResponse> {
    const res = await this.client.post<ApiResponse<LoginResponse>>('/auth/line/callback', {
      code,
      redirectUri,
    });
    const { tokens } = res.data.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return res.data.data;
  }

  async loginDev(lineUserId = 'dev_user_001'): Promise<LoginResponse> {
    const res = await this.client.post<ApiResponse<LoginResponse>>('/auth/dev-login', {
      lineUserId,
    });
    const { tokens } = res.data.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return res.data.data;
  }

  async restoreSession(): Promise<User> {
    if (this.accessToken) {
      try {
        return await this.getMe();
      } catch {
        // Fall through to refresh flow.
      }
    }

    if (!this.refreshToken) {
      throw new Error('No session found');
    }

    const res = await this.client.post<ApiResponse<LoginResponse>>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    const { user, tokens } = res.data.data;
    this.setTokens(tokens.accessToken, tokens.refreshToken);
    return user;
  }

  async getMe(): Promise<User> {
    return this.request<User>({ method: 'GET', url: '/auth/me' });
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>({ method: 'PATCH', url: '/users/me', data });
  }

  async getUserSettings(): Promise<UserSettings> {
    return this.request<UserSettings>({ method: 'GET', url: '/users/me/settings' });
  }

  async updateUserSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>({ method: 'PATCH', url: '/users/me/settings', data });
  }

  async runAccountAction(action: 'deactivate' | 'delete'): Promise<{ action: 'deactivate' | 'delete'; completed: boolean }> {
    return this.request<{ action: 'deactivate' | 'delete'; completed: boolean }>({
      method: 'POST',
      url: '/users/me/account-action',
      data: { action },
    });
  }

  async getBranches(): Promise<Branch[]> {
    return this.request<Branch[]>({ method: 'GET', url: '/branches' });
  }

  async getBranch(id: string): Promise<Branch> {
    return this.request<Branch>({ method: 'GET', url: `/branches/${id}` });
  }

  async resolveScan(qrData: string): Promise<{ qrData: string; branch: Branch; machine: Machine }> {
    return this.request<{ qrData: string; branch: Branch; machine: Machine }>({
      method: 'POST',
      url: '/branches/resolve-scan',
      data: { qrData },
    });
  }

  async createSession(data: {
    branchId: string;
    machineId: string;
    packageId: string;
    carSize: 'S' | 'M' | 'L';
    addons: string[];
    totalPrice: number;
    couponId?: string;
  }): Promise<WashSession> {
    return this.request<WashSession>({ method: 'POST', url: '/sessions', data });
  }

  async confirmPayment(sessionId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: `/sessions/${sessionId}/confirm-payment`,
    });
  }

  async createPayment(sessionId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: '/payments',
      data: { sessionId },
    });
  }

  async confirmPaymentByPaymentId(paymentId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: `/payments/${paymentId}/confirm`,
    });
  }

  async startWash(sessionId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: `/sessions/${sessionId}/start`,
    });
  }

  async cancelSession(sessionId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: `/sessions/${sessionId}/cancel`,
    });
  }

  async getSession(sessionId: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'GET',
      url: `/sessions/${sessionId}`,
    });
  }

  async rateSession(sessionId: string, rating: number, reviewText?: string): Promise<WashSession> {
    return this.request<WashSession>({
      method: 'POST',
      url: `/sessions/${sessionId}/rate`,
      data: { rating, reviewText },
    });
  }

  async getSessionHistory(page = 1, limit = 20): Promise<PaginatedResponse<WashSession>> {
    const res = await this.client.get<PaginatedResponse<WashSession>>('/sessions/history', {
      params: { page, limit },
    });
    return res.data;
  }

  async getPointsBalance(): Promise<{ balance: number; tier: string }> {
    return this.request<{ balance: number; tier: string }>({
      method: 'GET',
      url: '/points/balance',
    });
  }

  async getPointsHistory(page = 1, limit = 20): Promise<PaginatedResponse<PointsTransaction>> {
    const res = await this.client.get<PaginatedResponse<PointsTransaction>>('/points/history', {
      params: { page, limit },
    });
    return res.data;
  }

  async redeemPoints(data: { amount: number; rewardId: string }): Promise<PointsTransaction> {
    return this.request<PointsTransaction>({ method: 'POST', url: '/points/redeem', data });
  }

  async getRewards(branchId?: string): Promise<Reward[]> {
    return this.request<Reward[]>({
      method: 'GET',
      url: '/points/rewards',
      params: branchId ? { branchId } : undefined,
    });
  }

  async getCoupons(branchId?: string): Promise<UserCoupon[]> {
    return this.request<UserCoupon[]>({
      method: 'GET',
      url: '/coupons',
      params: branchId ? { branchId } : undefined,
    });
  }

  async getAvailableCoupons(branchId?: string): Promise<Coupon[]> {
    return this.request<Coupon[]>({
      method: 'GET',
      url: '/coupons/available',
      params: branchId ? { branchId } : undefined,
    });
  }

  async claimCoupon(code: string): Promise<UserCoupon> {
    return this.request<UserCoupon>({ method: 'POST', url: '/coupons/claim', data: { code } });
  }

  async useCoupon(couponId: string, sessionId: string): Promise<UserCoupon> {
    return this.request<UserCoupon>({
      method: 'POST',
      url: `/coupons/${couponId}/use`,
      data: { sessionId },
    });
  }

  async getStamps(): Promise<Stamp> {
    return this.request<Stamp>({ method: 'GET', url: '/stamps' });
  }

  async claimStampReward(): Promise<Stamp> {
    return this.request<Stamp>({ method: 'POST', url: '/stamps/claim-reward' });
  }

  async getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const res = await this.client.get<NotificationsResponse>('/notifications', {
      params: { page, limit },
    });
    return res.data;
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.client.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.client.patch('/notifications/read-all');
  }

  async submitFeedback(data: { type: string; message: string }): Promise<void> {
    await this.client.post('/feedback', data);
  }

  async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>({ method: 'GET', url: '/vehicles' });
  }

  async createVehicle(data: Omit<Vehicle, 'id' | 'userId' | 'createdAt'>): Promise<Vehicle> {
    return this.request<Vehicle>({ method: 'POST', url: '/vehicles', data });
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.client.delete(`/vehicles/${id}`);
  }

  async getPromotions(branchId?: string): Promise<Promotion[]> {
    return this.request<Promotion[]>({
      method: 'GET',
      url: '/promotions',
      params: branchId ? { branchId } : undefined,
    });
  }
}

export const api = new ApiClient();
export default api;
