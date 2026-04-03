import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Plus, Save } from 'lucide-react';
import api, { type AdminUser, type BranchOption, type BranchSettings, type BranchSummary } from '@/services/api';

interface BranchesPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
  onBranchesChanged: () => Promise<void>;
}

type Branchฉบับร่าง = {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  address: string;
  area: string;
  type: string;
  ownershipType: 'company_owned' | 'franchise';
  franchiseCode: string;
  lat: number;
  lng: number;
  mapsUrl: string;
  promptPayId: string;
  promptPayName: string;
  ownerName: string;
  hours: string;
  isActive: boolean;
  settings: BranchSettings;
};

const defaultSettings: BranchSettings = {
  timezone: 'Asia/Bangkok',
  currency: 'THB',
  locale: 'th-TH',
  pointsEarnRate: 10,
  pointsMinSpend: 1,
  allowsPointRedemption: true,
  receiptFooter: '',
  supportPhone: '',
  maxConcurrentSessions: 2,
  washStartGraceMinutes: 15,
};

function createEmptyฉบับร่าง(): Branchฉบับร่าง {
  return {
    code: '',
    name: '',
    shortName: '',
    address: '',
    area: '',
    type: 'car',
    ownershipType: 'franchise',
    franchiseCode: '',
    lat: 13.7563,
    lng: 100.5018,
    mapsUrl: '',
    promptPayId: '',
    promptPayName: '',
    ownerName: '',
    hours: '06:00 - 22:00',
    isActive: true,
    settings: { ...defaultSettings },
  };
}

function toฉบับร่าง(branch: BranchSummary): Branchฉบับร่าง {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    shortName: branch.shortName ?? '',
    address: branch.address,
    area: branch.area,
    type: branch.type,
    ownershipType: branch.ownershipType,
    franchiseCode: branch.franchiseCode ?? '',
    lat: branch.lat,
    lng: branch.lng,
    mapsUrl: branch.mapsUrl ?? '',
    promptPayId: branch.promptPayId,
    promptPayName: branch.promptPayName,
    ownerName: branch.ownerName ?? '',
    hours: branch.hours ?? '',
    isActive: branch.isActive,
    settings: {
      ...defaultSettings,
      ...branch.settings,
      receiptFooter: branch.settings?.receiptFooter ?? '',
      supportPhone: branch.settings?.supportPhone ?? '',
    },
  };
}

export function BranchesPage({ admin, branchId, onBranchesChanged }: BranchesPageProps) {
  const [items, setItems] = useState<BranchSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setฉบับร่าง] = useState<Branchฉบับร่าง>(createEmptyฉบับร่าง());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchBranches(branchId);
        if (cancelled) {
          return;
        }

        setItems(response);
        setError(null);
        if (response.length === 0) {
          setSelectedId(admin.role === 'hq_admin' ? 'new' : null);
          setฉบับร่าง(createEmptyฉบับร่าง());
          return;
        }

        const preferredBranch =
          (branchId ? response.find((branch) => branch.id === branchId) : undefined) ??
          (selectedId && selectedId !== 'new' ? response.find((branch) => branch.id === selectedId) : undefined) ??
          response[0];

        setSelectedId(preferredBranch.id);
        setฉบับร่าง(toฉบับร่าง(preferredBranch));
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load branches');
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
  }, [admin.role, branchId]);

  const scopedสาขา = useMemo(() => {
    if (admin.role === 'hq_admin') {
      return items;
    }

    return items.filter((branch) => admin.branchIds.includes(branch.id));
  }, [admin, items]);

  const selectedBranch = selectedId && selectedId !== 'new' ? items.find((branch) => branch.id === selectedId) ?? null : null;

  async function saveBranch() {
    setSaving(true);
    setError(null);

    const payload = {
      code: draft.code,
      name: draft.name,
      shortName: draft.shortName || null,
      address: draft.address,
      area: draft.area,
      type: draft.type,
      ownershipType: draft.ownershipType,
      franchiseCode: draft.franchiseCode || null,
      lat: Number(draft.lat),
      lng: Number(draft.lng),
      mapsUrl: draft.mapsUrl || null,
      promptPayId: draft.promptPayId,
      promptPayName: draft.promptPayName,
      ownerName: draft.ownerName || null,
      hours: draft.hours || null,
      isActive: draft.isActive,
      settings: {
        ...draft.settings,
        receiptFooter: draft.settings.receiptFooter || null,
        supportPhone: draft.settings.supportPhone || null,
      },
    };

    try {
      if (selectedId === 'new' || !draft.id) {
        await api.createBranch(payload as any);
      } else {
        await api.updateBranch(draft.id, payload as any);
      }

      await onBranchesChanged();
      const response = await api.fetchBranches(branchId);
      setItems(response);
      const persisted = response.find((branch) => branch.code === draft.code) ?? response.find((branch) => branch.id === draft.id) ?? response[0];
      if (persisted) {
        setSelectedId(persisted.id);
        setฉบับร่าง(toฉบับร่าง(persisted));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{admin.role === 'hq_admin' ? 'จัดการสาขา' : 'ข้อมูลและการตั้งค่าสาขา'}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {admin.role === 'hq_admin'
              ? 'จัดการข้อมูลสาขา การชำระเงิน รูปแบบการถือครอง และการตั้งค่าการปฏิบัติงานจากฝั่ง HQ'
              : 'ตรวจสอบและอัปเดตรายละเอียดสาขาในขอบเขตที่ได้รับมอบหมาย'}
          </p>
        </div>

        {admin.role === 'hq_admin' && (
          <button
            onClick={() => {
              setSelectedId('new');
              setฉบับร่าง(createEmptyฉบับร่าง());
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            สาขาใหม่
          </button>
        )}
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดสาขา...</div>}

          {!loading &&
            scopedสาขา.map((branch) => (
              <button
                key={branch.id}
                onClick={() => {
                  setSelectedId(branch.id);
                  setฉบับร่าง(toฉบับร่าง(branch));
                }}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === branch.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{branch.name}</h3>
                      <p className="text-xs text-gray-500">{branch.code}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                    {branch.isActive ? 'active' : 'inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-gray-500" />
                    <div>
                      <p>{branch.address}</p>
                      <p className="text-xs text-gray-500">{branch.area}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="rounded-xl bg-black/20 px-3 py-2">
                      <p className="text-lg font-bold text-white">{branch.machineCount}</p>
                      <p className="text-[11px] text-gray-500">เครื่อง</p>
                    </div>
                    <div className="rounded-xl bg-black/20 px-3 py-2">
                      <p className="text-lg font-bold text-white">{branch.todaySessions}</p>
                      <p className="text-[11px] text-gray-500">รอบวันนี้</p>
                    </div>
                    <div className="rounded-xl bg-black/20 px-3 py-2">
                      <p className="text-lg font-bold text-white">{branch.todayRevenue.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-500">THB today</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                {selectedId === 'new' ? 'สร้างสาขา' : 'ตั้งค่าสาขา'}
              </p>
              <h3 className="text-xl font-bold text-white">
                {selectedId === 'new' ? 'ตั้งค่าสาขาใหม่' : selectedBranch?.name ?? 'แบบฟอร์มสาขา'}
              </h3>
            </div>
            {(admin.role === 'hq_admin' || selectedBranch) && (
              <button
                onClick={() => void saveBranch()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : selectedId === 'new' ? 'สร้างสาขา' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            )}
          </div>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ชื่อสาขา" value={draft.name} onChange={(value) => setฉบับร่าง((current) => ({ ...current, name: value }))} />
              <Field label="ชื่อย่อ" value={draft.shortName} onChange={(value) => setฉบับร่าง((current) => ({ ...current, shortName: value }))} />
              <Field label="รหัส" value={draft.code} onChange={(value) => setฉบับร่าง((current) => ({ ...current, code: value.toUpperCase() }))} />
              <Field label="พื้นที่" value={draft.area} onChange={(value) => setฉบับร่าง((current) => ({ ...current, area: value }))} />
              <Field label="ที่อยู่" value={draft.address} onChange={(value) => setฉบับร่าง((current) => ({ ...current, address: value }))} className="md:col-span-2" />
              <Field label="ประเภท" value={draft.type} onChange={(value) => setฉบับร่าง((current) => ({ ...current, type: value }))} />
              <SelectField
                label="รูปแบบการถือครอง"
                value={draft.ownershipType}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, ownershipType: value as 'company_owned' | 'franchise' }))}
                options={[
                  ['company_owned', 'บริษัทเป็นเจ้าของ'],
                  ['franchise', 'แฟรนไชส์'],
                ]}
              />
              <Field label="รหัสแฟรนไชส์" value={draft.franchiseCode} onChange={(value) => setฉบับร่าง((current) => ({ ...current, franchiseCode: value }))} />
              <Field label="เวลาทำการ" value={draft.hours} onChange={(value) => setฉบับร่าง((current) => ({ ...current, hours: value }))} />
              <Field label="ละติจูด" type="number" value={String(draft.lat)} onChange={(value) => setฉบับร่าง((current) => ({ ...current, lat: Number(value) }))} />
              <Field label="ลองจิจูด" type="number" value={String(draft.lng)} onChange={(value) => setฉบับร่าง((current) => ({ ...current, lng: Number(value) }))} />
              <Field label="ลิงก์แผนที่" value={draft.mapsUrl} onChange={(value) => setฉบับร่าง((current) => ({ ...current, mapsUrl: value }))} className="md:col-span-2" />
              <Field label="รหัส PromptPay" value={draft.promptPayId} onChange={(value) => setฉบับร่าง((current) => ({ ...current, promptPayId: value }))} />
              <Field label="ชื่อ PromptPay" value={draft.promptPayName} onChange={(value) => setฉบับร่าง((current) => ({ ...current, promptPayName: value }))} />
              <Field label="ชื่อเจ้าของ" value={draft.ownerName} onChange={(value) => setฉบับร่าง((current) => ({ ...current, ownerName: value }))} />
              <ToggleField
                label="สาขาactiveอยู่"
                checked={draft.isActive}
                onChange={(checked) => setฉบับร่าง((current) => ({ ...current, isActive: checked }))}
              />
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
              <h4 className="font-semibold text-white">การตั้งค่าการปฏิบัติงาน</h4>
              <p className="mt-1 text-sm text-gray-500">การตั้งค่าเหล่านี้ส่งผลต่อราคา แต้ม และการควบคุมรอบล้างแบบเรียลไทม์</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field
                  label="เบอร์ซัพพอร์ต"
                  value={draft.settings.supportPhone ?? ''}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, supportPhone: value } }))}
                />
                <Field
                  label="ข้อความท้ายใบเสร็จ"
                  value={draft.settings.receiptFooter ?? ''}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, receiptFooter: value } }))}
                />
                <Field
                  label="อัตราแต้มสะสม"
                  type="number"
                  value={String(draft.settings.pointsEarnRate)}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, pointsEarnRate: Number(value) } }))}
                />
                <Field
                  label="ยอดขั้นต่ำสำหรับแต้ม"
                  type="number"
                  value={String(draft.settings.pointsMinSpend)}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, pointsMinSpend: Number(value) } }))}
                />
                <Field
                  label="จำนวนรอบพร้อมกันสูงสุด"
                  type="number"
                  value={String(draft.settings.maxConcurrentSessions)}
                  onChange={(value) =>
                    setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, maxConcurrentSessions: Number(value) } }))
                  }
                />
                <Field
                  label="เวลาผ่อนผันเริ่มล้าง"
                  type="number"
                  value={String(draft.settings.washStartGraceMinutes)}
                  onChange={(value) =>
                    setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, washStartGraceMinutes: Number(value) } }))
                  }
                />
                <Field
                  label="เขตเวลา"
                  value={draft.settings.timezone}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, timezone: value } }))}
                />
                <Field
                  label="ภาษา"
                  value={draft.settings.locale}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, locale: value } }))}
                />
                <ToggleField
                  label="อนุญาตใช้แต้ม"
                  checked={draft.settings.allowsPointRedemption}
                  onChange={(checked) =>
                    setฉบับร่าง((current) => ({ ...current, settings: { ...current.settings, allowsPointRedemption: checked } }))
                  }
                />
              </div>
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
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
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
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white focus:border-red-500/50 focus:outline-none"
      >
        {options.map(([optionValue, labelValue]) => (
          <option key={optionValue} value={optionValue}>
            {labelValue}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/40 px-4 py-3">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
          checked ? 'bg-red-500' : 'bg-gray-700'
        }`}
      >
        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}



