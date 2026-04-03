import React, { useEffect, useMemo, useState } from 'react';
import { Eye, History } from 'lucide-react';
import api, { type AdminUser, type SessionRecord } from '@/services/api';
import { subscribeAdminRealtime } from '@/services/realtime';

interface SessionsPageProps {
  admin: AdminUser;
  branchId: string | null;
  realtimeBranchIds: string[];
}

const statusTabs = ['all', 'pending_payment', 'ready_to_wash', 'in_progress', 'completed', 'cancelled'] as const;

export function SessionsPage({ branchId, realtimeBranchIds }: SessionsPageProps) {
  const [selectedStatus, setSelectedสถานะ] = useState<(typeof statusTabs)[number]>('all');
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.fetchSessions({
          branchId,
          limit: 50,
          status: selectedStatus,
        });

        if (!cancelled) {
          setSessions(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load sessions');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedStatus]);

  useEffect(() => {
    return subscribeAdminRealtime(realtimeBranchIds, (event) => {
      if (event.type !== 'session_update') {
        return;
      }

      if (branchId && event.branchId !== branchId) {
        return;
      }

      setSessions((current) => {
        const next = [...current];
        const index = next.findIndex((session) => session.id === event.session.id);

        if (index === -1) {
          return next;
        }

        next[index] = {
          ...next[index],
          status: event.session.status,
          progress: event.session.progress ?? next[index].progress,
          currentStep: event.session.currentStep ?? next[index].currentStep,
          totalSteps: event.session.totalSteps ?? next[index].totalSteps,
          completedAt: event.session.completedAt ?? next[index].completedAt,
          updatedAt: event.session.updatedAt ?? next[index].updatedAt,
          payment: next[index].payment
            ? {
                ...next[index].payment,
                status: event.session.paymentStatus ?? next[index].payment.status,
              }
            : next[index].payment,
          machine: event.machine
            ? {
                ...next[index].machine,
                status: event.machine.status,
              }
            : next[index].machine,
        };

        return next;
      });
    });
  }, [branchId, realtimeBranchIds]);

  const filtered = useMemo(() => {
    if (selectedStatus === 'all') {
      return sessions;
    }

    return sessions.filter((session) => session.status === selectedStatus);
  }, [sessions, selectedStatus]);

  return (
    <div className="max-w-[1400px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">รอบล้าง</h2>
        <p className="mt-1 text-sm text-gray-500">คิวปฏิบัติงานแบบเรียลไทม์พร้อมการมองเห็นรอบตามขอบเขตสาขา</p>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedสถานะ(tab)}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              selectedStatus === tab ? 'bg-red-500/20 text-red-400' : 'bg-white/[0.03] text-gray-400 hover:text-white'
            }`}
          >
            {tab.replace(/_/g, ' ')} ({tab === 'all' ? sessions.length : sessions.filter((session) => session.status === tab).length})
          </button>
        ))}
      </div>

      <div className="gradient-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ลูกค้า</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สาขา / เครื่อง</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">แพ็กเกจ</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">การชำระเงิน</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ความคืบหน้า</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สร้างเมื่อ</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr key={session.id} className="border-b border-gray-800/30 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{session.user.displayName}</p>
                    <p className="text-xs text-gray-600">{session.id}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-300">
                    <p>{session.branch.shortName || session.branch.name}</p>
                    <p className="text-xs text-gray-600">{session.machine.name}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-300">
                    {session.package.name} ({session.carSize})
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                      {session.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-200">
                      {session.payment?.status ?? 'n/a'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="w-32">
                      <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                        <span>
                          Step {session.currentStep}/{session.totalSteps}
                        </span>
                        <span>{session.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: `${session.progress}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{new Date(session.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <button className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!filtered.length && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-gray-500">
          <History className="mx-auto mb-3 h-8 w-8 opacity-40" />
          ไม่พบรอบล้างตามตัวกรองที่เลือก
        </div>
      )}
    </div>
  );
}



