import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getIconUrl, type IconName } from '../services/icons';
import { formatPoints } from '../services/points';
import { useSessionHistory } from '@/hooks/useApi';
import { getSessionWashStage } from '@/lib/session';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import type { WashSession } from '@/types';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';
function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return <img src={`${ICONS8_BASE}${size * 2}&id=${id}`} width={size} height={size} alt="" className={`inline-block flex-shrink-0 ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} loading="lazy" />;
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

interface WashRecord {
  id: string;
  date: string;
  branch: string;
  package: string;
  price: number;
  points: number;
  rating: number;
  size: string;
  status: 'completed' | 'cancelled';
  duration: string;
  session?: WashSession;
}

const mockHistory: WashRecord[] = [
  { id: 'w1', date: '2026-03-28', branch: 'สาขาลาดพร้าว', package: 'SHINE MODE', price: 149, points: 1490, rating: 5, size: 'M', status: 'completed', duration: '18 นาที' },
  { id: 'w2', date: '2026-03-20', branch: 'สาขาบางนา', package: 'QUICK & CLEAN', price: 109, points: 1090, rating: 4, size: 'M', status: 'completed', duration: '12 นาที' },
  { id: 'w3', date: '2026-03-15', branch: 'สาขาสุขุมวิท', package: 'SPECIAL MODE', price: 399, points: 3990, rating: 5, size: 'M', status: 'completed', duration: '35 นาที' },
  { id: 'w4', date: '2026-03-10', branch: 'สาขาลาดพร้าว', package: 'QUICK & CLEAN', price: 99, points: 990, rating: 3, size: 'S', status: 'completed', duration: '10 นาที' },
  { id: 'w5', date: '2026-03-05', branch: 'สาขาเมืองทอง', package: 'SHINE MODE', price: 169, points: 1690, rating: 4, size: 'L', status: 'completed', duration: '22 นาที' },
  { id: 'w6', date: '2026-02-28', branch: 'สาขารังสิต', package: 'QUICK & CLEAN', price: 109, points: 0, rating: 0, size: 'M', status: 'cancelled', duration: '-' },
];

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`${i <= rating ? 'text-white' : 'text-white/15'}`} style={{ fontSize: size }}>★</span>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value?: number | null) {
  const amount = typeof value === 'number' ? value : 0;
  return `฿${amount.toLocaleString('th-TH')}`;
}


function mapSessionToRecord(s: WashSession): WashRecord {
  const status: WashRecord['status'] = getSessionWashStage(s) === 'completed' ? 'completed' : 'cancelled';
  const startMs = s.startedAt ? new Date(s.startedAt).getTime() : 0;
  const endMs = s.completedAt ? new Date(s.completedAt).getTime() : 0;
  const durationMin = startMs && endMs ? Math.round((endMs - startMs) / 60000) : 0;
  return {
    id: s.id,
    date: s.completedAt || s.createdAt,
    branch: s.branch?.name || s.branchId,
    package: s.package?.name || s.packageId,
    price: s.totalPrice,
    points: s.pointsEarned,
    rating: s.rating ?? 0,
    size: s.carSize,
    status,
    duration: durationMin > 0 ? `${durationMin} นาที` : '-',
    session: s,
  };
}

export function WashHistoryPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<WashRecord | null>(null);

  const sessionQuery = useSessionHistory();
  const history = useMemo<WashRecord[]>(() => {
    if (HAS_API_BASE_URL && sessionQuery.data) {
      return sessionQuery.data.data.map(mapSessionToRecord);
    }

    if (USE_LOCAL_DEV_FALLBACK) {
      return mockHistory;
    }

    return [];
  }, [sessionQuery.data]);

  const completed = history.filter(w => w.status === 'completed');
  const totalSpent = completed.reduce((sum, w) => sum + w.price, 0);
  const totalWashes = completed.length;
  const totalPoints = completed.reduce((sum, w) => sum + w.points, 0);
  const avgRating = completed.length > 0 ? completed.reduce((sum, w) => sum + w.rating, 0) / completed.length : 0;

  const filtered = activeTab === 'all' ? history : history.filter(w => w.status === activeTab);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">ประวัติการล้างรถ</h1>
        <div className="w-10" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 pt-4 pb-6 space-y-4">

          {/* Summary Hero */}
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-white/5">
              <div className="bg-gradient-to-br from-app-dark via-app-black to-app-dark p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                    <Ico id={25107} size={22} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">สรุปการใช้บริการ</p>
                    <p className="text-gray-500 text-[11px]">มี.ค. 2026</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: 25107, label: 'ล้างรถ', value: String(totalWashes), sub: 'ครั้ง' },
                    { icon: 484, label: 'ค่าใช้จ่าย', value: `฿${totalSpent.toLocaleString()}`, sub: 'บาท' },
                    { icon: 104, label: 'คะแนน', value: formatPoints(totalPoints), sub: 'พ้อยท์' },
                    { icon: 39070, label: 'คะแนนเฉลี่ย', value: avgRating.toFixed(1), sub: '' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                          <Ico id={stat.icon} size={12} />
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</span>
                      </div>
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      {stat.sub ? <p className="text-[10px] text-gray-500">{stat.sub}</p> : <StarRating rating={Math.round(avgRating)} size={10} />}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">
                  ทั้งหมด
                  <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4">{history.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 text-xs">
                  สำเร็จ
                  <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4">{completed.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="flex-1 text-xs">
                  ยกเลิก
                  <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4">{history.filter(w => w.status === 'cancelled').length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* History List */}
          <AnimatePresence mode="popLayout">
            {filtered.map((record) => {
              const isExpanded = expandedId === record.id;

              return (
                <motion.div
                  key={record.id}
                  variants={itemVariants}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card
                    className="overflow-hidden border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    {/* Main Row */}
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-black border border-white/10">
                          {record.status === 'completed'
                            ? <Ico id={25107} size={20} />
                            : <I8Icon name="back" size={18} className="opacity-50" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-bold truncate">{record.package}</p>
                            {record.status === 'cancelled' && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">ยกเลิก</Badge>
                            )}
                          </div>
                          <p className="text-gray-500 text-[11px] truncate">{record.branch} • ไซส์ {record.size}</p>
                        </div>

                        {/* Price + Date */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-white font-bold text-sm">฿{record.price}</p>
                          <p className="text-gray-600 text-[10px]">{formatDate(record.date)}</p>
                        </div>
                      </div>

                      {/* Points + Rating inline */}
                      {record.status === 'completed' && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Ico id={104} size={12} className="opacity-40" />
                            <span className="text-white/70 text-xs font-semibold">+{formatPoints(record.points)} pt</span>
                          </div>
                          <StarRating rating={record.rating} size={11} />
                        </div>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            <Separator className="bg-white/5" />
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'วันที่', value: formatDateFull(record.date), icon: 37877 },
                                { label: 'ระยะเวลา', value: record.duration, icon: 423 },
                                { label: 'แพ็กเกจ', value: record.package, icon: 25107 },
                                { label: 'ขนาดรถ', value: `ไซส์ ${record.size}`, icon: 24548 },
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                                  <div className="w-7 h-7 rounded-md bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <Ico id={item.icon} size={13} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                                    <p className="text-white text-xs font-medium truncate">{item.value}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                              {record.status === 'completed' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="w-full text-xs h-9 gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReceipt(record);
                                }}
                              >
                                <div className="w-5 h-5 rounded bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                                  <Ico id={4720} size={11} />
                                </div>
                                ดูใบเสร็จ
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Ico id={25107} size={30} className="opacity-30" />
              </div>
              <p className="text-gray-500 text-sm font-medium">ไม่มีรายการ</p>
              <p className="text-gray-600 text-xs mt-1">ยังไม่มีประวัติการใช้บริการ</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      <Dialog open={Boolean(selectedReceipt)} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md border-white/10 bg-app-black text-white">
          {selectedReceipt && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-white">ใบเสร็จบริการล้างรถ</DialogTitle>
                <DialogDescription className="text-white/40">
                  {selectedReceipt.package} • {selectedReceipt.branch}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">สถานะชำระเงิน</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedReceipt.session?.payment?.status ?? (selectedReceipt.status === 'completed' ? 'confirmed' : 'cancelled')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">ยอดรวม</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatMoney(selectedReceipt.session?.totalPrice ?? selectedReceipt.price)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">สาขา</p>
                    <p className="mt-1 text-sm font-semibold text-white">{selectedReceipt.branch}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">ป้ายทะเบียน/ขนาด</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {selectedReceipt.session?.carSize ?? selectedReceipt.size}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  {[
                    { label: 'Session ID', value: selectedReceipt.session?.id ?? selectedReceipt.id },
                    { label: 'Payment ref', value: selectedReceipt.session?.payment?.reference ?? '-' },
                    { label: 'Created', value: formatDateTime(selectedReceipt.session?.createdAt ?? selectedReceipt.date) },
                    { label: 'Started', value: formatDateTime(selectedReceipt.session?.startedAt) },
                    { label: 'Completed', value: formatDateTime(selectedReceipt.session?.completedAt) },
                    { label: 'Points earned', value: formatPoints(selectedReceipt.session?.pointsEarned ?? selectedReceipt.points) },
                    { label: 'Rating', value: selectedReceipt.session?.rating ? `${selectedReceipt.session.rating}/5` : '-' },
                    { label: 'Review', value: selectedReceipt.session?.reviewText || '-' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-[10px] uppercase tracking-wider text-white/25">{item.label}</span>
                      <span className="text-right text-sm text-white/85">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedReceipt(null)}>
                    ปิด
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
