import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  CircleOff,
  Plus,
  Save,
  Search,
  Store,
  TicketPercent,
} from 'lucide-react';
import api, {
  type AdminCouponRecord,
  type AdminPackageRecord,
  type AdminUser,
  type BranchOption,
  type CouponScope,
  type CouponStatus,
  type DiscountType,
} from '@/services/api';

interface CouponsPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

type Couponฉบับร่าง = {
  id?: string;
  code: string;
  title: string;
  description: string;
  scope: CouponScope;
  status: CouponStatus;
  discountType: DiscountType;
  discountValue: string;
  minSpend: string;
  maxUses: string;
  maxUsesPerUser: string;
  validFrom: string;
  validUntil: string;
  branchIds: string[];
  packageIds: string[];
};

function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoString(value: string) {
  return new Date(value).toISOString();
}

function createEmptyฉบับร่าง(defaultBranchId?: string | null): Couponฉบับร่าง {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    code: '',
    title: '',
    description: '',
    scope: defaultBranchId ? 'branch_only' : 'selected_branches',
    status: 'active',
    discountType: 'percent',
    discountValue: '10',
    minSpend: '0',
    maxUses: '0',
    maxUsesPerUser: '1',
    validFrom: toDateTimeInput(now.toISOString()),
    validUntil: toDateTimeInput(tomorrow.toISOString()),
    branchIds: defaultBranchId ? [defaultBranchId] : [],
    packageIds: [],
  };
}

function toฉบับร่าง(coupon: AdminCouponRecord): Couponฉบับร่าง {
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description ?? '',
    scope: coupon.scope,
    status: coupon.status,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minSpend: String(coupon.minSpend),
    maxUses: String(coupon.maxUses),
    maxUsesPerUser: String(coupon.maxUsesPerUser),
    validFrom: toDateTimeInput(coupon.validFrom),
    validUntil: toDateTimeInput(coupon.validUntil),
    branchIds: coupon.branchIds,
    packageIds: coupon.packageIds,
  };
}

function formatส่วนลด(
  coupon: Pick<Couponฉบับร่าง, 'discountType' | 'discountValue'> | Pick<AdminCouponRecord, 'discountType' | 'discountValue'>
) {
  return coupon.discountType === 'percent'
    ? `${coupon.discountValue}% off`
    : `${Number(coupon.discountValue).toLocaleString()} THB off`;
}

function normalizeฉบับร่างForScope(
  draft: Couponฉบับร่าง,
  scope: CouponScope,
  scopedBranchIds: string[],
  selectedBranchId?: string | null
) {
  if (scope === 'all_branches') {
    return { ...draft, scope, branchIds: [] };
  }

  if (scope === 'branch_only') {
    const nextBranchId = draft.branchIds[0] ?? selectedBranchId ?? scopedBranchIds[0];
    return { ...draft, scope, branchIds: nextBranchId ? [nextBranchId] : [] };
  }

  return {
    ...draft,
    scope,
    branchIds:
      draft.branchIds.length > 0
        ? draft.branchIds.filter((branchItemId) => scopedBranchIds.includes(branchItemId))
        : selectedBranchId
          ? [selectedBranchId]
          : [],
  };
}

export function CouponsPage({ admin, branchId, branches }: CouponsPageProps) {
  const [coupons, setCoupons] = useState<AdminCouponRecord[]>([]);
  const [packages, setแพ็กเกจ] = useState<AdminPackageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>('new');
  const [draft, setฉบับร่าง] = useState<Couponฉบับร่าง>(createEmptyฉบับร่าง(branchId));
  const [statusFilter, setStatusFilter] = useState<CouponStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scopedสาขา = useMemo(() => {
    const available =
      admin.role === 'hq_admin' ? branches : branches.filter((item) => admin.branchIds.includes(item.id));

    if (branchId) {
      return available.filter((item) => item.id === branchId);
    }

    return available;
  }, [admin.branchIds, admin.role, branchId, branches]);

  const scopedBranchIds = useMemo(() => scopedสาขา.map((item) => item.id), [scopedสาขา]);

  const selectedCoupon = useMemo(
    () => (selectedId && selectedId !== 'new' ? coupons.find((item) => item.id === selectedId) ?? null : null),
    [coupons, selectedId]
  );

  const availableScopeOptions = useMemo<Array<{ value: CouponScope; label: string; helper: string }>>(() => {
    const options: Array<{ value: CouponScope; label: string; helper: string }> = [
      { value: 'selected_branches', label: 'สาขาที่เลือก', helper: 'เลือกสาขาที่มีสิทธิ์ได้หนึ่งสาขาหรือหลายสาขา' },
      { value: 'branch_only', label: 'สาขาเดียว', helper: 'คูปองผูกกับสาขาเดียวเท่านั้น' },
    ];

    if (admin.role === 'hq_admin') {
      options.unshift({
        value: 'all_branches',
        label: 'ทุกสาขา',
        helper: 'คูปองระดับ HQ ใช้งานได้ทั้งเครือข่าย',
      });
    }

    return options;
  }, [admin.role]);

  const availableสถานะOptions = useMemo<CouponStatus[]>(() => {
    return admin.role === 'hq_admin' ? ['draft', 'active', 'inactive', 'archived'] : ['draft', 'active', 'inactive'];
  }, [admin.role]);

  async function reloadCoupons(nextSelectedId?: string | 'new' | null) {
    const [couponResponse, packageResponse] = await Promise.all([
      api.fetchAdminCoupons({
        branchId,
        status: statusFilter,
        search: search.trim() || undefined,
        includeArchived: true,
      }),
      api.fetchAdminPackages({ branchId, includeInactive: true }),
    ]);

    setCoupons(couponResponse);
    setแพ็กเกจ(packageResponse);

    const preferred =
      (nextSelectedId && nextSelectedId !== 'new' ? couponResponse.find((item) => item.id === nextSelectedId) : undefined) ??
      (draft.id ? couponResponse.find((item) => item.id === draft.id) : undefined) ??
      couponResponse[0] ??
      null;

    if (preferred) {
      setSelectedId(preferred.id);
      setฉบับร่าง(toฉบับร่าง(preferred));
      return preferred;
    }

    setSelectedId('new');
    setฉบับร่าง(createEmptyฉบับร่าง(branchId));
    return null;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [couponResponse, packageResponse] = await Promise.all([
          api.fetchAdminCoupons({
            branchId,
            status: statusFilter,
            search: search.trim() || undefined,
            includeArchived: true,
          }),
          api.fetchAdminPackages({ branchId, includeInactive: true }),
        ]);

        if (cancelled) {
          return;
        }

        setCoupons(couponResponse);
        setแพ็กเกจ(packageResponse);
        setError(null);

        const preferred =
          (selectedId && selectedId !== 'new' ? couponResponse.find((item) => item.id === selectedId) : undefined) ??
          couponResponse[0] ??
          null;

        if (preferred) {
          setSelectedId(preferred.id);
          setฉบับร่าง(toฉบับร่าง(preferred));
        } else {
          setSelectedId('new');
          setฉบับร่าง(createEmptyฉบับร่าง(branchId));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load coupons');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, statusFilter, search]);

  useEffect(() => {
    if (selectedId === 'new') {
      setฉบับร่าง((current) => normalizeฉบับร่างForScope(current, current.scope, scopedBranchIds, branchId));
    }
  }, [branchId, scopedBranchIds.join('|'), selectedId]);

  async function saveCoupon() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        code: draft.code.trim().toUpperCase(),
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        scope: draft.scope,
        status: draft.status,
        discountType: draft.discountType,
        discountValue: Number(draft.discountValue),
        minSpend: Number(draft.minSpend),
        maxUses: Number(draft.maxUses),
        maxUsesPerUser: Number(draft.maxUsesPerUser),
        packageIds: draft.packageIds,
        branchIds: draft.scope === 'all_branches' ? [] : draft.branchIds,
        validFrom: toIsoString(draft.validFrom),
        validUntil: toIsoString(draft.validUntil),
      };

      if (selectedId === 'new' || !draft.id) {
        const created = await api.createAdminCoupon(payload);
        setSuccess('Coupon created successfully.');
        await reloadCoupons(created.id);
      } else {
        await api.updateAdminCoupon(draft.id, payload);
        setSuccess('Coupon updated successfully.');
        await reloadCoupons(draft.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivation(coupon: AdminCouponRecord) {
    setTogglingId(coupon.id);
    setError(null);
    setSuccess(null);

    try {
      await api.setAdminCouponActivation(coupon.id, coupon.status !== 'active');
      setSuccess(`Coupon ${coupon.status === 'active' ? 'deactivated' : 'activated'} successfully.`);
      await reloadCoupons(coupon.id);
    } catch (err: any) {
      setError(err.message || 'Failed to update coupon activation');
    } finally {
      setTogglingId(null);
    }
  }

  function toggleBranchAssignment(targetBranchId: string, enabled: boolean) {
    setฉบับร่าง((current) => {
      if (current.scope === 'branch_only') {
        return { ...current, branchIds: enabled ? [targetBranchId] : [] };
      }

      if (!enabled) {
        return { ...current, branchIds: current.branchIds.filter((branchItemId) => branchItemId !== targetBranchId) };
      }

      if (current.branchIds.includes(targetBranchId)) {
        return current;
      }

      return { ...current, branchIds: [...current.branchIds, targetBranchId] };
    });
  }

  function togglePackage(packageId: string) {
    setฉบับร่าง((current) => ({
      ...current,
      packageIds: current.packageIds.includes(packageId)
        ? current.packageIds.filter((id) => id !== packageId)
        : [...current.packageIds, packageId],
    }));
  }

  return (
    <div className="max-w-[1650px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดการคูปอง</h2>
          <p className="mt-1 text-sm text-gray-500">
            สร้าง เปิดใช้งาน และดูแลคูปองตามขอบเขตสาขาด้วยกฎจาก backend จริง ช่วงเวลาใช้งาน เงื่อนไข และข้อมูลการใช้งาน
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedId('new');
            setฉบับร่าง(createEmptyฉบับร่าง(branchId));
            setError(null);
            setSuccess(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          <Plus className="h-4 w-4" />
          คูปองใหม่
        </button>
      </div>

      {branchId && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          ตัวกรองสาขาบนแถบด้านบนทำงานแล้ว รายการคูปองและแพ็กเกจที่ใช้ได้จะอยู่ในขอบเขตของสาขาที่เลือก
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-4 rounded-[24px] border border-white/5 bg-white/[0.03] p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-gray-300">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหารหัส ชื่อ หรือรายละเอียด"
            className="w-full bg-transparent outline-none placeholder:text-gray-600"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as CouponStatus | 'all')}
          className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="draft">ฉบับร่าง</option>
          <option value="active">active</option>
          <option value="inactive">ปิดactive</option>
          <option value="archived">เก็บถาวร</option>
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดคูปอง...</div>}

          {!loading && coupons.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
              ไม่พบคูปองในขอบเขตและตัวกรองปัจจุบัน
            </div>
          )}

          {!loading &&
            coupons.map((coupon) => (
              <button
                key={coupon.id}
                onClick={() => {
                  setSelectedId(coupon.id);
                  setฉบับร่าง(toฉบับร่าง(coupon));
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === coupon.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <TicketPercent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{coupon.title}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{coupon.code}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${
                      coupon.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : coupon.status === 'draft'
                          ? 'bg-amber-500/10 text-amber-300'
                          : coupon.status === 'archived'
                            ? 'bg-gray-700/60 text-gray-300'
                            : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {coupon.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-black/20 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">ส่วนลด</p>
                    <p className="mt-1 text-sm font-bold text-white">{formatส่วนลด(coupon)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">ใช้แล้ว</p>
                    <p className="mt-1 text-lg font-bold text-white">{coupon.usedCount}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">สาขา</p>
                    <p className="mt-1 text-lg font-bold text-white">{coupon.scope === 'all_branches' ? 'All' : coupon.branches.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-3.5 w-3.5 text-gray-500" />
                    <span>
                      {new Date(coupon.validFrom).toLocaleDateString()} - {new Date(coupon.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                    <span>{coupon.scope.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                {selectedId === 'new' ? 'สร้างคูปอง' : 'ตั้งค่าคูปอง'}
              </p>
              <h3 className="text-xl font-bold text-white">
                {selectedId === 'new' ? 'ตั้งค่าคูปองใหม่' : selectedCoupon?.title ?? 'Coupon detail'}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedCoupon && (
                <button
                  onClick={() => void toggleActivation(selectedCoupon)}
                  disabled={togglingId === selectedCoupon.id}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                    selectedCoupon.status === 'active' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-500'
                  } disabled:opacity-60`}
                >
                  {selectedCoupon.status === 'active' ? <CircleOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {togglingId === selectedCoupon.id
                    ? 'กำลังอัปเดต...'
                    : selectedCoupon.status === 'active'
                      ? 'ปิดใช้งาน'
                      : 'เปิดใช้งาน'}
                </button>
              )}

              <button
                onClick={() => void saveCoupon()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : selectedId === 'new' ? 'สร้างคูปอง' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>

          {selectedCoupon && (
            <div className="mb-6 grid gap-3 md:grid-cols-4">
              <StatCard label="รับสิทธิ์" value={selectedCoupon.usage.claimedCount.toLocaleString()} />
              <StatCard label="ใช้สิทธิ์" value={selectedCoupon.usage.redemptionCount.toLocaleString()} />
              <StatCard
                label="สิทธิ์ที่เหลือ"
                value={selectedCoupon.usage.remainingUses == null ? 'Unlimited' : selectedCoupon.usage.remainingUses.toLocaleString()}
              />
              <StatCard label="แพ็กเกจที่ใช้ได้" value={selectedCoupon.packageIds.length === 0 ? 'All' : String(selectedCoupon.packageIds.length)} />
            </div>
          )}

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="รหัสคูปอง" value={draft.code} onChange={(value) => setฉบับร่าง((current) => ({ ...current, code: value.toUpperCase() }))} />
              <Field label="ชื่อเรื่อง" value={draft.title} onChange={(value) => setฉบับร่าง((current) => ({ ...current, title: value }))} />
              <Field label="รายละเอียด" value={draft.description} onChange={(value) => setฉบับร่าง((current) => ({ ...current, description: value }))} className="md:col-span-2" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="รูปแบบส่วนลด"
                value={draft.discountType}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, discountType: value as DiscountType }))}
                options={[
                  { value: 'percent', label: 'เปอร์เซ็นต์' },
                  { value: 'fixed', label: 'จำนวนเงินคงที่' },
                ]}
              />
              <Field label="มูลค่าส่วนลด" type="number" value={draft.discountValue} onChange={(value) => setฉบับร่าง((current) => ({ ...current, discountValue: value }))} />
              <Field label="ยอดซื้อขั้นต่ำ" type="number" value={draft.minSpend} onChange={(value) => setฉบับร่าง((current) => ({ ...current, minSpend: value }))} />
              <SelectField
                label="สถานะ"
                value={draft.status}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, status: value as CouponStatus }))}
                options={availableสถานะOptions.map((item) => ({ value: item, label: item.replace(/_/g, ' ') }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="เริ่มใช้ได้" type="datetime-local" value={draft.validFrom} onChange={(value) => setฉบับร่าง((current) => ({ ...current, validFrom: value }))} />
              <Field label="สิ้นสุดการactive" type="datetime-local" value={draft.validUntil} onChange={(value) => setฉบับร่าง((current) => ({ ...current, validUntil: value }))} />
              <Field label="จำนวนครั้งactiveสูงสุด" type="number" value={draft.maxUses} onChange={(value) => setฉบับร่าง((current) => ({ ...current, maxUses: value }))} />
              <Field label="จำกัดต่อผู้ใช้" type="number" value={draft.maxUsesPerUser} onChange={(value) => setฉบับร่าง((current) => ({ ...current, maxUsesPerUser: value }))} />
            </div>

            <section className="space-y-4 rounded-3xl border border-white/5 bg-black/20 p-5">
              <div>
                <p className="text-sm font-semibold text-white">กำหนดสาขา</p>
                <p className="mt-1 text-xs text-gray-500">คูปองทำงานตามโมเดลสาขาเดิม และเคารพสิทธิ์การจัดการคูปองของแอดมิน</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {availableScopeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setฉบับร่าง((current) => normalizeฉบับร่างForScope(current, option.value, scopedBranchIds, branchId))}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      draft.scope === option.value ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className="font-medium text-white">{option.label}</p>
                    <p className="mt-1 text-xs text-gray-500">{option.helper}</p>
                  </button>
                ))}
              </div>

              {draft.scope === 'branch_only' && (
                <SelectField
                  label="กำหนดแล้ว branch"
                  value={draft.branchIds[0] ?? ''}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, branchIds: value ? [value] : [] }))}
                  options={scopedสาขา.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
                />
              )}

              {draft.scope === 'selected_branches' && (
                <div className="grid gap-3 md:grid-cols-2">
                  {scopedสาขา.map((item) => {
                    const checked = draft.branchIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
                          checked ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleBranchAssignment(item.id, event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-white/10 bg-transparent text-red-500"
                        />
                        <span>
                          {item.name}
                          <span className="block text-xs text-gray-500">{item.code}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {draft.scope === 'all_branches' && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  คูปองนี้จะถูกใช้เป็นคูปองระดับ HQ ครอบคลุมทั้งเครือข่าย และไม่ต้องผูกสาขา
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-3xl border border-white/5 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">แพ็กเกจที่ใช้ได้</p>
                  <p className="mt-1 text-xs text-gray-500">ปล่อยว่างเพื่อให้คูปองใช้ได้กับทุกแพ็กเกจที่ผ่านเงื่อนไขลูกค้า</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                  {draft.packageIds.length === 0 ? 'ทุกแพ็กเกจ' : `${draft.packageIds.length} selected`}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {packages.map((pkg) => {
                  const checked = draft.packageIds.includes(pkg.id);
                  return (
                    <label
                      key={pkg.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
                        checked ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePackage(pkg.id)}
                        className="mt-1 h-4 w-4 rounded border-white/10 bg-transparent text-red-500"
                      />
                      <span>
                        {pkg.name}
                        <span className="block text-xs text-gray-500">
                          {pkg.code} • {pkg.prices.S.toLocaleString()} / {pkg.prices.M.toLocaleString()} / {pkg.prices.L.toLocaleString()} THB
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            {selectedCoupon && selectedCoupon.usage.branchUsage.length > 0 && (
              <section className="space-y-4 rounded-3xl border border-white/5 bg-black/20 p-5">
                <div>
                  <p className="text-sm font-semibold text-white">การactiveแยกตามสาขา</p>
                  <p className="mt-1 text-xs text-gray-500">สรุปนี้ดึงจากประวัติการใช้คูปองที่บันทึกอยู่ในระบบจริงแล้ว</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedCoupon.usage.branchUsage.map((item) => {
                    const branch = branches.find((candidate) => candidate.id === item.branchId);
                    return (
                      <div key={item.branchId} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                        <p className="text-sm font-medium text-white">{branch?.name ?? item.branchId}</p>
                        <p className="mt-1 text-xs text-gray-500">{branch?.code ?? 'Unknown branch'}</p>
                        <p className="mt-3 text-2xl font-bold text-white">{item.usedCount}</p>
                        <p className="text-xs text-gray-500">ใช้แล้ว</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}



