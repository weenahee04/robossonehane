import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  RefreshCcw,
  Search,
  ShieldAlert,
  Webhook,
} from 'lucide-react';
import api, { type AdminUser, type PaymentRecord, type PaymentStatus } from '@/services/api';

interface PaymentsPageProps {
  admin: AdminUser;
  branchId: string | null;
}

const paymentStatuses: Array<PaymentStatus | 'all'> = [
  'all',
  'pending',
  'confirmed',
  'failed',
  'cancelled',
  'refunded',
  'expired',
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'ไม่มีข้อมูล';
  }

  return new Date(value).toLocaleString();
}

function formatสถานะLabel(value?: string | null) {
  if (!value) {
    return 'ไม่มีข้อมูล';
  }

  return value.replace(/_/g, ' ');
}

function stringifyJson(value: unknown) {
  if (value == null) {
    return 'ไม่มีข้อมูล';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getสถานะTone(status: PaymentStatus) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
    case 'pending':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/20';
    case 'refunded':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/20';
    default:
      return 'bg-white/5 text-gray-300 border-white/10';
  }
}

export function PaymentsPage({ admin, branchId }: PaymentsPageProps) {
  const [payments, setการชำระเงิน] = useState<PaymentRecord[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [selectedStatus, setSelectedสถานะ] = useState<PaymentStatus | 'all'>('all');
  const [selectedผู้ให้บริการ, setSelectedผู้ให้บริการ] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'verify' | 'reconcile' | null>(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifyผู้ให้บริการRef, setVerifyผู้ให้บริการRef] = useState('');
  const [reconcileสถานะ, setReconcileStatus] = useState('');
  const [reconcileผู้ให้บริการRef, setReconcileผู้ให้บริการRef] = useState('');
  const [reconcileยอดเงิน, setReconcileยอดเงิน] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const response = await api.fetchPayments({
          branchId,
          limit: 50,
          status: selectedStatus,
          provider: selectedผู้ให้บริการ,
          search: search || undefined,
        });

        if (cancelled) {
          return;
        }

        setการชำระเงิน(response.data);
        setError(null);
        setSelectedPaymentId((current) => {
          if (current && response.data.some((payment) => payment.id === current)) {
            return current;
          }
          return response.data[0]?.id ?? null;
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load payments');
          setการชำระเงิน([]);
          setSelectedPaymentId(null);
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
  }, [branchId, selectedStatus, selectedผู้ให้บริการ, search]);

  useEffect(() => {
    if (!selectedPaymentId) {
      setSelectedPayment(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setDetailLoading(true);
        const detail = await api.fetchPaymentDetail(selectedPaymentId);
        if (!cancelled) {
          setSelectedPayment(detail);
          setVerifyผู้ให้บริการRef(detail.providerRef ?? '');
          setReconcileผู้ให้บริการRef(detail.providerRef ?? '');
          setReconcileStatus(detail.providerStatus ?? '');
          setReconcileยอดเงิน(String(detail.amount));
          setActionError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setActionError(err.message || 'Failed to load payment detail');
          setSelectedPayment(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPaymentId]);

  const providerOptions = useMemo(() => {
    const values = Array.from(new Set(payments.map((payment) => payment.provider).filter(Boolean)));
    return ['all', ...values];
  }, [payments]);

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        acc.total += 1;
        acc.amount += payment.amount;
        if (payment.status === 'confirmed') {
          acc.confirmed += 1;
        }
        if (payment.status === 'pending') {
          acc.pending += 1;
        }
        if (payment.needsManualReview) {
          acc.manualReview += 1;
        }
        return acc;
      },
      {
        total: 0,
        amount: 0,
        confirmed: 0,
        pending: 0,
        manualReview: 0,
      }
    );
  }, [payments]);

  async function refreshSelectedPayment() {
    if (!selectedPaymentId) {
      return;
    }

    const detail = await api.fetchPaymentDetail(selectedPaymentId);
    setSelectedPayment(detail);
    setการชำระเงิน((current) => current.map((payment) => (payment.id === detail.id ? detail : payment)));
  }

  async function handleตรวจสอบ() {
    if (!selectedPayment) {
      return;
    }

    try {
      setActionBusy('verify');
      setActionError(null);
      await api.verifyAdminPayment(selectedPayment.id, {
        note: verifyNote || undefined,
        providerRef: verifyผู้ให้บริการRef || undefined,
      });
      await refreshSelectedPayment();
      setVerifyNote('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to verify payment');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleกระทบยอด() {
    if (!selectedPayment) {
      return;
    }

    try {
      setActionBusy('reconcile');
      setActionError(null);
      await api.reconcileAdminPayment(selectedPayment.id, {
        providerStatus: reconcileสถานะ || undefined,
        providerRef: reconcileผู้ให้บริการRef || undefined,
        amount: reconcileยอดเงิน ? Number(reconcileยอดเงิน) : undefined,
        note: reconcileNote || undefined,
      });
      await refreshSelectedPayment();
      setReconcileNote('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reconcile payment');
    } finally {
      setActionBusy(null);
    }
  }

  const canRunตรวจสอบ = !!selectedPayment && actionBusy === null;
  const canRunกระทบยอด = !!selectedPayment && actionBusy === null;

  return (
    <div className="max-w-[1480px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">การชำระเงิน</h2>
          <p className="mt-1 text-sm text-gray-500">
            การจัดการการชำระเงินจริงสำหรับ {admin.role === 'hq_admin' ? 'มองเห็นทุกสาขา' : 'ขอบเขตสาขาที่ได้รับมอบหมาย'}.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">การชำระเงิน</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.total.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ยืนยันแล้ว</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.confirmed.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">รอดำเนินการ</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.pending.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ยอดเงินในขอบเขต</p>
            <p className="mt-2 text-2xl font-black text-white">{summary.amount.toLocaleString()}</p>
            <p className="text-xs text-gray-600">บาท</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <section className="space-y-4">
          <div className="gradient-card rounded-2xl p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="ค้นหารหัสอ้างอิง รหัสผู้ให้บริการ รอบล้าง หรือรหัสการชำระเงิน"
                  className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedสถานะ(event.target.value as PaymentStatus | 'all')}
                className="rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none"
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'ทุกสถานะ' : formatสถานะLabel(status)}
                  </option>
                ))}
              </select>
              <select
                value={selectedผู้ให้บริการ}
                onChange={(event) => setSelectedผู้ให้บริการ(event.target.value)}
                className="rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white focus:border-red-500/50 focus:outline-none"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider === 'all' ? 'ผู้ให้บริการทั้งหมด' : provider}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
              <span>{summary.manualReview} รายการที่ถูกปักให้ตรวจสอบด้วยคน</span>
              <span>|</span>
              <span>{branchId ? 'ผลลัพธ์ตามสาขาที่เลือก' : admin.role === 'hq_admin' ? 'ทุกสาขาในขอบเขต' : 'เฉพาะสาขาที่ได้รับสิทธิ์'}</span>
            </div>
          </div>

          <div className="gradient-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">อ้างอิง</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สาขา / รอบล้าง</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ลูกค้า</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ผู้ให้บริการ</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">สถานะ</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">ยอดเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const isActive = payment.id === selectedPaymentId;
                    return (
                      <tr
                        key={payment.id}
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className={`cursor-pointer border-b border-gray-800/30 transition-colors ${
                          isActive ? 'bg-red-500/10' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-white">{payment.reference || payment.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-600">{payment.providerRef || 'ยังไม่มีรหัสผู้ให้บริการ'}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-300">
                          <p>{payment.branch.shortName || payment.branch.name}</p>
                          <p className="text-xs text-gray-600">{payment.session.id}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-300">
                          <p>{payment.session.user.displayName}</p>
                          <p className="text-xs text-gray-600">{payment.session.machine.name}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-300">
                          <p>{payment.provider}</p>
                          <p className="text-xs text-gray-600">{payment.providerStatus || 'ยังไม่มีสถานะจากผู้ให้บริการ'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${getสถานะTone(payment.status)}`}>
                              {formatสถานะLabel(payment.status)}
                            </span>
                            {payment.needsManualReview && (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-amber-300">
                                Review
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-white">{payment.amount.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!payments.length && !loading && (
              <div className="p-10 text-center text-gray-500">
                <CircleDollarSign className="mx-auto mb-3 h-8 w-8 opacity-40" />
                ไม่พบรายการชำระเงินตามตัวกรองที่เลือก
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="gradient-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">รายละเอียดการชำระเงิน</h3>
                <p className="text-xs text-gray-500">สถานะ ข้อมูลวิเคราะห์ ขอบเขตสาขา และเครื่องมือปฏิบัติการ</p>
              </div>
              {detailLoading && <span className="text-xs text-gray-500">กำลังโหลด...</span>}
            </div>

            {!selectedPayment && !detailLoading && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-gray-500">
                เลือกรายการชำระเงินเพื่อดูข้อมูลวิเคราะห์และสั่งงานเพิ่มเติม
              </div>
            )}

            {selectedPayment && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{selectedPayment.reference || selectedPayment.id}</p>
                    <p className="text-sm text-gray-500">
                      {selectedPayment.branch.shortName || selectedPayment.branch.name} - รอบล้าง {selectedPayment.session.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${getสถานะTone(selectedPayment.status)}`}>
                      {formatสถานะLabel(selectedPayment.status)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                      {selectedPayment.provider}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['ยอดเงิน', `${selectedPayment.amount.toLocaleString()} ${selectedPayment.currency}`],
                    ['สถานะจากผู้ให้บริการ', selectedPayment.providerStatus || 'ไม่มีข้อมูล'],
                    ['รหัสอ้างอิงผู้ให้บริการ', selectedPayment.providerRef || 'ไม่มีข้อมูล'],
                    ['วิธีชำระเงิน', selectedPayment.method],
                    ['ลูกค้า', selectedPayment.session.user.displayName],
                    ['เครื่อง', selectedPayment.session.machine.name],
                    ['สถานะรอบล้าง', formatสถานะLabel(selectedPayment.session.status)],
                    ['สร้างเมื่อ', formatDateTime(selectedPayment.createdAt)],
                    ['ยืนยันเมื่อ', formatDateTime(selectedPayment.confirmedAt)],
                    ['หมดอายุเมื่อ', formatDateTime(selectedPayment.expiresAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
                      <p className="mt-1 text-sm text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2 text-white">
                      <Webhook className="h-4 w-4 text-red-300" />
                      <h4 className="font-medium">Webhook</h4>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>รับ webhook ล่าสุด: {formatDateTime(selectedPayment.diagnostics.webhook.lastWebhookAt)}</p>
                      <p>สถานะ snapshot: {selectedPayment.diagnostics.webhook.lastWebhookStatus || 'N/A'}</p>
                      <p>Event id: {selectedPayment.diagnostics.webhook.lastWebhookEventId || 'ไม่มีข้อมูล'}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2 text-white">
                      <RefreshCcw className="h-4 w-4 text-red-300" />
                      <h4 className="font-medium">กระทบยอด</h4>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>กระทบยอดล่าสุด: {formatDateTime(selectedPayment.diagnostics.reconcile.lastReconciledAt)}</p>
                      <p>จำนวนครั้ง: {selectedPayment.diagnostics.reconcile.reconciliationAttempts}</p>
                      <p>ผู้ให้บริการยืนยันเมื่อ: {formatDateTime(selectedPayment.diagnostics.provider.providerConfirmedAt)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2 text-white">
                      <ShieldAlert className="h-4 w-4 text-red-300" />
                      <h4 className="font-medium">การตรวจสอบ</h4>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>ต้องตรวจสอบด้วยคน: {selectedPayment.diagnostics.review.needsManualReview ? 'ใช่' : 'ไม่'}</p>
                      <p>เหตุผล: {selectedPayment.diagnostics.review.manualReviewReason || 'ไม่มีข้อมูล'}</p>
                      <p>แหล่งที่มาของสถานะล่าสุด: {selectedPayment.diagnostics.review.lastTransitionSource || 'ไม่มีข้อมูล'}</p>
                    </div>
                  </div>
                </div>

                {selectedPayment.qrPayload && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">QR payload</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-gray-300">{selectedPayment.qrPayload}</pre>
                  </div>
                )}

                {actionError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{actionError}</div>
                )}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <h4 className="font-medium text-white">ตรวจสอบ payment</h4>
                    </div>
                    <div className="space-y-3">
                      <input
                        value={verifyผู้ให้บริการRef}
                        onChange={(event) => setVerifyผู้ให้บริการRef(event.target.value)}
                        placeholder="ระบุรหัสอ้างอิงผู้ให้บริการเพิ่มเติม"
                        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                      />
                      <textarea
                        value={verifyNote}
                        onChange={(event) => setVerifyNote(event.target.value)}
                        rows={3}
                        placeholder="บันทึกหมายเหตุการตรวจสอบ"
                        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                      />
                      <button
                        onClick={() => void handleตรวจสอบ()}
                        disabled={!canRunตรวจสอบ}
                        className="w-full rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionBusy === 'verify' ? 'กำลังตรวจสอบ...' : 'ตรวจสอบกับผู้ให้บริการ'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      <h4 className="font-medium text-white">กระทบยอด payment</h4>
                    </div>
                    <div className="space-y-3">
                      <input
                        value={reconcileสถานะ}
                        onChange={(event) => setReconcileStatus(event.target.value)}
                        placeholder="สถานะจากผู้ให้บริการ"
                        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={reconcileผู้ให้บริการRef}
                          onChange={(event) => setReconcileผู้ให้บริการRef(event.target.value)}
                          placeholder="รหัสอ้างอิงผู้ให้บริการ"
                          className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                        />
                        <input
                          value={reconcileยอดเงิน}
                          onChange={(event) => setReconcileยอดเงิน(event.target.value)}
                          placeholder="ยอดเงิน"
                          inputMode="numeric"
                          className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                        />
                      </div>
                      <textarea
                        value={reconcileNote}
                        onChange={(event) => setReconcileNote(event.target.value)}
                        rows={3}
                        placeholder="บันทึกหมายเหตุกระทบยอด"
                        className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
                      />
                      <button
                        onClick={() => void handleกระทบยอด()}
                        disabled={!canRunกระทบยอด}
                        className="w-full rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionBusy === 'reconcile' ? 'กำลังกระทบยอด...' : 'บันทึกผลกระทบยอด'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium text-white">ประวัติ attempts และ diagnostics</h4>
                    <span className="text-xs text-gray-500">{selectedPayment.attempts.length} รายการ</span>
                  </div>
                  <div className="space-y-3">
                    {selectedPayment.attempts.map((attempt) => (
                      <div key={attempt.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${getสถานะTone(attempt.status)}`}>
                              {formatสถานะLabel(attempt.status)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                              {attempt.source}
                            </span>
                            {attempt.action && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                                {attempt.action}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDateTime(attempt.attemptedAt)}</span>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl bg-white/[0.02] p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Request / หมายเหตุ</p>
                            <p className="mt-2 text-xs text-gray-300">{attempt.note || 'ไม่มีหมายเหตุ'}</p>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-gray-400">
                              {stringifyJson(attempt.requestBody)}
                            </pre>
                          </div>
                          <div className="rounded-xl bg-white/[0.02] p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Response / Event</p>
                            <p className="mt-2 text-xs text-gray-300">
                              {attempt.providerStatus || 'ไม่มีสถานะจากผู้ให้บริการ'} - {attempt.eventId || 'ไม่มี event id'}
                            </p>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-gray-400">
                              {stringifyJson(attempt.responseBody)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPayment.metadata && Object.keys(selectedPayment.metadata).length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Metadata</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-gray-300">
                      {stringifyJson(selectedPayment.metadata)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}



