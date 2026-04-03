import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Send, Store } from 'lucide-react';
import api, { type AdminUser, type BranchOption, type NotificationCampaignRecord } from '@/services/api';

interface NotificationsPageProps {
  admin: AdminUser;
  branchId: string | null;
  branches: BranchOption[];
}

type Campaignฉบับร่าง = {
  title: string;
  body: string;
  category: 'wash' | 'coupon' | 'points' | 'system';
  branchIds: string[];
};

function createฉบับร่าง(defaultBranchId?: string | null): Campaignฉบับร่าง {
  return {
    title: '',
    body: '',
    category: 'system',
    branchIds: defaultBranchId ? [defaultBranchId] : [],
  };
}

export function NotificationsPage({ admin, branchId, branches }: NotificationsPageProps) {
  const [campaigns, setCampaigns] = useState<NotificationCampaignRecord[]>([]);
  const [draft, setฉบับร่าง] = useState<Campaignฉบับร่าง>(createฉบับร่าง(branchId));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scopedสาขา = useMemo(() => {
    const base = admin.role === 'hq_admin' ? branches : branches.filter((item) => admin.branchIds.includes(item.id));
    return branchId ? base.filter((item) => item.id === branchId) : base;
  }, [admin.branchIds, admin.role, branchId, branches]);

  async function loadCampaigns() {
    const response = await api.fetchNotificationCampaigns(branchId);
    setCampaigns(response);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await api.fetchNotificationCampaigns(branchId);
        if (cancelled) {
          return;
        }

        setCampaigns(response);
        setฉบับร่าง(createฉบับร่าง(branchId));
        setError(null);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'โหลดแคมเปญแจ้งเตือนไม่สำเร็จ');
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
  }, [branchId]);

  async function broadcast() {
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      await api.createNotificationCampaign({
        title: draft.title.trim(),
        body: draft.body.trim(),
        category: draft.category,
        branchIds: draft.branchIds,
      });
      setSuccess('สร้างและส่งแคมเปญแจ้งเตือนสำเร็จ');
      setฉบับร่าง(createฉบับร่าง(branchId));
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || 'ส่งแคมเปญแจ้งเตือนไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }

  function toggleBranch(targetBranchId: string, checked: boolean) {
    setฉบับร่าง((current) => ({
      ...current,
      branchIds: checked
        ? Array.from(new Set([...current.branchIds, targetBranchId]))
        : current.branchIds.filter((item) => item !== targetBranchId),
    }));
  }

  return (
    <div className="max-w-[1500px] space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">จัดการการแจ้งเตือน</h2>
        <p className="mt-1 text-sm text-gray-500">
          ส่งการแจ้งเตือนไปยังกล่องข้อความของลูกค้าจากหลังบ้าน พร้อมกำหนดสาขาเป้าหมายและดูประวัติการส่งได้
        </p>
      </div>

      {branchId && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          กำลังกรองตามสาขาอยู่ การส่งแจ้งเตือนจะถูกจำกัดตามสาขาที่เลือกจนกว่า HQ จะล้างตัวกรองสาขา
        </div>
      )}

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="gradient-card rounded-[28px] p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">ขั้นตอนการส่ง</p>
              <h3 className="text-xl font-bold text-white">สร้างแคมเปญแจ้งเตือน</h3>
              <p className="mt-1 text-sm text-gray-500">ผู้ดูแลสาขาจะเลือกได้เฉพาะสาขาในสิทธิ์ของตัวเอง ส่วน HQ สามารถปล่อยว่างเพื่อส่งทุกสาขาได้</p>
            </div>
            <button
              onClick={() => void broadcast()}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sending ? 'กำลังส่ง...' : 'ส่งแจ้งเตือน'}
            </button>
          </div>

          <div className="grid gap-4">
            <Field label="ชื่อเรื่อง" value={draft.title} onChange={(value) => setฉบับร่าง((current) => ({ ...current, title: value }))} />
            <TextAreaField label="ข้อความแจ้งเตือน" value={draft.body} onChange={(value) => setฉบับร่าง((current) => ({ ...current, body: value }))} />
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">หมวดหมู่</span>
              <select
                value={draft.category}
                onChange={(event) => setฉบับร่าง((current) => ({ ...current, category: event.target.value as Campaignฉบับร่าง['category'] }))}
                className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
              >
                <option value="system">ระบบ</option>
                <option value="wash">การล้างรถ</option>
                <option value="coupon">คูปอง</option>
                <option value="points">แต้ม</option>
              </select>
            </label>

            <div className="space-y-3 rounded-3xl border border-white/5 bg-black/20 p-5">
              <div>
                <p className="text-sm font-semibold text-white">สาขาเป้าหมาย</p>
                <p className="mt-1 text-xs text-gray-500">ระบบจะเลือกกลุ่มลูกค้าจากผู้ใช้ที่มีประวัติใช้งานในสาขาที่เลือก</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {scopedสาขา.map((branch) => {
                  const checked = draft.branchIds.includes(branch.id);
                  return (
                    <label
                      key={branch.id}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-all ${
                        checked ? 'border-red-500/30 bg-red-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleBranch(branch.id, event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-white/10 bg-transparent text-red-500"
                      />
                      <span>
                        {branch.name}
                        <span className="block text-xs text-gray-500">{branch.code}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">ประวัติการส่ง</p>
            <h3 className="mt-2 text-xl font-bold text-white">แคมเปญล่าสุด</h3>
            <p className="mt-1 text-sm text-gray-500">แต่ละแคมเปญจะบันทึกจำนวนการส่งและขอบเขตสาขาที่ใช้ในช่วงเวลานั้น</p>
          </div>

          {loading && <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm text-gray-400">กำลังโหลดแคมเปญ...</div>}

          {!loading &&
            campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{campaign.title}</h4>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{campaign.category}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-emerald-300">
                    ส่งแล้ว
                  </span>
                </div>

                <p className="text-sm text-gray-300">{campaign.body}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="กลุ่มลูกค้าเป้าหมาย" value={campaign.targetUserCount.toLocaleString()} />
                  <MiniStat label="แจ้งเตือน sent" value={campaign.sentCount.toLocaleString()} />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(campaign.createdAt).toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                    <span>{campaign.branchIds.length === 0 ? 'ทุกสาขา' : `${campaign.branchIds.length} สาขา`}</span>
                  </div>
                </div>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">{label}</span>
      <textarea
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500/40"
      />
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}


