import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, CircleOff, Megaphone, Plus, Save, Search, Store } from 'lucide-react';
import api, { type AdminPromotionRecord, type AdminUser, type BranchOption } from '@/services/api';

interface PromotionsPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

type Promotionฉบับร่าง = {
  id?: string;
  title: string;
  description: string;
  image: string;
  gradient: string;
  conditions: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  branchIds: string[];
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

function createEmptyฉบับร่าง(defaultBranchId?: string | null): Promotionฉบับร่าง {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    title: '',
    description: '',
    image: '',
    gradient: 'from-red-600 to-orange-500',
    conditions: '',
    validFrom: toDateTimeInput(now.toISOString()),
    validUntil: toDateTimeInput(nextMonth.toISOString()),
    isActive: true,
    branchIds: defaultBranchId ? [defaultBranchId] : [],
  };
}

function toฉบับร่าง(promotion: AdminPromotionRecord): Promotionฉบับร่าง {
  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description ?? '',
    image: promotion.image ?? '',
    gradient: promotion.gradient ?? '',
    conditions: promotion.conditions ?? '',
    validFrom: toDateTimeInput(promotion.validFrom),
    validUntil: toDateTimeInput(promotion.validUntil),
    isActive: promotion.isActive,
    branchIds: promotion.branchIds,
  };
}

export function PromotionsPage({ admin, branchId, branches }: PromotionsPageProps) {
  const [promotions, setPromotions] = useState<AdminPromotionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [draft, setฉบับร่าง] = useState<Promotionฉบับร่าง>(createEmptyฉบับร่าง(branchId));
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scopedสาขา = useMemo(() => {
    const base = admin.role === 'hq_admin' ? branches : branches.filter((item) => admin.branchIds.includes(item.id));
    return branchId ? base.filter((item) => item.id === branchId) : base;
  }, [admin.branchIds, admin.role, branchId, branches]);

  const selectedPromotion = useMemo(
    () => (selectedId === 'new' ? null : promotions.find((item) => item.id === selectedId) ?? null),
    [promotions, selectedId]
  );

  async function reloadPromotions(nextSelectedId?: string | 'new') {
    const response = await api.fetchAdminPromotions({
      branchId,
      search: search.trim() || undefined,
      includeInactive: true,
    });
    setPromotions(response);

    const preferred =
      (nextSelectedId && nextSelectedId !== 'new' ? response.find((item) => item.id === nextSelectedId) : undefined) ??
      (draft.id ? response.find((item) => item.id === draft.id) : undefined) ??
      response[0] ??
      null;

    if (preferred) {
      setSelectedId(preferred.id);
      setฉบับร่าง(toฉบับร่าง(preferred));
      return;
    }

    setSelectedId('new');
    setฉบับร่าง(createEmptyฉบับร่าง(branchId));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchAdminPromotions({
          branchId,
          search: search.trim() || undefined,
          includeInactive: true,
        });

        if (cancelled) {
          return;
        }

        setPromotions(response);
        setError(null);
        const preferred = response[0] ?? null;
        if (preferred) {
          setSelectedId(preferred.id);
          setฉบับร่าง(toฉบับร่าง(preferred));
        } else {
          setSelectedId('new');
          setฉบับร่าง(createEmptyฉบับร่าง(branchId));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load promotions');
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
  }, [branchId, search]);

  async function savePromotion() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        image: draft.image.trim() || null,
        gradient: draft.gradient.trim() || null,
        conditions: draft.conditions.trim() || null,
        validFrom: toIsoString(draft.validFrom),
        validUntil: toIsoString(draft.validUntil),
        isActive: draft.isActive,
        branchIds: draft.branchIds,
      };

      if (selectedId === 'new' || !draft.id) {
        const created = await api.createAdminPromotion(payload);
        setSuccess('สร้างโปรโมชันสำเร็จ');
        await reloadPromotions(created.id);
      } else {
        await api.updateAdminPromotion(draft.id, payload);
        setSuccess('Promotion updated successfully.');
        await reloadPromotions(draft.id);
      }
    } catch (err: any) {
      setError(err.message || 'บันทึกโปรโมชันไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivation(promotion: AdminPromotionRecord) {
    setTogglingId(promotion.id);
    setError(null);
    setSuccess(null);

    try {
      await api.setAdminPromotionActivation(promotion.id, !promotion.isActive);
      setSuccess(`Promotion ${promotion.isActive ? 'disabled' : 'enabled'} successfully.`);
      await reloadPromotions(promotion.id);
    } catch (err: any) {
      setError(err.message || 'Failed to update promotion activation');
    } finally {
      setTogglingId(null);
    }
  }

  function toggleBranch(targetBranchId: string, checked: boolean) {
    setฉบับร่าง((current) => ({
      ...current,
      branchIds: checked
        ? Array.from(new Set([...current.branchIds, targetBranchId]))
        : current.branchIds.filter((item) => item !== targetBranchId),
    }));
  }

  return (
    <div className="max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดการโปรโมชัน</h2>
          <p className="mt-1 text-sm text-gray-500">
            ดูแลโปรโมชันที่ลูกค้าเห็นอยู่ให้ต่อเนื่อง โดยมีการจัดการเวลา การทยอยเปิดใช้สาขา และการเปิด/ปิดจากแอดมินจริง
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
          โปรโมชันใหม่
        </button>
      </div>

      {branchId && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          ขอบเขตสาขาทำงานแล้ว แอดมินสาขาจัดการได้เฉพาะโปรโมชันที่ผูกกับสาขาที่ตนเข้าถึงได้
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
            placeholder="ค้นหาชื่อหรือข้อความของโปรโมชัน"
            className="w-full bg-transparent outline-none placeholder:text-gray-600"
          />
        </label>

        <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-gray-400">
          {promotions.length} promotions in scope
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดโปรโมชัน...</div>}

          {!loading &&
            promotions.map((promotion) => (
              <button
                key={promotion.id}
                onClick={() => {
                  setSelectedId(promotion.id);
                  setฉบับร่าง(toฉบับร่าง(promotion));
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === promotion.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{promotion.title}</h3>
                      <p className="text-xs text-gray-500">{promotion.branchIds.length === 0 ? 'โปรโมชันระดับเครือข่าย' : `${promotion.branchIds.length} สาขาที่กำหนด`}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${promotion.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-700/60 text-gray-300'}`}>
                    {promotion.isActive ? 'active' : 'inactive'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-3.5 w-3.5 text-gray-500" />
                    <span>
                      {new Date(promotion.validFrom).toLocaleDateString()} - {new Date(promotion.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                    <span>{promotion.branchIds.length === 0 ? 'ทุกสาขา' : promotion.branchIds.length}</span>
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">{selectedId === 'new' ? 'สร้างโปรโมชัน' : 'รายละเอียดโปรโมชัน'}</p>
              <h3 className="text-xl font-bold text-white">{selectedId === 'new' ? 'โปรโมชันใหม่สำหรับลูกค้า' : selectedPromotion?.title ?? 'รายละเอียดโปรโมชัน'}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedPromotion && (
                <button
                  onClick={() => void toggleActivation(selectedPromotion)}
                  disabled={togglingId === selectedPromotion.id}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                    selectedPromotion.isActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-500'
                  } disabled:opacity-60`}
                >
                  {selectedPromotion.isActive ? <CircleOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {togglingId === selectedPromotion.id ? 'กำลังอัปเดต...' : selectedPromotion.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </button>
              )}

              <button
                onClick={() => void savePromotion()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : selectedId === 'new' ? 'สร้างโปรโมชัน' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อเรื่อง" value={draft.title} onChange={(value) => setฉบับร่าง((current) => ({ ...current, title: value }))} />
            <Field label="Gradient class" value={draft.gradient} onChange={(value) => setฉบับร่าง((current) => ({ ...current, gradient: value }))} />
            <Field label="Image URL" value={draft.image} onChange={(value) => setฉบับร่าง((current) => ({ ...current, image: value }))} className="md:col-span-2" />
            <TextAreaField label="รายละเอียด" value={draft.description} onChange={(value) => setฉบับร่าง((current) => ({ ...current, description: value }))} className="md:col-span-2" />
            <TextAreaField label="Conditions" value={draft.conditions} onChange={(value) => setฉบับร่าง((current) => ({ ...current, conditions: value }))} className="md:col-span-2" />
            <Field label="เริ่มใช้ได้" type="datetime-local" value={draft.validFrom} onChange={(value) => setฉบับร่าง((current) => ({ ...current, validFrom: value }))} />
            <Field label="สิ้นสุดการactive" type="datetime-local" value={draft.validUntil} onChange={(value) => setฉบับร่าง((current) => ({ ...current, validUntil: value }))} />
          </div>

          <section className="mt-6 space-y-4 rounded-3xl border border-white/5 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Branch rollout</p>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty only when HQ wants a network-wide promotion. Branch admins must keep at least one branch assigned.
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-gray-300">
                <span>active</span>
                <input type="checkbox" checked={draft.isActive} onChange={(event) => setฉบับร่าง((current) => ({ ...current, isActive: event.target.checked }))} />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {scopedสาขา.map((branch) => {
                const checked = draft.branchIds.includes(branch.id);
                return (
                  <label
                    key={branch.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
                      checked ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => toggleBranch(branch.id, event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-white/10 bg-transparent text-red-500"
                    />
                    <span>
                      {branch.name}
                      <span className="block text-xs text-gray-500">{branch.code}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
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

function TextAreaField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
      />
    </label>
  );
}



