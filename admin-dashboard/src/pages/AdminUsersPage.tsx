import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, ShieldCheck } from 'lucide-react';
import api, { type AdminRole, type AdminUser, type BranchOption } from '@/services/api';

interface AdminUsersPageProps {
  admin: AdminUser;
  branches: BranchOption[];
}

type Adminฉบับร่าง = {
  id?: string;
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  branchScopes: Array<{
    branchId: string;
    canViewRevenue: boolean;
    canManageMachines: boolean;
    canManageCoupons: boolean;
  }>;
};

function createEmptyฉบับร่าง(): Adminฉบับร่าง {
  return {
    email: '',
    password: '',
    name: '',
    role: 'branch_admin',
    isActive: true,
    branchScopes: [],
  };
}

function toฉบับร่าง(user: AdminUser): Adminฉบับร่าง {
  return {
    id: user.id,
    email: user.email,
    password: '',
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    branchScopes: user.scopes.map((scope) => ({
      branchId: scope.branchId,
      canViewRevenue: scope.canViewRevenue,
      canManageMachines: scope.canManageMachines,
      canManageCoupons: scope.canManageCoupons,
    })),
  };
}

export function AdminUsersPage({ admin, branches }: AdminUsersPageProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [draft, setฉบับร่าง] = useState<Adminฉบับร่าง>(createEmptyฉบับร่าง());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.fetchAdminUsers();
        if (cancelled) {
          return;
        }

        setUsers(response);
        const preferred = response.find((item) => item.id === selectedId) ?? response[0] ?? null;
        if (preferred && selectedId !== 'new') {
          setฉบับร่าง(toฉบับร่าง(preferred));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'โหลดรายชื่อแอดมินไม่สำเร็จ');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedUser = useMemo(
    () => (selectedId === 'new' ? null : users.find((user) => user.id === selectedId) ?? null),
    [selectedId, users]
  );

  async function saveUser() {
    setSaving(true);
    setError(null);

    try {
      if (selectedId === 'new' || !draft.id) {
        await api.createAdminUser({
          email: draft.email,
          password: draft.password,
          name: draft.name,
          role: draft.role,
          branchScopes: draft.role === 'hq_admin' ? [] : draft.branchScopes,
        });
      } else {
        const payload: any = {
          email: draft.email,
          name: draft.name,
          role: draft.role,
          isActive: draft.isActive,
          branchScopes: draft.role === 'hq_admin' ? [] : draft.branchScopes,
        };

        if (draft.password) {
          payload.password = draft.password;
        }

        await api.updateAdminUser(draft.id, payload);
      }

      const nextUsers = await api.fetchAdminUsers();
      setUsers(nextUsers);
      const persisted = nextUsers.find((item) => item.email === draft.email) ?? nextUsers[0] ?? null;
      if (persisted) {
        setSelectedId(persisted.id);
        setฉบับร่าง(toฉบับร่าง(persisted));
      }
    } catch (err: any) {
      setError(err.message || 'บันทึกผู้ใช้แอดมินไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function toggleBranch(branchId: string, enabled: boolean) {
    setฉบับร่าง((current) => {
      if (!enabled) {
        return {
          ...current,
          branchScopes: current.branchScopes.filter((scope) => scope.branchId !== branchId),
        };
      }

      if (current.branchScopes.some((scope) => scope.branchId === branchId)) {
        return current;
      }

      return {
        ...current,
        branchScopes: [
          ...current.branchScopes,
          {
            branchId,
            canViewRevenue: true,
            canManageMachines: true,
            canManageCoupons: true,
          },
        ],
      };
    });
  }

  function toggleScopePermission(branchId: string, key: 'canViewRevenue' | 'canManageMachines' | 'canManageCoupons') {
    setฉบับร่าง((current) => ({
      ...current,
      branchScopes: current.branchScopes.map((scope) =>
        scope.branchId === branchId ? { ...scope, [key]: !scope[key] } : scope
      ),
    }));
  }

  return (
    <div className="max-w-[1500px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">จัดการผู้ใช้แอดมิน</h2>
          <p className="mt-1 text-sm text-gray-500">สร้างแอดมิน HQ และแอดมินสาขา กำหนดขอบเขตสาขา และควบคุมสิทธิ์การปฏิบัติงาน</p>
        </div>
        <button
          onClick={() => {
            setSelectedId('new');
            setฉบับร่าง(createEmptyฉบับร่าง());
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
        >
          <Plus className="h-4 w-4" />
          New admin
        </button>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                setSelectedId(user.id);
                setฉบับร่าง(toฉบับร่าง(user));
              }}
              className={`w-full rounded-2xl border p-5 text-left transition-all ${
                selectedId === user.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.name}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                  {user.role === 'hq_admin' ? 'HQ' : 'Branch'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/20 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">สถานะ</p>
                  <p className="mt-1 text-white">{user.isActive ? 'active' : 'inactive'}</p>
                </div>
                <div className="rounded-xl bg-black/20 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Scopes</p>
                  <p className="mt-1 text-white">{user.role === 'hq_admin' ? 'ทุกสาขา' : user.scopes.length}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">{selectedId === 'new' ? 'สร้างแอดมิน' : 'Edit admin'}</p>
              <h3 className="text-xl font-bold text-white">{selectedUser?.name ?? 'New admin account'}</h3>
            </div>
            <button
              onClick={() => void saveUser()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : selectedId === 'new' ? 'สร้างแอดมิน' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ชื่อ" value={draft.name} onChange={(value) => setฉบับร่าง((current) => ({ ...current, name: value }))} />
              <Field label="Email" value={draft.email} onChange={(value) => setฉบับร่าง((current) => ({ ...current, email: value }))} />
              <Field
                label={selectedId === 'new' ? 'Password' : 'Reset password'}
                value={draft.password}
                onChange={(value) => setฉบับร่าง((current) => ({ ...current, password: value }))}
                type="password"
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-gray-400">Role</span>
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setฉบับร่าง((current) => ({
                      ...current,
                      role: event.target.value as AdminRole,
                      branchScopes: event.target.value === 'hq_admin' ? [] : current.branchScopes,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white focus:border-red-500/50 focus:outline-none"
                >
                  <option value="hq_admin">HQ Admin</option>
                  <option value="branch_admin">Branch Admin</option>
                </select>
              </label>
            </div>

            <ToggleField
              label="Account active"
              checked={draft.isActive}
              onChange={(checked) => setฉบับร่าง((current) => ({ ...current, isActive: checked }))}
            />

            {draft.role === 'branch_admin' && (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <h4 className="font-semibold text-white">กำหนดขอบเขตสาขา</h4>
                <p className="mt-1 text-sm text-gray-500">กำหนดสาขาและสิทธิ์แบบละเอียดสำหรับแอดมินสาขา</p>

                <div className="mt-4 space-y-3">
                  {branches.map((branch) => {
                    const scope = draft.branchScopes.find((item) => item.branchId === branch.id);
                    const enabled = Boolean(scope);

                    return (
                      <div key={branch.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-white">{branch.name}</p>
                            <p className="text-xs text-gray-500">{branch.code}</p>
                          </div>
                          <ToggleField label="กำหนดแล้ว" checked={enabled} onChange={(checked) => toggleBranch(branch.id, checked)} compact />
                        </div>

                        {enabled && scope && (
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {[
                              ['canViewRevenue', 'ดูรายได้'],
                              ['canManageMachines', 'จัดการเครื่อง'],
                              ['canManageCoupons', 'Manage coupons'],
                            ].map(([key, label]) => (
                              <ToggleField
                                key={key}
                                label={label}
                                checked={scope[key as keyof typeof scope] as boolean}
                                onChange={() =>
                                  toggleScopePermission(
                                    branch.id,
                                    key as 'canViewRevenue' | 'canManageMachines' | 'canManageCoupons'
                                  )
                                }
                                compact
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
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

function ToggleField({
  label,
  checked,
  onChange,
  compact = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between rounded-xl border border-gray-700/50 bg-gray-800/40 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      }`}
    >
      <span className={compact ? 'text-xs text-gray-300' : 'text-sm text-gray-300'}>{label}</span>
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


