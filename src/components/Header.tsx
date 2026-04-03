import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import fireAnimation from '../Fire.json';
import { listenToUser, formatPoints } from '../services/points';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useBranch, type BranchInfo } from '../services/branchContext';
import type { User } from '../services/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { usePointsBalance } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const { user: authUser } = useAuth();
  const { data: pointsBalance } = usePointsBalance();
  const { branch, allBranches, setBranch } = useBranch();
  const [showPicker, setShowPicker] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'bike'>('all');

  useEffect(() => {
    if (USE_LOCAL_DEV_FALLBACK) {
      const unsub = listenToUser(setUser);
      return unsub;
    }
  }, []);

  const displayName = HAS_API_BASE_URL ? authUser?.displayName : user?.displayName;
  const avatarUrl = HAS_API_BASE_URL ? authUser?.avatarUrl : user?.avatarUrl;
  const points = HAS_API_BASE_URL
    ? (pointsBalance?.balance ?? authUser?.totalPoints ?? 0)
    : (user?.points ?? 0);

  const filteredBranches = typeFilter === 'all' ? allBranches : allBranches.filter(b => b.type === typeFilter);

  return (
    <>
      <header className="sticky top-0 z-50 bg-app-black/95 backdrop-blur-md border-b border-white/5">
        {/* Main header row */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <img src="/Roboss_logo.png" alt="ROBOSS" className="h-10 w-auto object-contain" />

          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center gap-1 bg-black border border-white/10 rounded-full pl-7 pr-2.5 py-1 overflow-visible">
              <div className="absolute left-0 -translate-x-1/4 -top-4 w-10 h-10 pointer-events-none z-10">
                <Lottie animationData={fireAnimation} loop className="w-full h-full" />
              </div>
              <span className="text-[11px] font-black text-white leading-none whitespace-nowrap">
                {formatPoints(points)}
              </span>
              <span className="text-[9px] text-white/30 leading-none">pt</span>
            </div>

            <Avatar className="w-9 h-9 border-2 border-white/10">
              <AvatarImage
                src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100'}
                alt="User"
              />
              <AvatarFallback className="bg-black text-white text-xs">{displayName?.[0] || 'W'}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Branch indicator bar */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border-t border-white/[0.04] active:bg-white/[0.04] transition-colors"
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${branch.isOpen ? 'bg-green-500' : 'bg-gray-500'}`} />
          <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${branch.type === 'bike' ? 'bg-orange-500/15' : 'bg-app-red/15'}`}>
            {branch.type === 'bike' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={branch.type === 'bike' ? '#F97316' : '#DC2626'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-[11px] font-bold truncate leading-none">{branch.shortName}</p>
            <p className="text-white/20 text-[9px] truncate leading-none mt-0.5">{branch.hours} • {branch.type === 'bike' ? 'ล้างมอไซค์' : 'ล้างรถยนต์'} · พ้อยท์รวมทุกสาขา</p>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 flex-shrink-0">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </header>

      {/* Branch picker overlay */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#111] rounded-t-2xl border-t border-white/10 max-h-[75vh] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 bg-white/10 rounded-full" />
              </div>

              {/* Title */}
              <div className="px-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">เลือกสาขา</p>
                  <p className="text-white/20 text-[10px]">{allBranches.length} สาขาทั้งหมด</p>
                </div>
                <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {/* Type filter */}
              <div className="flex gap-2 px-4 pb-3">
                {([['all', 'ทั้งหมด'], ['car', 'ล้างรถยนต์'], ['bike', 'ล้างมอไซค์']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                      typeFilter === key
                        ? key === 'bike' ? 'bg-orange-500 text-white border-orange-500' : 'bg-app-red text-white border-app-red'
                        : 'bg-white/[0.03] text-white/40 border-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Branch list */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 space-y-1.5">
                {filteredBranches.map(b => {
                  const isActive = branch.id === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => { setBranch(b); setShowPicker(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                        isActive
                          ? b.type === 'bike' ? 'bg-orange-500/10 border border-orange-500/25' : 'bg-app-red/10 border border-app-red/25'
                          : 'bg-white/[0.02] border border-white/[0.04]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        b.type === 'bike' ? 'bg-orange-950/50' : 'bg-black'
                      } border ${isActive ? (b.type === 'bike' ? 'border-orange-500/30' : 'border-app-red/30') : 'border-white/5'}`}>
                        <img src={b.type === 'bike' ? '/roboss_bike_icon.png' : '/roboss_car_icon.png'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold truncate ${isActive ? 'text-white' : 'text-white/70'}`}>{b.shortName}</p>
                        <p className="text-white/20 text-[10px] truncate">{b.address}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${b.isOpen ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span className="text-white/25 text-[9px]">{b.isOpen ? 'เปิด' : 'ปิด'} • {b.hours}</span>
                        </div>
                      </div>
                      {isActive && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${b.type === 'bike' ? 'bg-orange-500' : 'bg-app-red'}`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
