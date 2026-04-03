import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  Cpu,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { type AdminUser, type DashboardData } from '@/services/api';

interface DashboardPageProps {
  admin: AdminUser;
  branchId: string | null;
}

export function DashboardPage({ admin, branchId }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.fetchDashboard(branchId);
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const selectedBranchชื่อ = useMemo(() => {
    if (!branchId) {
      return admin.role === 'hq_admin' ? 'ภาพรวม HQ ครอบคลุมทุกสาขา' : 'ขอบเขตสาขาที่ได้รับมอบหมาย';
    }

    return admin.scopes.find((scope) => scope.branchId === branchId)?.branch?.name ?? 'สาขาที่เลือก';
  }, [admin, branchId]);

  const summary = data?.summary;
  const customerGrowthDelta =
    summary && summary.customerGrowthPrevious > 0
      ? Math.round(((summary.customerGrowthCurrent - summary.customerGrowthPrevious) / summary.customerGrowthPrevious) * 100)
      : summary?.customerGrowthCurrent ?? 0;

  return (
    <div className="max-w-[1440px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500">
            {admin.role === 'hq_admin' ? 'ศูนย์ควบคุม HQ' : 'ภาพรวมงานสาขา'}
          </p>
          <h2 className="text-2xl font-bold text-white">{selectedBranchชื่อ}</h2>
          <p className="mt-1 text-sm text-gray-500">
            มองเห็นภาพรวมสถานะเครื่อง ปริมาณงาน การเติบโตของลูกค้า และประสิทธิภาพรายได้
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">สถานะเครื่องออนไลน์</p>
            <p className="mt-2 text-2xl font-black text-white">{data?.machineHealth.onlineRate ?? 0}%</p>
            <p className="text-xs text-gray-500">{data?.machineHealth.online ?? 0} ออนไลน์ / {data?.machineHealth.offline ?? 0} ออฟไลน์</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">การเติบโตของลูกค้า</p>
            <p className="mt-2 text-2xl font-black text-white">{summary?.customerGrowthCurrent ?? 0}</p>
            <p className="text-xs text-gray-500">ช่วง 14 วันที่ผ่านมาเทียบกับช่วงก่อนหน้า: {customerGrowthDelta}%</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ฐานรายได้</p>
            <p className="mt-2 text-2xl font-black text-white">{(summary?.totalRevenue ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">ยอดยืนยันแล้วในขอบเขตปัจจุบัน (บาท)</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {[
          { label: 'สาขา', value: summary?.totalBranches ?? 0, icon: Building2, tone: 'text-cyan-300 bg-cyan-500/10' },
          { label: 'เครื่อง', value: summary?.totalMachines ?? 0, icon: Cpu, tone: 'text-amber-300 bg-amber-500/10' },
          { label: 'จำนวนรอบทั้งหมด', value: summary?.totalSessions ?? 0, icon: Activity, tone: 'text-violet-300 bg-violet-500/10' },
          { label: 'รอบวันนี้', value: summary?.todaySessions ?? 0, icon: BarChart3, tone: 'text-blue-300 bg-blue-500/10' },
          { label: 'รอบที่กำลังทำงาน', value: summary?.activeSessions ?? 0, icon: ShieldCheck, tone: 'text-emerald-300 bg-emerald-500/10' },
          { label: 'รายได้วันนี้', value: summary?.todayRevenue ?? 0, icon: DollarSign, tone: 'text-green-300 bg-green-500/10' },
          { label: 'ลูกค้า', value: summary?.totalCustomers ?? 0, icon: Users, tone: 'text-orange-300 bg-orange-500/10' },
          { label: 'เติบโต 14 วัน', value: summary?.customerGrowthCurrent ?? 0, icon: TrendingUp, tone: 'text-rose-300 bg-rose-500/10' },
        ].map((card) => {
          const ไอคอน = card.icon;
          return (
            <div key={card.label} className="gradient-card rounded-2xl p-5">
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}>
                <ไอคอน className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-white">{card.value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="gradient-card rounded-2xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">แนวโน้มรายได้</h3>
              <p className="text-xs text-gray-500">ยอดชำระที่ยืนยันแล้วใน 7 วันล่าสุด</p>
            </div>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data?.revenueTrend ?? []}>
              <defs>
                <linearGradient id="dashboardรายได้" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                formatter={(value: number, key: string) => [value.toLocaleString(), key]}
              />
              <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} fill="url(#dashboardรายได้)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="gradient-card rounded-2xl p-5">
          <h3 className="mb-4 font-semibold text-white">สถานะเครื่อง</h3>
          <div className="space-y-3">
            {[
              ['ออนไลน์', data?.machineHealth.online ?? 0],
              ['ซ่อมบำรุง', data?.machineHealth.maintenance ?? 0],
              ['กำลังล้าง', data?.machineHealth.washing ?? 0],
              ['จองแล้ว', data?.machineHealth.reserved ?? 0],
              ['ออฟไลน์', data?.machineHealth.offline ?? 0],
            ].map(([label, count]) => (
              <div key={label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                <span className="text-sm text-gray-300">{label}</span>
                <span className="text-sm font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="gradient-card rounded-2xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">การเติบโตของลูกค้า</h3>
              <p className="text-xs text-gray-500">ลูกค้าใหม่ในขอบเขตปัจจุบันย้อนหลัง 14 วัน</p>
            </div>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.customerGrowthTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                formatter={(value: number) => [value.toLocaleString(), 'ลูกค้า']}
              />
              <Bar dataKey="customers" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="gradient-card rounded-2xl p-5">
          <h3 className="mb-4 font-semibold text-white">สถานะรอบวันนี้</h3>
          <div className="space-y-3">
            {Object.entries(data?.sessionStatusSummary ?? {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                <span className="text-sm capitalize text-gray-300">{status.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="gradient-card rounded-2xl p-5">
          <h3 className="mb-4 font-semibold text-white">เปรียบเทียบสาขาวันนี้</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.branchPerformance ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="shortName" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                formatter={(value: number) => [value.toLocaleString(), 'รายได้']}
              />
              <Bar dataKey="todayRevenue" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="gradient-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">รอบล่าสุด</h3>
            <span className="text-xs text-gray-500">{data?.recentSessions.length ?? 0} รายการ</span>
          </div>
          <div className="space-y-3">
            {(data?.recentSessions ?? []).map((session) => (
              <div key={session.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{session.user.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {session.branch.shortName || session.branch.name} • {session.machine.name} • {session.package.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                    {session.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {session.totalPrice.toLocaleString()} บาท • ความคืบหน้า {session.progress}%
                  </span>
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



