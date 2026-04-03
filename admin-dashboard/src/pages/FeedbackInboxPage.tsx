import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquareMore, Save, Search, Store, UserRound } from 'lucide-react';
import api, { type AdminUser, type BranchOption, type FeedbackInboxRecord } from '@/services/api';

interface FeedbackInboxPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

export function FeedbackInboxPage({ admin, branchId, branches }: FeedbackInboxPageProps) {
  const [items, setItems] = useState<FeedbackInboxRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noteฉบับร่าง, setNoteฉบับร่าง] = useState('');
  const [statusDraft, setStatusDraft] = useState('pending');

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const statusOptions = ['pending', 'reviewing', 'contacted', 'resolved'];

  async function reloadฟีดแบ็ก(nextSelectedId?: string | null) {
    const response = await api.fetchFeedbackInbox({
      branchId,
      status: statusFilter,
      search: search.trim() || undefined,
    });
    setItems(response);

    const preferred = (nextSelectedId ? response.find((item) => item.id === nextSelectedId) : undefined) ?? response[0] ?? null;
    setSelectedId(preferred?.id ?? null);
    setNoteฉบับร่าง(preferred?.adminNotes ?? '');
    setStatusDraft(preferred?.status ?? 'pending');
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchFeedbackInbox({
          branchId,
          status: statusFilter,
          search: search.trim() || undefined,
        });
        if (cancelled) {
          return;
        }

        setItems(response);
        const preferred = response[0] ?? null;
        setSelectedId(preferred?.id ?? null);
        setNoteฉบับร่าง(preferred?.adminNotes ?? '');
        setStatusDraft(preferred?.status ?? 'pending');
        setError(null);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load feedback inbox');
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
  }, [branchId, search, statusFilter]);

  useEffect(() => {
    setNoteฉบับร่าง(selectedItem?.adminNotes ?? '');
    setStatusDraft(selectedItem?.status ?? 'pending');
  }, [selectedItem?.adminNotes, selectedItem?.status, selectedItem?.id]);

  async function saveฟีดแบ็ก() {
    if (!selectedItem) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.updateFeedbackInboxItem(selectedItem.id, {
        status: statusDraft,
        adminNotes: noteฉบับร่าง.trim() || null,
      });
      setSuccess('ฟีดแบ็ก สถานะ updated successfully.');
      await reloadฟีดแบ็ก(selectedItem.id);
    } catch (err: any) {
      setError(err.message || 'Failed to update feedback');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1600px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">ฟีดแบ็ก Inbox</h2>
        <p className="mt-1 text-sm text-gray-500">
          ตรวจสอบข้อความที่ลูกค้าส่งเข้ามา ดูสถานะซัพพอร์ตพื้นฐาน และทำให้การติดตามงานตามสาขาเห็นชัดทั้ง HQ และแอดมินสาขา
        </p>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-4 rounded-[24px] border border-white/5 bg-white/[0.03] p-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <label className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-gray-300">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาลูกค้า เบอร์โทร ประเภท หรือข้อความ"
            className="w-full bg-transparent outline-none placeholder:text-gray-600"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="all">ทุกสถานะ</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดฟีดแบ็ก...</div>}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-gray-400">
              ไม่พบฟีดแบ็กตามขอบเขตและตัวกรองปัจจุบัน
            </div>
          )}

          {!loading &&
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-2xl border p-5 text-left transition-all ${
                  selectedId === item.id ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <MessageSquareMore className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.user.displayName}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{item.type}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300">
                    {item.status}
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-gray-300">{item.message}</p>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                    <span>{item.branch?.shortName || item.branch?.name || 'Unassigned branch'}</span>
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="gradient-card rounded-[28px] p-6">
          {!selectedItem ? (
            <div className="rounded-2xl border border-white/5 bg-black/20 p-6 text-sm text-gray-400">เลือกฟีดแบ็กเพื่อดูรายละเอียดและอัปเดตสถานะ</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-gray-500">รายละเอียดซัพพอร์ต</p>
                  <h3 className="text-xl font-bold text-white">{selectedItem.user.displayName}</h3>
                </div>
                <button
                  onClick={() => void saveฟีดแบ็ก()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'บันทึกสถานะ'}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <InfoCard label="ประเภท" value={selectedItem.type} />
                <InfoCard label="สาขา" value={selectedItem.branch?.shortName || selectedItem.branch?.name || 'Unassigned'} />
                <InfoCard label="รอบล้าง" value={selectedItem.sessionId || '-'} />
              </div>

              <section className="rounded-3xl border border-white/5 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <UserRound className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedItem.user.displayName}</p>
                    <p className="text-xs text-gray-500">{selectedItem.user.phone || selectedItem.user.lineUserId}</p>
                  </div>
                </div>

                <p className="text-sm leading-7 text-gray-300">{selectedItem.message}</p>
              </section>

              <section className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">สถานะ</span>
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">หมายเหตุแอดมิน</span>
                  <textarea
                    rows={6}
                    value={noteฉบับร่าง}
                    onChange={(event) => setNoteฉบับร่าง(event.target.value)}
                    className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
                  />
                </label>
              </section>

              {selectedItem.resolvedAt && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  แก้ไขแล้ว at {new Date(selectedItem.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}



