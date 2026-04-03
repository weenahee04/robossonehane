import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Users } from 'lucide-react';
import api, { type AdminUser, type CustomerRecord } from '@/services/api';

interface CustomersPageProps {
  admin: AdminUser;
  branchId: string | null;
}

export function CustomersPage({ branchId }: CustomersPageProps) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedCustomerId, setExpandedลูกค้าId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handle = setTimeout(async () => {
      try {
        const response = await api.fetchCustomers({
          branchId,
          limit: 100,
          search: search || undefined,
        });

        if (!cancelled) {
          setCustomers(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'โหลดข้อมูลลูกค้าไม่สำเร็จ');
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [branchId, search]);

  const summary = useMemo(() => {
    return {
      totalแต้ม: customers.reduce((sum, customer) => sum + customer.points, 0),
      totalSpend: customers.reduce((sum, customer) => sum + customer.totalSpend, 0),
      totalWashes: customers.reduce((sum, customer) => sum + customer.totalWashes, 0),
    };
  }, [customers]);

  const toggleลูกค้า = (customerId: string) => {
    setExpandedลูกค้าId((current) => (current === customerId ? null : customerId));
  };

  return (
    <div className="max-w-[1400px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">ลูกค้า</h2>
        <p className="mt-1 text-sm text-gray-500">รายชื่อลูกค้าที่อยู่ในขอบเขตสาขาที่เลือกและข้อมูลการใช้งานที่เกี่ยวข้อง</p>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="gradient-card rounded-2xl p-5">
          <p className="text-sm text-gray-500">ลูกค้า</p>
          <p className="mt-2 text-3xl font-black text-white">{customers.length.toLocaleString()}</p>
        </div>
        <div className="gradient-card rounded-2xl p-5">
          <p className="text-sm text-gray-500">ยอดใช้จ่ายสะสมในขอบเขต</p>
          <p className="mt-2 text-3xl font-black text-white">{summary.totalSpend.toLocaleString()}</p>
          <p className="text-xs text-gray-600">บาท</p>
        </div>
        <div className="gradient-card rounded-2xl p-5">
          <p className="text-sm text-gray-500">จำนวนครั้งล้างที่เสร็จแล้ว</p>
          <p className="mt-2 text-3xl font-black text-white">{summary.totalWashes.toLocaleString()}</p>
        </div>
        <div className="gradient-card rounded-2xl p-5">
          <p className="text-sm text-gray-500">ยอดแต้ม</p>
          <p className="mt-2 text-3xl font-black text-white">{summary.totalแต้ม.toLocaleString()}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหาจากชื่อ เบอร์โทร หรือ LINE user id"
          className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
        />
      </div>

      <div className="gradient-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ลูกค้า</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ระดับ</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">แต้ม</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">จำนวนครั้งล้าง</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">รถ</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">ยอดใช้จ่าย</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ล้างล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const isExpanded = expandedCustomerId === customer.id;

                return (
                  <React.Fragment key={customer.id}>
                    <tr
                      className="cursor-pointer border-b border-gray-800/30 hover:bg-white/[0.02]"
                      onClick={() => toggleลูกค้า(customer.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-sm font-semibold text-white">
                            {customer.displayName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white">{customer.displayName}</p>
                            <p className="text-xs text-gray-600">{customer.phone || customer.lineUserId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-300">{customer.memberTier}</td>
                      <td className="px-5 py-4 text-right text-white">{customer.points.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-300">{customer.totalWashes.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right text-gray-300">
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-gray-800/40 px-3 py-1 text-xs text-gray-200">
                          {customer.vehicles.length.toLocaleString()}
                          <span className="text-gray-500">รถ</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-gray-300">{customer.totalSpend.toLocaleString()}</td>
                      <td className="px-5 py-4 text-xs text-gray-400">
                        <div className="flex items-center justify-between gap-3">
                          <span>{customer.lastWash ? new Date(customer.lastWash).toLocaleString() : 'ยังไม่มีประวัติการล้าง'}</span>
                          <span className="text-gray-600">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-800/30 bg-white/[0.015]">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="rounded-2xl border border-gray-700/60 bg-gray-900/60 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">มุมมองรถของลูกค้า</p>
                                <p className="text-xs text-gray-500">รถที่ลงทะเบียนกับลูกค้ารายนี้ในขอบเขตสาขาปัจจุบัน</p>
                              </div>
                              <span className="text-xs text-gray-500">{customer.vehicles.length.toLocaleString()} คัน</span>
                            </div>

                            {customer.vehicles.length ? (
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {customer.vehicles.map((vehicle) => (
                                  <div
                                    key={vehicle.id}
                                    className="rounded-xl border border-gray-700/60 bg-gray-950/80 p-3"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-white">
                                          {vehicle.brand} {vehicle.model}
                                        </p>
                                        <p className="text-xs text-gray-500">{vehicle.plate} · {vehicle.province}</p>
                                      </div>
                                      <span className="rounded-full border border-gray-700/60 px-2.5 py-1 text-[10px] text-gray-300">
                                        ขนาด {vehicle.size}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                                      <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-600">สี</p>
                                        <p className="text-gray-200">{vehicle.color}</p>
                                      </div>
                                      <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
                                        <p className="text-[9px] uppercase tracking-wider text-gray-600">สร้างเมื่อ</p>
                                        <p className="text-gray-200">{new Date(vehicle.createdAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-gray-700/60 bg-black/20 p-4 text-sm text-gray-500">
                                ยังไม่มีข้อมูลรถของลูกค้ารายนี้
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!customers.length && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-gray-500">
          <Users className="mx-auto mb-3 h-8 w-8 opacity-40" />
          ไม่พบลูกค้าในขอบเขตสาขาที่เลือก
        </div>
      )}
    </div>
  );
}



