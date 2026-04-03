import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import fireAnimation from '../Fire.json';
import stoneAnimation from '../Stone.json';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getIconUrl, type IconName } from '../services/icons';
import { listenToUser, formatPoints } from '../services/points';
import type { User as MockUser } from '../services/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionHistory, useStamps, usePointsBalance } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';

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

const TOTAL_STAMPS = 10;
const STORAGE_KEY = 'roboss_stamps';

const memberTiers = [
  { name: 'Bronze', min: 0, max: 5000 },
  { name: 'Silver', min: 5000, max: 15000 },
  { name: 'Gold', min: 15000, max: 50000 },
  { name: 'Platinum', min: 50000, max: 999999 },
];

const benefits = [
  { icon: 12394, title: 'ส่วนลดพิเศษ', sub: 'คูปองส่วนลดทุกเดือน' },
  { icon: 6703, title: 'พ้อยท์ x2', sub: 'ทุกวันอังคาร' },
  { icon: 338, title: 'ของขวัญวันเกิด', sub: 'รับฟรีทุกปี' },
  { icon: 25107, title: 'ล้างรถฟรี', sub: 'สะสมครบ 10 แสตมป์' },
];

const fallbackTransactions = [
  { id: 1, service: 'SHINE MODE', branch: 'สาขาลาดพร้าว', date: '28 มี.ค.', points: '+1,490', iconId: 25107 },
  { id: 2, service: 'SPECIAL MODE', branch: 'สาขาสุขุมวิท', date: '15 มี.ค.', points: '+3,990', iconId: 25107 },
  { id: 3, service: 'QUICK & CLEAN', branch: 'สาขาบางนา', date: '10 มี.ค.', points: '+990', iconId: 25107 },
];

export function MemberCard({ onBack }: { onBack: () => void }) {
  const { user: authUser } = useAuth();
  const sessionHistoryQuery = useSessionHistory();
  const { data: apiStamps } = useStamps();
  const { data: apiPoints } = usePointsBalance();
  const [mockUser, setMockUser] = useState<MockUser | null>(null);

  const [stamps, setStamps] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [animating, setAnimating] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (USE_LOCAL_DEV_FALLBACK) {
      const unsub = listenToUser(setMockUser);
      return unsub;
    }
  }, []);

  const user = useMemo(() => {
    if (HAS_API_BASE_URL && authUser) {
      return {
        displayName: authUser.displayName,
        avatarUrl: authUser.avatarUrl,
        points: apiPoints?.balance ?? authUser.totalPoints,
        totalWashes: authUser.totalWashes,
        memberSince: new Date(authUser.memberSince),
      } as MockUser;
    }
    return mockUser;
  }, [authUser, mockUser, apiPoints]);

  useEffect(() => {
    if (HAS_API_BASE_URL && apiStamps) {
      setStamps(apiStamps.currentCount);
    }
  }, [apiStamps]);

  useEffect(() => {
    if (USE_LOCAL_DEV_FALLBACK) {
      localStorage.setItem(STORAGE_KEY, String(stamps));
    }
    if (stamps === TOTAL_STAMPS) setTimeout(() => setShowReward(true), 400);
  }, [stamps]);

  const addStamp = () => {
    if (!USE_LOCAL_DEV_FALLBACK) return;
    if (stamps >= TOTAL_STAMPS) return;
    const next = stamps + 1;
    setAnimating(next - 1);
    setStamps(next);
    setTimeout(() => setAnimating(null), 800);
  };
  const reset = () => {
    if (!USE_LOCAL_DEV_FALLBACK) return;
    setStamps(0);
    setShowReward(false);
  };

  const transactions = useMemo(() => {
    if (HAS_API_BASE_URL && sessionHistoryQuery.data?.data) {
      return sessionHistoryQuery.data.data
        .filter((session) => session.status === 'completed')
        .slice(0, 3)
        .map((session) => ({
          id: session.id,
          service: session.package?.name || session.packageId,
          branch: session.branch?.name || session.branchId,
          date: new Date(session.completedAt || session.createdAt).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
          }),
          points: `+${formatPoints(session.pointsEarned)}`,
          iconId: 25107,
        }));
    }

    return USE_LOCAL_DEV_FALLBACK ? fallbackTransactions : [];
  }, [sessionHistoryQuery.data]);

  const currentTier = memberTiers.find(t => (user?.points || 0) >= t.min && (user?.points || 0) < t.max) || memberTiers[0];
  const nextTier = memberTiers[memberTiers.indexOf(currentTier) + 1];
  const tierProgress = nextTier ? ((user?.points || 0) - currentTier.min) / (nextTier.min - currentTier.min) * 100 : 100;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">บัตรสมาชิก</h1>
        <div className="w-10" />
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 pt-4 pb-6 space-y-4">

          {/* Platinum Card */}
          <motion.div variants={itemVariants}>
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '1.586/1' }}>
              {/* Metallic layered background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0d0d0d]" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#3a3a3a]/30 to-transparent" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)' }} />

              {/* Red accent glow */}
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-app-red/12 rounded-full blur-3xl" />
              <div className="absolute top-0 left-0 w-24 h-24 bg-white/[0.03] rounded-full -ml-8 -mt-8 blur-2xl" />

              {/* Holographic shine sweep */}
              <motion.div
                className="absolute inset-0 -translate-x-full"
                style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)' }}
                animate={{ translateX: ['-100%', '250%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
              />
              {/* Secondary rainbow shimmer */}
              <motion.div
                className="absolute inset-0 -translate-x-full opacity-40"
                style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(200,50,50,0.08) 45%, rgba(255,255,255,0.05) 50%, rgba(200,50,50,0.08) 55%, transparent 65%)' }}
                animate={{ translateX: ['-100%', '250%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut', delay: 0.3 }}
              />

              {/* Top metallic edge highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent" />
              <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

              {/* Card content */}
              <div className="relative z-10 p-5 flex flex-col h-full justify-between">
                {/* Top: Logo + Tier */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ background: 'linear-gradient(135deg, #e8e8e8, #a0a0a0, #e8e8e8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ROBOSS</p>
                    <p className="text-[8px] text-white/20 tracking-[0.3em] uppercase mt-0.5 font-medium">Platinum Member</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-2.5 py-0.5 rounded bg-gradient-to-r from-white/10 to-white/5 border border-white/10">
                      <span className="text-[9px] font-bold tracking-wider" style={{ background: 'linear-gradient(135deg, #e8e8e8, #b0b0b0, #e8e8e8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{currentTier.name}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Chip + Contactless */}
                <div className="flex items-center gap-3">
                  {/* EMV Chip */}
                  <div className="w-10 h-7 rounded-[3px] overflow-hidden border border-[#8a7a50]/40" style={{ background: 'linear-gradient(145deg, #c9a84c, #a08535, #d4b45c, #a08535)' }}>
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[0.5px] p-[2px]">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="rounded-[0.5px]" style={{ background: 'linear-gradient(135deg, #d4b860, #b8972e)' }} />
                      ))}
                    </div>
                  </div>
                  {/* Contactless icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-25">
                    <path d="M6.5 12a5.5 5.5 0 0 1 5.5-5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M3 12a9 9 0 0 1 9-9" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 12a2 2 0 0 1 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Bottom: Member info + QR */}
                <div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[15px] font-mono tracking-[0.25em] text-white/80 mb-2">RB 2024 0015 8</p>
                      <div>
                        <p className="text-[8px] text-white/20 tracking-wider uppercase mb-0.5">Card Holder</p>
                        <p className="text-sm font-bold tracking-wide" style={{ background: 'linear-gradient(135deg, #f0f0f0, #c0c0c0, #f0f0f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.displayName || 'USER'}</p>
                      </div>
                    </div>
                    {/* QR */}
                    <div className="bg-white p-1.5 rounded-md shadow-lg shadow-black/20">
                      <div className="w-9 h-9 grid grid-cols-5 grid-rows-5 gap-[1px]">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={`rounded-[0.5px] ${[0,1,2,4,5,6,10,12,14,18,20,22,23,24].includes(i) ? 'bg-[#1a1a1a]' : 'bg-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom details row */}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[7px] text-white/15 tracking-wider uppercase">Valid From</p>
                        <p className="text-[9px] text-white/30 font-mono">01/24</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-white/15 tracking-wider uppercase">Valid Thru</p>
                        <p className="text-[9px] text-white/30 font-mono">12/29</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-app-red/60" />
                      <div className="w-4 h-4 rounded-full bg-white/15 -ml-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Points + Tier */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0 -my-2">
                    <Lottie animationData={stoneAnimation} loop className="w-full h-full" />
                  </div>
                  <div>
                    <p className="text-white font-black text-xl leading-none">{user ? formatPoints(user.points) : '0'}</p>
                    <p className="text-white/30 text-[10px]">พ้อยท์สะสม</p>
                  </div>
                </div>
                {nextTier && (
                  <div className="text-right">
                    <p className="text-white/40 text-[10px]">ถึง {nextTier.name}</p>
                    <p className="text-app-red text-xs font-bold">{formatPoints(nextTier.min - (user?.points || 0))} pt</p>
                  </div>
                )}
              </div>
              {/* Progress */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-app-red rounded-full transition-all duration-500" style={{ width: `${tierProgress}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-white/25">{currentTier.name}</span>
                {nextTier && <span className="text-[9px] text-white/25">{nextTier.name}</span>}
              </div>
            </Card>
          </motion.div>

          {/* Stamp Collection */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <IconBox id={39070} size={14} boxSize="w-8 h-8" />
                  <div>
                    <p className="text-white font-bold text-sm">สะสมแสตมป์</p>
                    <p className="text-white/25 text-[10px]">ล้าง {TOTAL_STAMPS} ครั้ง รับฟรี 1 ครั้ง</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-app-red/30 text-app-red">{stamps}/{TOTAL_STAMPS}</Badge>
              </div>

              {/* Stamp grid */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {Array.from({ length: TOTAL_STAMPS }).map((_, i) => {
                  const collected = i < stamps;
                  return (
                    <div
                      key={i}
                      className={`relative aspect-square rounded-xl flex items-center justify-center transition-all duration-300 ${
                        collected
                          ? 'bg-app-red/15 border border-app-red/25'
                          : 'bg-white/[0.02] border border-dashed border-white/10'
                      } ${animating === i ? 'scale-110' : ''}`}
                    >
                      {collected
                        ? <Lottie animationData={fireAnimation} loop className="w-full h-full p-1" />
                        : <span className="text-xs font-black text-white/10">{i + 1}</span>
                      }
                    </div>
                  );
                })}
              </div>

              {/* Reward row */}
              <div className={`flex items-center gap-3 rounded-xl p-3 border ${
                stamps === TOTAL_STAMPS ? 'bg-app-red/10 border-app-red/25' : 'bg-white/[0.02] border-white/5'
              }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  stamps === TOTAL_STAMPS ? 'bg-app-red' : 'bg-black border border-white/10'
                }`}>
                  <Ico id={25107} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${stamps === TOTAL_STAMPS ? 'text-white' : 'text-white/30'}`}>ล้างรถฟรี 1 ครั้ง</p>
                  <p className="text-[10px] text-white/20">สะสมครบ {TOTAL_STAMPS} แสตมป์</p>
                </div>
                {stamps === TOTAL_STAMPS && (
                  <Button size="sm" className="bg-app-red hover:bg-red-600 rounded-full text-xs h-7 px-3">รับเลย</Button>
                )}
              </div>

              <Button variant="secondary" onClick={addStamp} disabled={!USE_LOCAL_DEV_FALLBACK || stamps >= TOTAL_STAMPS} className="w-full mt-3 text-xs h-9">
                {stamps >= TOTAL_STAMPS ? 'สะสมแสตมป์ครบแล้ว' : '+ จำลองเพิ่มแสตมป์'}
              </Button>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 border-white/5">
              <div className="flex items-center gap-2.5 mb-3">
                <IconBox id={12566} size={14} boxSize="w-8 h-8" />
                <p className="text-white font-bold text-sm">สิทธิพิเศษสมาชิก</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/[0.02] rounded-xl p-2.5 border border-white/5">
                    <div className="w-7 h-7 rounded-lg bg-app-red/10 border border-app-red/15 flex items-center justify-center flex-shrink-0">
                      <Ico id={b.icon} size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-[11px] font-bold truncate">{b.title}</p>
                      <p className="text-white/20 text-[9px] truncate">{b.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-white/5">
              <div className="flex items-center justify-between p-4 pb-0">
                <div className="flex items-center gap-2.5">
                  <IconBox id={2294} size={14} boxSize="w-8 h-8" />
                  <p className="text-white font-bold text-sm">ล้างรถล่าสุด</p>
                </div>
              </div>
              <div className="p-4 pt-3 space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-app-red/10 border border-app-red/15 flex items-center justify-center flex-shrink-0">
                      <Ico id={tx.iconId} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[12px] font-bold truncate">{tx.service}</p>
                      <p className="text-white/25 text-[10px]">{tx.branch} • {tx.date}</p>
                    </div>
                    <span className="text-app-red text-xs font-bold flex-shrink-0">{tx.points}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
