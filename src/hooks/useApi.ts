import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

// ── Branch hooks ──────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => api.getBranches(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: ['branch', id],
    queryFn: () => api.getBranch(id),
    enabled: !!id,
  });
}

// ── Session hooks ─────────────────────────────────────────

export function useSessionHistory(page = 1) {
  return useQuery({
    queryKey: ['sessionHistory', page],
    queryFn: () => api.getSessionHistory(page),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSession.bind(api),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionHistory'] });
    },
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => api.confirmPaymentByPaymentId(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionHistory'] });
    },
  });
}

export function useRateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, rating, reviewText }: { sessionId: string; rating: number; reviewText?: string }) =>
      api.rateSession(sessionId, rating, reviewText),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionHistory'] });
    },
  });
}

// ── Points hooks ──────────────────────────────────────────

export function usePointsBalance() {
  return useQuery({
    queryKey: ['pointsBalance'],
    queryFn: () => api.getPointsBalance(),
    staleTime: 1000 * 30,
  });
}

export function usePointsHistory(page = 1) {
  return useQuery({
    queryKey: ['pointsHistory', page],
    queryFn: () => api.getPointsHistory(page),
  });
}

export function useRedeemPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.redeemPoints.bind(api),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pointsBalance'] });
      qc.invalidateQueries({ queryKey: ['pointsHistory'] });
    },
  });
}

// ── Coupon hooks ──────────────────────────────────────────

export function useCoupons(branchId?: string) {
  return useQuery({
    queryKey: ['coupons', branchId],
    queryFn: () => api.getCoupons(branchId),
  });
}

export function useAvailableCoupons(branchId?: string) {
  return useQuery({
    queryKey: ['availableCoupons', branchId],
    queryFn: () => api.getAvailableCoupons(branchId),
  });
}

export function useRewards(branchId?: string) {
  return useQuery({
    queryKey: ['rewards', branchId],
    queryFn: () => api.getRewards(branchId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useClaimCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.claimCoupon(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
      qc.invalidateQueries({ queryKey: ['availableCoupons'] });
    },
  });
}

// ── Stamp hooks ───────────────────────────────────────────

export function useStamps() {
  return useQuery({
    queryKey: ['stamps'],
    queryFn: () => api.getStamps(),
  });
}

export function useClaimStampReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.claimStampReward(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stamps'] });
      qc.invalidateQueries({ queryKey: ['pointsBalance'] });
    },
  });
}

// ── Notification hooks ────────────────────────────────────

export function useNotifications(page = 1, enabled = true) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.getNotifications(page),
    enabled,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── Feedback hooks ────────────────────────────────────────

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: { type: string; message: string }) => api.submitFeedback(data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateProfile>[0]) => api.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUserSettings(enabled = true) {
  return useQuery({
    queryKey: ['userSettings'],
    queryFn: () => api.getUserSettings(),
    enabled,
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateUserSettings>[0]) => api.updateUserSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });
}

export function useAccountAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: 'deactivate' | 'delete') => api.runAccountAction(action),
    onSuccess: () => {
      qc.clear();
    },
  });
}

// ── Vehicle hooks ─────────────────────────────────────────

export function useVehicles(enabled = true) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
    enabled,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createVehicle.bind(api),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteVehicle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// ── Promotion hooks ───────────────────────────────────────

export function usePromotions(branchId?: string) {
  return useQuery({
    queryKey: ['promotions', branchId],
    queryFn: () => api.getPromotions(branchId),
    staleTime: 1000 * 60 * 5,
  });
}
