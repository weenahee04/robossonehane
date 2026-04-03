import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { getIconUrl, type IconName } from '../services/icons';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useApi';
import type { Notification as ApiNotification } from '@/types';
import { USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';

const USE_API = !!import.meta.env.VITE_API_URL;

const CATEGORY_ICON_MAP: Record<string, number | string> = {
  wash: 11695,
  coupon: 2983,
  points: 6703,
  system: 7694,
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อกี้';
  if (mins < 60) return `${mins} นาทีก่อน`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'เมื่อวาน';
  return `${days} วันก่อน`;
}

function mapApiNotification(n: ApiNotification): Notification {
  const type = (n.category === 'system' ? 'promo' : n.category) as Notification['type'];
  return {
    id: n.id,
    type,
    title: n.title,
    message: n.body,
    time: formatRelativeTime(n.createdAt),
    read: n.isRead,
    iconId: CATEGORY_ICON_MAP[n.category] ?? 11642,
  };
}

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return <img src={`${ICONS8_BASE}${size * 2}&id=${id}`} width={size} height={size} alt="" className={`inline-block flex-shrink-0 ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} loading="lazy" />;
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

function IconBox({ id, size = 14, boxSize = 'w-9 h-9' }: { id: string | number; size?: number; boxSize?: string }) {
  return (
    <div className={`${boxSize} rounded-xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0`}>
      <Ico id={id} size={size} />
    </div>
  );
}

interface Notification {
  id: string;
  type: 'coupon' | 'wash' | 'promo' | 'points';
  title: string;
  message: string;
  time: string;
  read: boolean;
  iconId: number | string;
}

const NOTIFICATION_ACTIONS: Record<Notification['type'], { label: string; path: string }> = {
  wash: { label: 'ดูประวัติ', path: '/history' },
  coupon: { label: 'ดูคูปอง', path: '/coupon' },
  promo: { label: 'ดูโปรโมชัน', path: '/promotion' },
  points: { label: 'ดูแต้ม', path: '/pointsshop' },
};

const mockNotifications: Notification[] = [
  { id: '1', type: 'wash', title: 'ล้างรถเสร็จแล้ว!', message: 'SHINE MODE ที่สาขาลาดพร้าว เสร็จเรียบร้อย รับ 1,490 คะแนน', time: '5 นาทีก่อน', read: false, iconId: 11695 },
  { id: '2', type: 'coupon', title: 'คูปองใหม่! ส่วนลด 30%', message: 'คูปองส่วนลด 30% สำหรับแพ็ก SPECIAL MODE หมดอายุ 15 เม.ย.', time: '1 ชม.ที่แล้ว', read: false, iconId: 2983 },
  { id: '3', type: 'points', title: 'คะแนนจะหมดอายุ!', message: 'คุณมี 500 คะแนนที่จะหมดอายุในวันที่ 30 เม.ย. ใช้ก่อนหมดนะ!', time: '3 ชม.ที่แล้ว', read: false, iconId: 6703 },
  { id: '4', type: 'promo', title: 'โปรพิเศษวันหยุด!', message: 'ลด 50% ทุกแพ็กเกจ วันเสาร์-อาทิตย์นี้เท่านั้น!', time: 'เมื่อวาน', read: true, iconId: 7694 },
  { id: '5', type: 'wash', title: 'เครื่องว่าง ที่สาขาบางนา', message: 'ตู้ล้างรถ A1 ว่างแล้ว มาล้างรถกันเถอะ!', time: 'เมื่อวาน', read: true, iconId: 25107 },
  { id: '6', type: 'promo', title: 'บทความใหม่: ดูแลสีรถ', message: '5 เคล็ดลับดูแลสีรถให้เงาวับ อ่านเลย!', time: '2 วันก่อน', read: true, iconId: 39070 },
  { id: '7', type: 'points', title: 'ได้รับ 3,990 คะแนน', message: 'จากการล้างรถ SPECIAL MODE ที่สาขาสุขุมวิท', time: '3 วันก่อน', read: true, iconId: 6703 },
  { id: '8', type: 'coupon', title: 'คูปองดูดฝุ่นฟรี!', message: 'นำคูปองไปใช้ได้ทุกสาขา หมดอายุ 1 มิ.ย.', time: '5 วันก่อน', read: true, iconId: 2983 },
];

const filterTabs = [
  { value: 'all', label: 'ทั้งหมด', iconId: 11642 },
  { value: 'wash', label: 'ล้างรถ', iconId: 25107 },
  { value: 'coupon', label: 'คูปอง', iconId: 2983 },
  { value: 'points', label: 'พ้อยท์', iconId: 6703 },
];

export function NotificationPage({ onBack }: { onBack: () => void }) {
  const [localNotifications, setLocalNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const apiQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = useMemo<Notification[]>(() => {
    if (USE_API) {
      return apiQuery.data?.data?.map(mapApiNotification) ?? [];
    }
    return USE_LOCAL_DEV_FALLBACK ? localNotifications : [];
  }, [apiQuery.data, localNotifications]);

  const unreadCount = USE_API
    ? (apiQuery.data?.unreadCount ?? notifications.filter(n => !n.read).length)
    : notifications.filter(n => !n.read).length;
  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);

  const markAllRead = useCallback(() => {
    if (USE_API) {
      markAllReadMutation.mutate();
    }
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [markAllReadMutation]);

  const markRead = useCallback((id: string) => {
    if (USE_API) {
      markReadMutation.mutate(id);
    }
    setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setExpandedId(prev => prev === id ? null : id);
  }, [markReadMutation]);

  const openNotificationAction = useCallback((notif: Notification) => {
    const action = NOTIFICATION_ACTIONS[notif.type];
    if (!action) return;
    markRead(notif.id);
    navigate(action.path);
  }, [markRead, navigate]);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  const unreadList = filtered.filter(n => !n.read);
  const readList = filtered.filter(n => n.read);

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-white font-bold text-base">แจ้งเตือน</h1>
          {unreadCount > 0 && (
            <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-white flex items-center justify-center">
              <span className="text-[10px] font-black text-black">{unreadCount}</span>
            </div>
          )}
        </div>
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-white/50 text-[11px] h-7 hover:text-white">
            อ่านทั้งหมด
          </Button>
        ) : <div className="w-16" />}
      </div>

      {/* Filter Pills */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          {filterTabs.map(tab => {
            const isActive = filter === tab.value;
            const count = tab.value === 'all'
              ? notifications.length
              : notifications.filter(n => n.type === tab.value).length;

            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-[11px] font-medium ${
                  isActive
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/20'
                }`}
              >
                <img src={`${ICONS8_BASE}${24}&id=${tab.iconId}`} width={12} height={12} alt="" className="inline-block flex-shrink-0" style={{ filter: isActive ? 'brightness(0)' : 'invert(1) brightness(1.1)' }} />
                {tab.label}
                <span className={`text-[9px] ${isActive ? 'text-black/50' : 'text-white/20'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 pb-6 space-y-3">

          {/* Unread Section */}
          {unreadList.length > 0 && (
            <>
              <motion.div variants={itemVariants} className="flex items-center gap-2 pt-1">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">ยังไม่อ่าน</span>
                <div className="flex-1 h-px bg-white/5" />
              </motion.div>

              {unreadList.map(notif => (
                <motion.div key={notif.id} variants={itemVariants}>
                  <Card
                    className="p-0 overflow-hidden border-white/10 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => markRead(notif.id)}
                  >
                    {/* Unread indicator bar */}
                    <div className="h-[2px] bg-white" />
                    <div className="p-3.5">
                        <div className="flex items-start gap-3">
                          <IconBox id={notif.iconId} size={16} boxSize="w-10 h-10" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold line-clamp-1">{notif.title}</p>
                            <p className="text-white/50 text-[11px] line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-white/25 text-[10px] mt-1.5">{notif.time}</p>
                            {NOTIFICATION_ACTIONS[notif.type] && (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 text-[11px] px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNotificationAction(notif);
                                  }}
                                >
                                  {NOTIFICATION_ACTIONS[notif.type].label}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
              ))}
            </>
          )}

          {/* Read Section */}
          {readList.length > 0 && (
            <>
              <motion.div variants={itemVariants} className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">อ่านแล้ว</span>
                <div className="flex-1 h-px bg-white/5" />
              </motion.div>

              {readList.map(notif => {
                const isExpanded = expandedId === notif.id;
                return (
                  <motion.div key={notif.id} variants={itemVariants}>
                    <Card
                      className="overflow-hidden border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => markRead(notif.id)}
                    >
                      <div className="p-3.5">
                        <div className="flex items-start gap-3">
                          <IconBox id={notif.iconId} size={14} boxSize="w-9 h-9" />
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white/60 text-[13px] font-semibold line-clamp-1 flex-1">{notif.title}</p>
                                <span className="text-white/15 text-[10px] flex-shrink-0">{notif.time}</span>
                              </div>
                              <AnimatePresence>
                              {isExpanded ? (
                                <motion.p
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="text-white/35 text-[11px] mt-1 leading-relaxed overflow-hidden"
                                >
                                  {notif.message}
                                </motion.p>
                              ) : (
                                <p className="text-white/25 text-[11px] mt-0.5 line-clamp-1">{notif.message}</p>
                              )}
                            </AnimatePresence>
                            {NOTIFICATION_ACTIONS[notif.type] && (
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 text-[11px] px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNotificationAction(notif);
                                  }}
                                >
                                  {NOTIFICATION_ACTIONS[notif.type].label}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </>
          )}

          {/* Empty State */}
          {filtered.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Ico id={11642} size={28} className="opacity-25" />
              </div>
              <p className="text-white/30 text-sm font-medium">ไม่มีการแจ้งเตือน</p>
              <p className="text-white/15 text-xs mt-1">ยังไม่มีข้อความในหมวดนี้</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
