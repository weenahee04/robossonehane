import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAvailableCoupons, useClaimCoupon, useCoupons } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { setWashFlowIntent } from '@/services/washFlowIntent';
import { useBranch } from '../services/branchContext';
import { getCouponsForBranch } from '../services/branchOffers';
import { getIconUrl, type IconName } from '../services/icons';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return (
    <img
      src={`${ICONS8_BASE}${size * 2}&id=${id}`}
      width={size}
      height={size}
      alt=""
      className={`inline-block flex-shrink-0 ${className}`}
      style={{ filter: 'invert(1) brightness(1.1)' }}
      loading="lazy"
    />
  );
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <img
      src={getIconUrl(name, size * 2)}
      alt={name}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ filter: 'invert(1) brightness(1.1)' }}
    />
  );
}

function IconBox({ id, size = 14, boxSize = 'w-9 h-9' }: { id: string | number; size?: number; boxSize?: string }) {
  return (
    <div className={`${boxSize} rounded-xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0`}>
      <Ico id={id} size={size} />
    </div>
  );
}

type TabType = 'available' | 'used' | 'expired';

interface CouponCardItem {
  id: string;
  title: string;
  description: string;
  discount: string;
  discountType: 'percent' | 'amount' | 'text';
  minSpend: number;
  expiryDate: string;
  daysLeft: number;
  status: 'available' | 'used' | 'expired';
  code: string;
  iconId: number;
  branchIds?: string[];
  packageIds?: string[];
  source: 'claimed' | 'available';
  couponId?: string;
}

const filterTabs: { value: TabType; label: string; iconId: number }[] = [
  { value: 'available', label: 'ใช้ได้', iconId: 12394 },
  { value: 'used', label: 'ใช้แล้ว', iconId: 11695 },
  { value: 'expired', label: 'หมดอายุ', iconId: 1112 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

function toDisplayDate(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDaysLeft(value?: string) {
  if (!value) return 0;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
}

export function CouponPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { branch } = useBranch();
  const { data: apiCoupons } = useCoupons(branch.id);
  const { data: availableCoupons } = useAvailableCoupons(branch.id);
  const claimCouponMutation = useClaimCoupon();

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const couponsData: CouponCardItem[] = useMemo(() => {
    if (HAS_API_BASE_URL && apiCoupons) {
      const claimed = apiCoupons.map((userCoupon) => {
        const coupon = userCoupon.coupon;
        const daysLeft = toDaysLeft(coupon?.validUntil);
        const isExpired = !userCoupon.isUsed && daysLeft === 0;

        return {
          id: userCoupon.id,
          couponId: coupon?.id,
          title: coupon?.title || 'คูปอง',
          description: coupon?.description || '',
          discount: String(coupon?.discountValue ?? 0),
          discountType: coupon?.discountType === 'fixed' ? 'amount' : 'percent',
          minSpend: coupon?.minSpend ?? 0,
          expiryDate: toDisplayDate(coupon?.validUntil),
          daysLeft,
          status: userCoupon.isUsed ? 'used' : isExpired ? 'expired' : 'available',
          code: coupon?.code || '',
          iconId: 12394,
          branchIds: coupon?.branchIds,
          packageIds: coupon?.packageIds,
          source: 'claimed',
        } satisfies CouponCardItem;
      });

      const available = (availableCoupons ?? []).map((coupon) => ({
        id: coupon.id,
        couponId: coupon.id,
        title: coupon.title || 'คูปอง',
        description: coupon.description || '',
        discount: String(coupon.discountValue ?? 0),
        discountType: coupon.discountType === 'fixed' ? 'amount' : 'percent',
        minSpend: coupon.minSpend ?? 0,
        expiryDate: toDisplayDate(coupon.validUntil),
        daysLeft: toDaysLeft(coupon.validUntil),
        status: 'available',
        code: coupon.code || '',
        iconId: 12394,
        branchIds: coupon.branchIds,
        packageIds: coupon.packageIds,
        source: 'available',
      } satisfies CouponCardItem));

      return [...claimed, ...available];
    }

    if (USE_LOCAL_DEV_FALLBACK) {
      return getCouponsForBranch(branch.id).map((coupon) => ({
        ...coupon,
        source: 'claimed' as const,
        couponId: coupon.id,
      }));
    }

    return [];
  }, [apiCoupons, availableCoupons, branch.id]);

  const filtered = couponsData.filter((coupon) => coupon.status === activeTab);
  const availableCount = couponsData.filter((coupon) => coupon.status === 'available').length;

  const handleUseCoupon = (coupon: CouponCardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setWashFlowIntent({
      source: 'coupon',
      branchId: branch.id,
      branchName: branch.name,
      branchType: branch.type,
      coupon: {
        id: coupon.couponId || coupon.id,
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType === 'amount' ? 'fixed' : coupon.discountType,
        discountValue: Number(coupon.discount) || 0,
        minSpend: coupon.minSpend,
        branchIds: coupon.branchIds,
        packageIds: coupon.packageIds,
      },
    });
    navigate('/carwash');
  };

  const handleClaimCoupon = async (coupon: CouponCardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (coupon.source !== 'available') return;

    try {
      setClaimError(null);
      await claimCouponMutation.mutateAsync(coupon.code);
      setExpandedId(null);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'ไม่สามารถรับคูปองได้');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <div className="flex flex-col items-center min-w-0 flex-1 mx-2">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-bold text-base">คูปองส่วนลด</h1>
            {availableCount > 0 && (
              <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-app-red flex items-center justify-center">
                <span className="text-[10px] font-black text-white">{availableCount}</span>
              </div>
            )}
          </div>
          <p className="text-white/25 text-[9px] truncate w-full text-center mt-0.5">
            {branch.shortName} • ใช้ร่วมกับสาขาที่กำหนดได้
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          {filterTabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = couponsData.filter((coupon) => coupon.status === tab.value).length;

            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-medium ${
                  isActive
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'
                }`}
              >
                <img
                  src={`${ICONS8_BASE}24&id=${tab.iconId}`}
                  width={12}
                  height={12}
                  alt=""
                  className="inline-block flex-shrink-0"
                  style={{ filter: isActive ? 'brightness(0)' : 'invert(1) brightness(1.1)' }}
                />
                {tab.label}
                <span className={`text-[9px] ${isActive ? 'text-black/50' : 'text-white/20'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        {claimError && <p className="mt-2 text-xs text-red-300">{claimError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" key={activeTab} className="px-4 pb-6 space-y-3">
          {filtered.map((coupon) => {
            const isAvailable = coupon.status === 'available';
            const isExpanded = expandedId === coupon.id;
            const canUseNow = coupon.source === 'claimed';

            return (
              <motion.div key={coupon.id} variants={itemVariants}>
                <Card
                  className={`overflow-hidden cursor-pointer active:scale-[0.98] transition-transform ${
                    isAvailable ? 'border-white/10' : 'border-white/5 opacity-60'
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : coupon.id)}
                >
                  <div className="flex items-stretch">
                    <div
                      className={`w-[80px] flex flex-col items-center justify-center py-4 relative flex-shrink-0 ${
                        isAvailable ? 'bg-app-red' : 'bg-white/[0.03]'
                      }`}
                    >
                      {coupon.discountType === 'percent' ? (
                        <>
                          <span className={`text-2xl font-black leading-none ${isAvailable ? 'text-white' : 'text-white/40'}`}>
                            {coupon.discount}
                          </span>
                          <span className={`text-[10px] font-bold ${isAvailable ? 'text-white/60' : 'text-white/25'}`}>% OFF</span>
                        </>
                      ) : coupon.discountType === 'amount' ? (
                        <>
                          <span className={`text-2xl font-black leading-none ${isAvailable ? 'text-white' : 'text-white/40'}`}>
                            {coupon.discount}
                          </span>
                          <span className={`text-[10px] font-bold ${isAvailable ? 'text-white/60' : 'text-white/25'}`}>บาท</span>
                        </>
                      ) : (
                        <span className={`text-lg font-black ${isAvailable ? 'text-white' : 'text-white/40'}`}>{coupon.discount}</span>
                      )}

                      <div className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-app-card" />
                      <div className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-app-card" />
                    </div>

                    <div className="w-0 border-r border-dashed border-white/10" />

                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <IconBox id={coupon.iconId} size={14} boxSize="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-bold truncate ${isAvailable ? 'text-white' : 'text-white/50'}`}>{coupon.title}</p>
                          <p className="text-white/30 text-[10px] mt-0.5 truncate">{coupon.description}</p>
                        </div>
                        {coupon.status === 'used' && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                            ใช้แล้ว
                          </Badge>
                        )}
                        {coupon.status === 'expired' && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0">
                            หมดอายุ
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/25">
                        <span className="flex items-center gap-1">
                          <Ico id={1112} size={10} className="opacity-50" />
                          {coupon.expiryDate}
                        </span>
                        {coupon.minSpend > 0 && <span>ขั้นต่ำ {coupon.minSpend}฿</span>}
                        {isAvailable && coupon.daysLeft <= 7 && (
                          <span className="text-app-red font-bold">เหลือ {coupon.daysLeft} วัน</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && isAvailable && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator className="bg-white/5" />
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-black border border-white/10 flex items-center justify-center">
                              <Ico id={30} size={11} />
                            </div>
                            <span className="text-[11px] font-mono text-white/50 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                              {coupon.code}
                            </span>
                          </div>

                          {canUseNow ? (
                            <Button
                              size="sm"
                              onClick={(e) => handleUseCoupon(coupon, e)}
                              className="text-xs h-8 rounded-full px-4 bg-app-red hover:bg-red-600"
                            >
                              ใช้คูปอง
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => void handleClaimCoupon(coupon, e)}
                              disabled={claimCouponMutation.isPending}
                              className="text-xs h-8 rounded-full px-4 bg-white text-black hover:bg-white/90 disabled:opacity-50"
                            >
                              {claimCouponMutation.isPending ? 'กำลังรับ...' : 'รับคูปอง'}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Ico id={12394} size={28} className="opacity-25" />
              </div>
              <p className="text-white/30 text-sm font-medium">ยังไม่มีคูปอง</p>
              <p className="text-white/15 text-xs mt-1">ยังไม่มีคูปองในหมวดนี้</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
