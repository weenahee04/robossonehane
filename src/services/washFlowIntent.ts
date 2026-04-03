export type WashIntentSource = 'coupon' | 'promotion' | 'branch';

export interface WashFlowIntentCoupon {
  id: string;
  code: string;
  title: string;
  discountType: 'percent' | 'fixed' | 'text';
  discountValue: number;
  minSpend: number;
  branchIds?: string[];
  packageIds?: string[];
}

export interface WashFlowIntentPromotion {
  id: string;
  title: string;
  branchIds?: string[];
}

export interface WashFlowIntent {
  source: WashIntentSource;
  branchId?: string;
  branchName?: string;
  branchType?: 'car' | 'bike';
  coupon?: WashFlowIntentCoupon;
  promotion?: WashFlowIntentPromotion;
  createdAt: number;
}

const STORAGE_KEY = 'roboss_wash_flow_intent';

export function setWashFlowIntent(intent: Omit<WashFlowIntent, 'createdAt'>) {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: WashFlowIntent = {
    ...intent,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getWashFlowIntent(): WashFlowIntent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as WashFlowIntent;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearWashFlowIntent() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

export function consumeWashFlowIntent() {
  const intent = getWashFlowIntent();
  clearWashFlowIntent();
  return intent;
}
