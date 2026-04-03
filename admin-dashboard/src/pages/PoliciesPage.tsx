import React, { useEffect, useMemo, useState } from 'react';
import { Save, SlidersHorizontal } from 'lucide-react';
import api, { type AdminUser, type BranchOption, type BranchSettings, type PolicySnapshot } from '@/services/api';

interface PoliciesPageProps {
  admin: AdminUser;
  branches: BranchOption[];
}

type Policyฉบับร่าง = {
  pointsEarnRate: string;
  pointsMinSpend: string;
  maxConcurrentSessions: string;
  washStartGraceMinutes: string;
  allowsPointRedemption: 'keep' | 'enable' | 'disable';
};

const emptyPolicyฉบับร่าง: Policyฉบับร่าง = {
  pointsEarnRate: '',
  pointsMinSpend: '',
  maxConcurrentSessions: '',
  washStartGraceMinutes: '',
  allowsPointRedemption: 'keep',
};

export function PoliciesPage({ admin, branches }: PoliciesPageProps) {
  const [snapshot, setSnapshot] = useState<PolicySnapshot | null>(null);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [draft, setฉบับร่าง] = useState<Policyฉบับร่าง>(emptyPolicyฉบับร่าง);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.fetchPolicySnapshot();
        if (!cancelled) {
          setSnapshot(response);
          setSelectedBranchIds(response.branches.map((branch) => branch.id));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load policies');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCount = selectedBranchIds.length;
  const allSelected = snapshot ? selectedCount === snapshot.branches.length : false;
  const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);

  async function applyนโยบาย() {
    const settings: Partial<BranchSettings> = {};

    if (draft.pointsEarnRate) settings.pointsEarnRate = Number(draft.pointsEarnRate);
    if (draft.pointsMinSpend) settings.pointsMinSpend = Number(draft.pointsMinSpend);
    if (draft.maxConcurrentSessions) settings.maxConcurrentSessions = Number(draft.maxConcurrentSessions);
    if (draft.washStartGraceMinutes) settings.washStartGraceMinutes = Number(draft.washStartGraceMinutes);
    if (draft.allowsPointRedemption === 'enable') settings.allowsPointRedemption = true;
    if (draft.allowsPointRedemption === 'disable') settings.allowsPointRedemption = false;

    if (Object.keys(settings).length === 0) {
      setError('กรุณาเลือกค่ากฎอย่างน้อยหนึ่งรายการก่อนนำไปใช้');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.applyBranchPolicies({
        branchIds: selectedBranchIds.length === snapshot?.branches.length ? undefined : selectedBranchIds,
        settings,
      });

      const refreshed = await api.fetchPolicySnapshot();
      setSnapshot(refreshed);
      setฉบับร่าง(emptyPolicyฉบับร่าง);
    } catch (err: any) {
      setError(err.message || 'Failed to apply policies');
    } finally {
      setSaving(false);
    }
  }

  if (admin.role !== 'hq_admin') {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-sm text-gray-400">
        เฉพาะ HQ admin เท่านั้นที่จัดการนโยบายส่วนกลางได้
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">ควบคุมนโยบายส่วนกลาง</h2>
          <p className="mt-1 text-sm text-gray-500">ปรับใช้นโยบายปฏิบัติงานมาตรฐานกับหนึ่งสาขา กลุ่มสาขา หรือทั้งเครือข่าย</p>
        </div>
        <button
          onClick={() => void applyนโยบาย()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Applying...' : 'นำไปใช้'}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Target branches</p>
              <h3 className="text-xl font-bold text-white">{selectedCount} selected</h3>
            </div>
            <button
              onClick={() =>
                setSelectedBranchIds(
                  allSelected ? [] : snapshot?.branches.map((branch) => branch.id) ?? []
                )
              }
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className="space-y-3">
            {snapshot?.branches.map((branch) => {
              const checked = selectedBranchIds.includes(branch.id);
              const branchLabel = branchMap.get(branch.id)?.shortName || branch.name;
              return (
                <label
                  key={branch.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    checked ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <div>
                    <p className="font-medium text-white">{branchLabel}</p>
                    <p className="text-xs text-gray-500">{branch.code}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setSelectedBranchIds((current) =>
                        event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id)
                      )
                    }
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="gradient-card rounded-[28px] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <SlidersHorizontal className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Bulk apply</p>
                <h3 className="text-xl font-bold text-white">การตั้งค่าการปฏิบัติงาน</h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="อัตราแต้มสะสม"
                value={draft.pointsEarnRate}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, pointsEarnRate: value }))}
              />
              <Field
                label="ยอดขั้นต่ำสำหรับแต้ม"
                value={draft.pointsMinSpend}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, pointsMinSpend: value }))}
              />
              <Field
                label="จำนวนรอบพร้อมกันสูงสุด"
                value={draft.maxConcurrentSessions}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, maxConcurrentSessions: value }))}
              />
              <Field
                label="เวลาผ่อนผันเริ่มล้าง"
                value={draft.washStartGraceMinutes}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, washStartGraceMinutes: value }))}
              />
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-gray-400">Point redemption policy</span>
                <select
                  value={draft.allowsPointRedemption}
                  onChange={(event) =>
                    setฉบับร่าง((current) => ({
                      ...current,
                      allowsPointRedemption: event.target.value as Policyฉบับร่าง['allowsPointRedemption'],
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white focus:border-red-500/50 focus:outline-none"
                >
                  <option value="keep">Keep current value</option>
                  <option value="enable">Enable redemption</option>
                  <option value="disable">Disable redemption</option>
                </select>
              </label>
            </div>
          </div>

          <div className="gradient-card rounded-[28px] p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Current branch settings</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot?.branches.map((branch) => (
                <div key={branch.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <p className="font-semibold text-white">{branch.shortName || branch.name}</p>
                  <div className="mt-3 grid gap-2 text-xs text-gray-400">
                    <p>อัตราแต้มสะสม: {branch.settings?.pointsEarnRate ?? '-'}</p>
                    <p>Min spend: {branch.settings?.pointsMinSpend ?? '-'}</p>
                    <p>Concurrent sessions: {branch.settings?.maxConcurrentSessions ?? '-'}</p>
                    <p>Grace minutes: {branch.settings?.washStartGraceMinutes ?? '-'}</p>
                    <p>Point redemption: {branch.settings?.allowsPointRedemption ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              ))}
            </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
      />
    </label>
  );
}



