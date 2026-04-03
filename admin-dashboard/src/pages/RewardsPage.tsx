import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleOff, Gift, Plus, Save, Search, Store, Tag } from 'lucide-react';
import api, { type AdminRewardRecord, type AdminUser, type BranchOption } from '@/services/api';

interface RewardsPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

type Rewardฉบับร่าง = {
  id?: string;
  code: string;
  name: string;
  description: string;
  pointsCost: string;
  category: string;
  tag: string;
  icon: string;
  iconBg: string;
  stock: string;
  sortOrder: string;
  branchIds: string[];
  isActive: boolean;
};

function createEmptyฉบับร่าง(defaultBranchId?: string | null): Rewardฉบับร่าง {
  return {
    code: '',
    name: '',
    description: '',
    pointsCost: '100',
    category: 'discount',
    tag: '',
    icon: 'gift',
    iconBg: 'bg-yellow-500/20',
    stock: '',
    sortOrder: '0',
    branchIds: defaultBranchId ? [defaultBranchId] : [],
    isActive: true,
  };
}

function toฉบับร่าง(reward: AdminRewardRecord): Rewardฉบับร่าง {
  return {
    id: reward.id,
    code: reward.code,
    name: reward.name,
    description: reward.description ?? '',
    pointsCost: String(reward.pointsCost),
    category: reward.category,
    tag: reward.tag ?? '',
    icon: reward.icon,
    iconBg: reward.iconBg ?? '',
    stock: reward.stock != null ? String(reward.stock) : '',
    sortOrder: String(reward.sortOrder),
    branchIds: reward.branchIds,
    isActive: reward.isActive,
  };
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

export function RewardsPage({ admin, branchId, branches }: RewardsPageProps) {
  const [rewards, setRewards] = useState<AdminRewardRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(admin.role === 'hq_admin' ? 'new' : null);
  const [draft, setฉบับร่าง] = useState<Rewardฉบับร่าง>(createEmptyฉบับร่าง(branchId));
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

  const selectedReward = useMemo(
    () => (selectedId && selectedId !== 'new' ? rewards.find((item) => item.id === selectedId) ?? null : null),
    [rewards, selectedId]
  );

  async function reloadRewards(nextSelectedId?: string | 'new' | null) {
    const response = await api.fetchAdminRewards({
      branchId,
      search: search.trim() || undefined,
      includeInactive: true,
    });
    setRewards(response);

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

    setSelectedId(admin.role === 'hq_admin' ? 'new' : null);
    setฉบับร่าง(createEmptyฉบับร่าง(branchId));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchAdminRewards({
          branchId,
          search: search.trim() || undefined,
          includeInactive: true,
        });

        if (cancelled) {
          return;
        }

        setRewards(response);
        setError(null);
        if (response[0]) {
          setSelectedId(response[0].id);
          setฉบับร่าง(toฉบับร่าง(response[0]));
        } else {
          setSelectedId(admin.role === 'hq_admin' ? 'new' : null);
          setฉบับร่าง(createEmptyฉบับร่าง(branchId));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'โหลดรางวัลไม่สำเร็จ');
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
  }, [admin.role, branchId, search]);

  async function saveReward() {
    if (admin.role !== 'hq_admin') {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        pointsCost: Number(draft.pointsCost),
        category: draft.category.trim(),
        tag: draft.tag.trim() || null,
        icon: draft.icon.trim(),
        iconBg: draft.iconBg.trim() || null,
        stock: parseNullableNumber(draft.stock),
        sortOrder: Number(draft.sortOrder),
        branchIds: draft.branchIds,
        isActive: draft.isActive,
      };

      if (selectedId === 'new' || !draft.id) {
        const created = await api.createAdminReward(payload);
        setSuccess('สร้างรางวัลสำเร็จ');
        await reloadRewards(created.id);
      } else {
        await api.updateAdminReward(draft.id, payload);
        setSuccess('อัปเดตรางวัลสำเร็จ');
        await reloadRewards(draft.id);
      }
    } catch (err: any) {
      setError(err.message || 'บันทึกรางวัลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivation(reward: AdminRewardRecord) {
    if (admin.role !== 'hq_admin') {
      return;
    }

    setTogglingId(reward.id);
    setError(null);
    setSuccess(null);

    try {
      await api.setAdminRewardActivation(reward.id, !reward.isActive);
      setSuccess(`รางวัล ${reward.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} สำเร็จ`);
      await reloadRewards(reward.id);
    } catch (err: any) {
      setError(err.message || 'เปลี่ยนสถานะรางวัลไม่สำเร็จ');
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
          <h2 className="text-2xl font-bold text-white">แคตตาล็อกรางวัล</h2>
          <p className="mt-1 text-sm text-gray-500">
            จัดการแหล่งข้อมูลหลักของการแลกแต้มให้รางวัลลูกค้าและกฎการแลกของระบบตรงกัน
          </p>
        </div>

        {admin.role === 'hq_admin' && (
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
            รางวัลใหม่
          </button>
        )}
      </div>

      {admin.role !== 'hq_admin' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          แอดมินสาขาเข้าดูได้แบบอ่านอย่างเดียว HQ ควบคุมแคตตาล็อกรางวัลและแหล่งข้อมูลหลักสำหรับการแลก
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
            placeholder="ค้นหารหัสหรือชื่อรางวัล"
            className="w-full bg-transparent outline-none placeholder:text-gray-600"
          />
        </label>

        <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-gray-400">
          {rewards.length} รางวัลในขอบเขต
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดรางวัล...</div>}

          {!loading &&
            rewards.map((reward) => (
              <button
                key={reward.id}
                onClick={() => {
                  setSelectedId(reward.id);
                  setฉบับร่าง(toฉบับร่าง(reward));
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === reward.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Gift className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{reward.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{reward.code}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${reward.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-700/60 text-gray-300'}`}>
                    {reward.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="แต้ม" value={reward.pointsCost.toLocaleString()} />
                  <MiniStat label="สต็อก" value={reward.stock == null ? 'ไม่จำกัด' : reward.stock.toLocaleString()} />
                  <MiniStat label="สาขา" value={reward.branchIds.length === 0 ? 'ทุกสาขา' : String(reward.branchIds.length)} />
                </div>
              </button>
            ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                {selectedId === 'new' ? 'สร้างรางวัล' : admin.role === 'hq_admin' ? 'ข้อมูลรางวัล' : 'รายละเอียดรางวัล'}
              </p>
              <h3 className="text-xl font-bold text-white">{selectedId === 'new' ? 'รางวัลใหม่' : selectedReward?.name ?? 'รายละเอียดรางวัล'}</h3>
            </div>

            {admin.role === 'hq_admin' && (
              <div className="flex flex-wrap items-center gap-3">
                {selectedReward && (
                  <button
                    onClick={() => void toggleActivation(selectedReward)}
                    disabled={togglingId === selectedReward.id}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                      selectedReward.isActive ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-500'
                    } disabled:opacity-60`}
                  >
                    {selectedReward.isActive ? <CircleOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {togglingId === selectedReward.id ? 'กำลังอัปเดต...' : selectedReward.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                  </button>
                )}

                <button
                  onClick={() => void saveReward()}
                  disabled={saving || selectedId === null}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'กำลังบันทึก...' : selectedId === 'new' ? 'สร้างรางวัล' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            )}
          </div>

          {selectedId === null ? (
            <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-400">ไม่มีรางวัลที่มองเห็นได้ในขอบเขตปัจจุบัน</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="รหัส" value={draft.code} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, code: value.toUpperCase() }))} />
              <Field label="ชื่อ" value={draft.name} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, name: value }))} />
              <Field label="จำนวนแต้มที่ใช้" type="number" value={draft.pointsCost} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, pointsCost: value }))} />
              <Field label="หมวดหมู่" value={draft.category} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, category: value }))} />
              <Field label="แท็ก" value={draft.tag} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, tag: value }))} />
              <Field label="ลำดับแสดงผล" type="number" value={draft.sortOrder} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, sortOrder: value }))} />
              <Field label="ไอคอน" value={draft.icon} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, icon: value }))} />
              <Field label="คลาสพื้นหลังไอคอน" value={draft.iconBg} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, iconBg: value }))} />
              <Field label="สต็อก" type="number" value={draft.stock} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, stock: value }))} />
              <ToggleField label="ใช้งาน" checked={draft.isActive} disabled={admin.role !== 'hq_admin'} onChange={(checked) => setฉบับร่าง((current) => ({ ...current, isActive: checked }))} />
              <TextAreaField label="รายละเอียด" value={draft.description} disabled={admin.role !== 'hq_admin'} onChange={(value) => setฉบับร่าง((current) => ({ ...current, description: value }))} className="md:col-span-2" />

              <section className="md:col-span-2 space-y-4 rounded-3xl border border-white/5 bg-black/20 p-5">
                <div>
                  <p className="text-sm font-semibold text-white">สิทธิ์ใช้งานตามสาขา</p>
                  <p className="mt-1 text-xs text-gray-500">ปล่อยว่างได้หากต้องการให้รางวัลนี้แลกได้ทุกสาขา</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {scopedสาขา.map((branch) => {
                    const checked = draft.branchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
                          checked ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-gray-300'
                        } ${admin.role !== 'hq_admin' ? 'opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={admin.role !== 'hq_admin'}
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
          )}
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
        <Tag className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      <textarea
        rows={4}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/40 px-4 py-3">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-red-500' : 'bg-gray-700'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}



