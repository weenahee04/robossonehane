import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Package, Plus, Save, Store, Tag } from 'lucide-react';
import api, {
  type AdminPackageRecord,
  type AdminUser,
  type BranchOption,
} from '@/services/api';

interface PackagesPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

type Packageฉบับร่าง = {
  id?: string;
  code: string;
  name: string;
  description: string;
  vehicleType: string;
  priceS: string;
  priceM: string;
  priceL: string;
  stepsText: string;
  stepDuration: string;
  sortOrder: string;
  image: string;
  isActive: boolean;
};

type BranchConfigฉบับร่าง = {
  isActive: boolean;
  isVisible: boolean;
  displayName: string;
  descriptionOverride: string;
  priceOverrideS: string;
  priceOverrideM: string;
  priceOverrideL: string;
};

function createEmptyPackageฉบับร่าง(): Packageฉบับร่าง {
  return {
    code: '',
    name: '',
    description: '',
    vehicleType: 'car',
    priceS: '0',
    priceM: '0',
    priceL: '0',
    stepsText: 'Pre-wash\nFoam\nRinse\nDry',
    stepDuration: '300',
    sortOrder: '0',
    image: '',
    isActive: true,
  };
}

function toPackageฉบับร่าง(pkg: AdminPackageRecord): Packageฉบับร่าง {
  return {
    id: pkg.id,
    code: pkg.code,
    name: pkg.name,
    description: pkg.description ?? '',
    vehicleType: pkg.vehicleType,
    priceS: String(pkg.prices.S),
    priceM: String(pkg.prices.M),
    priceL: String(pkg.prices.L),
    stepsText: pkg.steps.join('\n'),
    stepDuration: String(pkg.stepDuration),
    sortOrder: String(pkg.sortOrder),
    image: pkg.image ?? '',
    isActive: pkg.isActive,
  };
}

function createBranchConfigฉบับร่าง(pkg: AdminPackageRecord | null, branchId: string): BranchConfigฉบับร่าง {
  const config = pkg?.branchConfigs.find((item) => item.branchId === branchId);
  return {
    isActive: config?.isActive ?? true,
    isVisible: config?.isVisible ?? true,
    displayName: config?.displayName ?? '',
    descriptionOverride: config?.descriptionOverride ?? '',
    priceOverrideS: config?.priceOverrides.S != null ? String(config.priceOverrides.S) : '',
    priceOverrideM: config?.priceOverrides.M != null ? String(config.priceOverrides.M) : '',
    priceOverrideL: config?.priceOverrides.L != null ? String(config.priceOverrides.L) : '',
  };
}

function buildBranchConfigฉบับร่างs(
  pkg: AdminPackageRecord | null,
  branchOptions: BranchOption[]
): Record<string, BranchConfigฉบับร่าง> {
  return branchOptions.reduce<Record<string, BranchConfigฉบับร่าง>>((accumulator, branch) => {
    accumulator[branch.id] = createBranchConfigฉบับร่าง(pkg, branch.id);
    return accumulator;
  }, {});
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return Number(trimmed);
}

export function PackagesPage({ admin, branchId, branches }: PackagesPageProps) {
  const [packages, setแพ็กเกจ] = useState<AdminPackageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setฉบับร่าง] = useState<Packageฉบับร่าง>(createEmptyPackageฉบับร่าง());
  const [branchฉบับร่างs, setBranchฉบับร่างs] = useState<Record<string, BranchConfigฉบับร่าง>>({});
  const [loading, setLoading] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scopedสาขา = useMemo(() => {
    const available =
      admin.role === 'hq_admin' ? branches : branches.filter((branch) => admin.branchIds.includes(branch.id));

    if (branchId) {
      return available.filter((branch) => branch.id === branchId);
    }

    return available;
  }, [admin.branchIds, admin.role, branchId, branches]);

  const selectedPackage = useMemo(
    () => (selectedId && selectedId !== 'new' ? packages.find((pkg) => pkg.id === selectedId) ?? null : null),
    [packages, selectedId]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchAdminPackages({
          branchId,
          includeInactive: true,
        });

        if (cancelled) {
          return;
        }

        setแพ็กเกจ(response);
        setError(null);

        const preferred =
          (selectedId && selectedId !== 'new' ? response.find((item) => item.id === selectedId) : undefined) ??
          response[0] ??
          null;

        if (preferred) {
          setSelectedId(preferred.id);
          setฉบับร่าง(toPackageฉบับร่าง(preferred));
          setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(preferred, scopedสาขา));
          return;
        }

        if (admin.role === 'hq_admin') {
          setSelectedId('new');
          setฉบับร่าง(createEmptyPackageฉบับร่าง());
          setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(null, scopedสาขา));
        } else {
          setSelectedId(null);
          setฉบับร่าง(createEmptyPackageฉบับร่าง());
          setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(null, scopedสาขา));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load packages');
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
  }, [admin.role, branchId, scopedสาขา.length]);

  useEffect(() => {
    setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(selectedPackage, scopedสาขา));
  }, [selectedPackage, scopedสาขา]);

  async function reloadแพ็กเกจ(nextSelectedId?: string | 'new' | null) {
    const response = await api.fetchAdminPackages({
      branchId,
      includeInactive: true,
    });
    setแพ็กเกจ(response);

    const preferred =
      (nextSelectedId && nextSelectedId !== 'new' ? response.find((item) => item.id === nextSelectedId) : undefined) ??
      (draft.id ? response.find((item) => item.id === draft.id) : undefined) ??
      (draft.code ? response.find((item) => item.code === draft.code) : undefined) ??
      response[0] ??
      null;

    if (preferred) {
      setSelectedId(preferred.id);
      setฉบับร่าง(toPackageฉบับร่าง(preferred));
      setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(preferred, scopedสาขา));
      return preferred;
    }

    if (admin.role === 'hq_admin') {
      setSelectedId('new');
      setฉบับร่าง(createEmptyPackageฉบับร่าง());
      setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(null, scopedสาขา));
    }

    return null;
  }

  async function savePackage() {
    if (admin.role !== 'hq_admin') {
      return;
    }

    setSavingPackage(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        vehicleType: draft.vehicleType.trim(),
        priceS: Number(draft.priceS),
        priceM: Number(draft.priceM),
        priceL: Number(draft.priceL),
        steps: draft.stepsText
          .split('\n')
          .map((step) => step.trim())
          .filter(Boolean),
        stepDuration: Number(draft.stepDuration),
        sortOrder: Number(draft.sortOrder),
        image: draft.image.trim() || null,
        isActive: draft.isActive,
      };

      if (selectedId === 'new' || !draft.id) {
        const created = await api.createAdminPackage(payload);
        setSuccess('Package created successfully.');
        await reloadแพ็กเกจ(created.id);
      } else {
        await api.updateAdminPackage(draft.id, payload);
        setSuccess('Package updated successfully.');
        await reloadแพ็กเกจ(draft.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save package');
    } finally {
      setSavingPackage(false);
    }
  }

  async function togglePackageActivation(pkg: AdminPackageRecord) {
    if (admin.role !== 'hq_admin') {
      return;
    }

    setSavingPackage(true);
    setError(null);
    setSuccess(null);

    try {
      await api.setAdminPackageActivation(pkg.id, !pkg.isActive);
      setSuccess(`Package ${pkg.isActive ? 'deactivated' : 'activated'} successfully.`);
      await reloadแพ็กเกจ(pkg.id);
    } catch (err: any) {
      setError(err.message || 'Failed to update package activation');
    } finally {
      setSavingPackage(false);
    }
  }

  async function saveBranchConfig(targetBranchId: string) {
    if (!selectedPackage) {
      return;
    }

    const branchฉบับร่าง = branchฉบับร่างs[targetBranchId];
    if (!branchฉบับร่าง) {
      return;
    }

    setSavingBranchId(targetBranchId);
    setError(null);
    setSuccess(null);

    try {
      await api.updateBranchPackageConfig(selectedPackage.id, targetBranchId, {
        isActive: branchฉบับร่าง.isActive,
        isVisible: branchฉบับร่าง.isVisible,
        displayName: branchฉบับร่าง.displayName.trim() || null,
        descriptionOverride: branchฉบับร่าง.descriptionOverride.trim() || null,
        priceOverrideS: parseNullableNumber(branchฉบับร่าง.priceOverrideS),
        priceOverrideM: parseNullableNumber(branchฉบับร่าง.priceOverrideM),
        priceOverrideL: parseNullableNumber(branchฉบับร่าง.priceOverrideL),
      });
      setSuccess('Branch package configuration saved.');
      await reloadแพ็กเกจ(selectedPackage.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save branch configuration');
    } finally {
      setSavingBranchId(null);
    }
  }

  return (
    <div className="max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Package & Pricing Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage global wash packages, branch visibility, activation state, and branch-specific S/M/L pricing overrides.
          </p>
        </div>

        {admin.role === 'hq_admin' && (
          <button
            onClick={() => {
              setSelectedId('new');
              setฉบับร่าง(createEmptyPackageฉบับร่าง());
              setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(null, scopedสาขา));
              setSuccess(null);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            <Plus className="h-4 w-4" />
            แพ็กเกจใหม่
          </button>
        )}
      </div>

      {branchId && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          Editing branch rollout for the currently selected branch only.
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">Loading packages...</div>}

          {!loading &&
            packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelectedId(pkg.id);
                  setฉบับร่าง(toPackageฉบับร่าง(pkg));
                  setBranchฉบับร่างs(buildBranchConfigฉบับร่างs(pkg, scopedสาขา));
                  setError(null);
                  setSuccess(null);
                }}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === pkg.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{pkg.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{pkg.code}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${pkg.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-gray-700/60 text-gray-300'}`}>
                    {pkg.isActive ? 'active' : 'inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {(['S', 'M', 'L'] as const).map((size) => (
                    <div key={size} className="rounded-xl bg-black/20 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{size}</p>
                      <p className="mt-1 text-base font-bold text-white">{pkg.prices[size].toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-black/20 px-3 py-2 text-gray-300">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">สาขาที่แสดง</p>
                    <p className="mt-1 text-sm font-semibold text-white">{pkg.branchConfigStats.visible}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2 text-gray-300">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">คอนฟิกที่ใช้งานอยู่</p>
                    <p className="mt-1 text-sm font-semibold text-white">{pkg.branchConfigStats.active}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 px-3 py-2 text-gray-300">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">ส่วนปรับราคา</p>
                    <p className="mt-1 text-sm font-semibold text-white">{pkg.branchConfigStats.overriddenPricing}</p>
                  </div>
                </div>

                {admin.role === 'hq_admin' && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void togglePackageActivation(pkg);
                    }}
                    className="mt-4 inline-flex items-center gap-2 text-xs text-gray-400 transition-colors hover:text-white"
                  >
                    {pkg.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {pkg.isActive ? 'ปิดใช้งานแพ็กเกจ' : 'เปิดใช้งานแพ็กเกจ'}
                  </button>
                )}
              </button>
            ))}
        </div>

        <div className="space-y-6">
          <section className="gradient-card rounded-[28px] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
                  {selectedId === 'new' ? 'สร้างแพ็กเกจ' : admin.role === 'hq_admin' ? 'นิยามแพ็กเกจระดับ HQ' : 'รายละเอียดแพ็กเกจ'}
                </p>
                <h3 className="text-xl font-bold text-white">
                  {selectedId === 'new' ? 'แพ็กเกจล้างใหม่' : selectedPackage?.name ?? 'เลือกแพ็กเกจ'}
                </h3>
              </div>

              {admin.role === 'hq_admin' && (
                <button
                  onClick={() => void savePackage()}
                  disabled={savingPackage || selectedId === null}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingPackage ? 'Saving...' : selectedId === 'new' ? 'สร้างแพ็กเกจ' : 'บันทึกแพ็กเกจ'}
                </button>
              )}
            </div>

            {selectedId === null ? (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-400">
                No package is available in your scope yet.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="รหัส"
                  value={draft.code}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, code: value.toUpperCase() }))}
                />
                <Field
                  label="ชื่อ"
                  value={draft.name}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, name: value }))}
                />
                <Field
                  label="Vehicle type"
                  value={draft.vehicleType}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, vehicleType: value }))}
                />
                <Field
                  label="ลำดับแสดงผล"
                  type="number"
                  value={draft.sortOrder}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, sortOrder: value }))}
                />
                <Field
                  label="Base price S"
                  type="number"
                  value={draft.priceS}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, priceS: value }))}
                />
                <Field
                  label="Base price M"
                  type="number"
                  value={draft.priceM}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, priceM: value }))}
                />
                <Field
                  label="Base price L"
                  type="number"
                  value={draft.priceL}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, priceL: value }))}
                />
                <Field
                  label="Step duration (seconds)"
                  type="number"
                  value={draft.stepDuration}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, stepDuration: value }))}
                />
                <Field
                  label="Image URL"
                  value={draft.image}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, image: value }))}
                  className="md:col-span-2"
                />
                <TextAreaField
                  label="รายละเอียด"
                  value={draft.description}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, description: value }))}
                  className="md:col-span-2"
                />
                <TextAreaField
                  label="Steps (one per line)"
                  value={draft.stepsText}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(value) => setฉบับร่าง((current) => ({ ...current, stepsText: value }))}
                  className="md:col-span-2"
                />
                <ToggleField
                  label="Package active"
                  checked={draft.isActive}
                  disabled={admin.role !== 'hq_admin'}
                  onChange={(checked) => setฉบับร่าง((current) => ({ ...current, isActive: checked }))}
                  className="md:col-span-2"
                />
              </div>
            )}
          </section>

          <section className="gradient-card rounded-[28px] p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Branch rollout & pricing</p>
                <h3 className="text-xl font-bold text-white">Branch visibility, activation, and overrides</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Use empty override values to inherit HQ base pricing for S, M, and L.
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Scope</p>
                <p className="mt-1 text-sm font-semibold text-white">{admin.role === 'hq_admin' ? 'HQ + branch config' : 'กำหนดแล้ว branches only'}</p>
              </div>
            </div>

            {!selectedPackage ? (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-400">
                Save or select a package first before managing branch rollout.
              </div>
            ) : scopedสาขา.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-400">
                No branches are available in your current scope.
              </div>
            ) : (
              <div className="space-y-4">
                {scopedสาขา.map((branch) => {
                  const branchฉบับร่าง = branchฉบับร่างs[branch.id] ?? createBranchConfigฉบับร่าง(selectedPackage, branch.id);
                  const existingConfig = selectedPackage.branchConfigs.find((item) => item.branchId === branch.id) ?? null;

                  return (
                    <div key={branch.id} className="rounded-[24px] border border-white/5 bg-black/20 p-5">
                      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                            <Store className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{branch.name}</h4>
                            <p className="text-xs uppercase tracking-wide text-gray-500">{branch.code}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {existingConfig ? 'Branch config exists and can override defaults.' : 'No branch config yet. Saving will create one.'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => void saveBranchConfig(branch.id)}
                          disabled={savingBranchId === branch.id}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {savingBranchId === branch.id ? 'Saving...' : 'Save branch config'}
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <ToggleField
                          label="Branch config active"
                          checked={branchฉบับร่าง.isActive}
                          onChange={(checked) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, isActive: checked },
                            }))
                          }
                        />
                        <ToggleField
                          label="Visible in customer flow"
                          checked={branchฉบับร่าง.isVisible}
                          onChange={(checked) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, isVisible: checked },
                            }))
                          }
                        />
                        <Field
                          label="Display name override"
                          value={branchฉบับร่าง.displayName}
                          onChange={(value) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, displayName: value },
                            }))
                          }
                          className="xl:col-span-2"
                        />
                        <TextAreaField
                          label="รายละเอียด override"
                          value={branchฉบับร่าง.descriptionOverride}
                          onChange={(value) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, descriptionOverride: value },
                            }))
                          }
                          className="md:col-span-2 xl:col-span-4"
                        />
                        <Field
                          label={`Price override S (base ${selectedPackage.prices.S.toLocaleString()})`}
                          type="number"
                          value={branchฉบับร่าง.priceOverrideS}
                          onChange={(value) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, priceOverrideS: value },
                            }))
                          }
                        />
                        <Field
                          label={`Price override M (base ${selectedPackage.prices.M.toLocaleString()})`}
                          type="number"
                          value={branchฉบับร่าง.priceOverrideM}
                          onChange={(value) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, priceOverrideM: value },
                            }))
                          }
                        />
                        <Field
                          label={`Price override L (base ${selectedPackage.prices.L.toLocaleString()})`}
                          type="number"
                          value={branchฉบับร่าง.priceOverrideL}
                          onChange={(value) =>
                            setBranchฉบับร่างs((current) => ({
                              ...current,
                              [branch.id]: { ...branchฉบับร่าง, priceOverrideL: value },
                            }))
                          }
                        />
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Effective prices</p>
                          <div className="mt-3 flex items-center gap-2 text-sm text-white">
                            <span className="rounded-lg bg-black/30 px-2 py-1">S {existingConfig?.effectivePrices.S ?? selectedPackage.prices.S}</span>
                            <span className="rounded-lg bg-black/30 px-2 py-1">M {existingConfig?.effectivePrices.M ?? selectedPackage.prices.M}</span>
                            <span className="rounded-lg bg-black/30 px-2 py-1">L {existingConfig?.effectivePrices.L ?? selectedPackage.prices.L}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
        value={value}
        disabled={disabled}
        rows={4}
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
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/40 px-4 py-3 ${className ?? ''}`}>
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



