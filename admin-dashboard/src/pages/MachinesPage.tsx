import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Cpu, Power, RefreshCw, Wrench } from 'lucide-react';
import api, { type AdminUser, type MachineRecord } from '@/services/api';
import { subscribeAdminRealtime } from '@/services/realtime';

interface MachinesPageProps {
  admin: AdminUser;
  branchId: string | null;
  realtimeBranchIds: string[];
}

const filters = ['all', 'idle', 'reserved', 'washing', 'maintenance', 'offline'] as const;

export function MachinesPage({ admin, branchId, realtimeBranchIds }: MachinesPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<(typeof filters)[number]>('all');
  const [machines, setเครื่อง] = useState<MachineRecord[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await api.fetchMachines({ branchId, status: selectedFilter === 'all' ? undefined : selectedFilter });
        if (!cancelled) {
          setเครื่อง(response);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'โหลดข้อมูลเครื่องไม่สำเร็จ');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedFilter]);

  useEffect(() => {
    return subscribeAdminRealtime(realtimeBranchIds, (event) => {
      if (event.type !== 'machine_event') {
        return;
      }

      if (branchId && event.branchId !== branchId) {
        return;
      }

      setเครื่อง((current) =>
        current.map((machine) =>
          machine.id === event.machine.id
            ? {
                ...machine,
                status: event.machine.status,
                lastHeartbeat: event.machine.lastHeartbeat ?? machine.lastHeartbeat,
                currentSessionId: event.sessionId ?? machine.currentSessionId,
                firmwareVersion: event.machine.firmwareVersion ?? machine.firmwareVersion,
              }
            : machine
        )
      );
    });
  }, [branchId, realtimeBranchIds]);

  const scopedเครื่อง = useMemo(() => {
    if (selectedFilter === 'all') {
      return machines;
    }

    return machines.filter((machine) => machine.status === selectedFilter);
  }, [machines, selectedFilter]);

  async function handleCommand(machineId: string, command: 'restart' | 'maintenance_on' | 'maintenance_off') {
    try {
      setLoadingId(machineId + command);
      await api.sendMachineCommand(machineId, command);
      setError(null);
    } catch (err: any) {
          setError(err.message || 'ส่งคำสั่งไปยังเครื่องไม่สำเร็จ');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">เครื่อง</h2>
        <p className="mt-1 text-sm text-gray-500">ติดตามสถานะเครื่องแบบเรียลไทม์และสั่งงานตามขอบเขตสาขาที่ได้รับสิทธิ์</p>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`rounded-xl p-3 text-left transition-all ${
              selectedFilter === filter ? 'border border-red-500/30 bg-red-500/15' : 'gradient-card'
            }`}
          >
            <p className={`text-xl font-bold ${selectedFilter === filter ? 'text-red-400' : 'text-white'}`}>
              {filter === 'all' ? machines.length : machines.filter((machine) => machine.status === filter).length}
            </p>
            <p className="text-xs capitalize text-gray-500">
              {filter === 'all'
                ? 'ทั้งหมด'
                : filter === 'idle'
                  ? 'ว่าง'
                  : filter === 'reserved'
                    ? 'จองแล้ว'
                    : filter === 'washing'
                      ? 'กำลังล้าง'
                      : filter === 'maintenance'
                        ? 'ซ่อมบำรุง'
                        : 'ออฟไลน์'}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {scopedเครื่อง.map((machine) => {
          const heartbeatAgo = machine.lastHeartbeat
            ? Math.round((Date.now() - new Date(machine.lastHeartbeat).getTime()) / 1000)
            : null;

          return (
            <div key={machine.id} className="gradient-card rounded-2xl p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                    <Cpu className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{machine.name}</h3>
                    <p className="text-xs text-gray-500">{machine.branch.shortName || machine.branch.name}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                  {machine.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>รหัสเครื่อง</span>
                  <span className="font-medium text-gray-200">{machine.code}</span>
                </div>
                <div className="flex justify-between">
                  <span>อุปกรณ์ ESP</span>
                  <span className="font-mono text-[11px] text-gray-200">{machine.espDeviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span>จำนวนรอบสะสม</span>
                  <span className="font-medium text-gray-200">{machine.totalWashes}</span>
                </div>
                <div className="flex justify-between">
                  <span>รอบปัจจุบัน</span>
                  <span className="font-medium text-gray-200">{machine.currentSessionId ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>สัญญาณล่าสุด</span>
                  <span className={`font-medium ${heartbeatAgo !== null && heartbeatAgo > 300 ? 'text-red-400' : 'text-green-400'}`}>
                    {heartbeatAgo === null ? 'ไม่มีสัญญาณ' : `${heartbeatAgo} วินาทีก่อน`}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleCommand(machine.id, 'restart')}
                  disabled={loadingId === machine.id + 'restart'}
                  className="flex items-center justify-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> รีสตาร์ต
                </button>
                <button
                  onClick={() => handleCommand(machine.id, machine.status === 'maintenance' ? 'maintenance_off' : 'maintenance_on')}
                  disabled={
                    !admin.scopes.some((scope) => scope.branchId === machine.branchId && scope.canManageMachines) &&
                    admin.role !== 'hq_admin'
                  }
                  className="flex items-center justify-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {machine.status === 'maintenance' ? 'กลับมาใช้งาน' : 'เข้าโหมดซ่อม'}
                </button>
                <button
                  onClick={() => handleCommand(machine.id, 'restart')}
                  disabled={loadingId === machine.id + 'restart'}
                  className="flex items-center justify-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  <Power className="h-3.5 w-3.5" /> เช็กสัญญาณ
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!scopedเครื่อง.length && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-gray-500">
          <Activity className="mx-auto mb-3 h-8 w-8 opacity-40" />
          ไม่พบเครื่องในขอบเขตที่เลือก
        </div>
      )}
    </div>
  );
}


