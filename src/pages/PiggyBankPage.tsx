import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import savingAnimation from '../SavingMoney.json';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getIconUrl, type IconName } from '../services/icons';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

interface PiggyBankPageProps {
  onBack: () => void;
}

const STORAGE_KEY = 'roboss_piggybank';
const CASHBACK_RATE = 0.05; // 5% cashback per wash

const washHistory = [
  { id: 1, service: 'ล้างรถอัตโนมัติ', branch: 'สาขาลาดพร้าว', date: '25 มี.ค. 2568', amount: 299, cashback: 14.95 },
  { id: 2, service: 'เคลือบแก้ว', branch: 'สาขาสุขุมวิท 71', date: '18 มี.ค. 2568', amount: 1290, cashback: 64.50 },
  { id: 3, service: 'ดูดฝุ่นภายใน', branch: 'สาขาบางนา', date: '10 มี.ค. 2568', amount: 199, cashback: 9.95 },
  { id: 4, service: 'ล้างรถอัตโนมัติ', branch: 'สาขาพหลโยธิน', date: '2 มี.ค. 2568', amount: 299, cashback: 14.95 },
  { id: 5, service: 'ขัดสี', branch: 'สาขาลาดพร้าว', date: '20 ก.พ. 2568', amount: 890, cashback: 44.50 },
];

const levels = [
  { name: 'เริ่มต้น', min: 0, max: 100, color: 'from-gray-600 to-gray-500', icon: 'S' },
  { name: 'ประหยัด', min: 100, max: 300, color: 'from-green-700 to-green-500', icon: 'A' },
  { name: 'นักออม', min: 300, max: 600, color: 'from-blue-700 to-blue-500', icon: 'S+' },
  { name: 'มาสเตอร์', min: 600, max: 1000, color: 'from-yellow-600 to-amber-400', icon: 'SS' },
  { name: 'ตำนาน', min: 1000, max: Infinity, color: 'from-purple-700 to-pink-500', icon: 'MAX' },
];

const rewards = [
  { id: 1, name: 'ส่วนลด 20 บาท', coins: 50, icon: 'tag' },
  { id: 2, name: 'ล้างรถฟรี 1 ครั้ง', coins: 200, icon: 'car' },
  { id: 3, name: 'เคลือบแก้วฟรี', coins: 500, icon: 'shine' },
  { id: 4, name: 'แพ็คเกจพรีเมียม', coins: 800, icon: 'star' },
];

export function PiggyBankPage({ onBack }: PiggyBankPageProps) {
  const [savings, setSavings] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : 148.85;
  });
  const [tab, setTab] = useState<'piggy' | 'history' | 'rewards'>('piggy');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedReward, setSelectedReward] = useState<typeof rewards[0] | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(savings));
  }, [savings]);

  const currentLevel = levels.find(l => savings >= l.min && savings < l.max) || levels[0];
  const nextLevel = levels[levels.indexOf(currentLevel) + 1];
  const progressPct = nextLevel
    ? ((savings - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const handleRedeem = (reward: typeof rewards[0]) => {
    if (savings >= reward.coins) {
      setSelectedReward(reward);
      setSavings(prev => parseFloat((prev - reward.coins).toFixed(2)));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-app-black/95 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-lg">กระปุกออมสิน</h1>
        <div className="w-10" />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-app-dark px-4 bg-app-black flex-shrink-0">
        {([
          { key: 'piggy', label: 'กระปุก' },
          { key: 'history', label: 'ประวัติ' },
          { key: 'rewards', label: 'แลกของ' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              tab === t.key
                ? 'text-amber-400 border-amber-400'
                : 'text-gray-500 border-transparent'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">
        {/* ========== PIGGY TAB ========== */}
        {tab === 'piggy' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="px-4 pt-6 space-y-5">

            {/* Lottie + balance card */}
            <motion.div variants={itemVariants} className="relative">
              <div className="bg-gradient-to-br from-amber-950/80 via-app-dark to-app-black rounded-3xl border border-amber-500/20 overflow-hidden">
                {/* Lottie animation */}
                <div className="flex justify-center pt-4 pb-0">
                  <div className="w-44 h-44">
                    <Lottie animationData={savingAnimation} loop={true} />
                  </div>
                </div>

                {/* Balance */}
                <div className="px-5 pb-5 text-center">
                  <p className="text-xs text-amber-400/70 tracking-widest uppercase mb-1">ยอดสะสมทั้งหมด</p>
                  <motion.p
                    key={savings}
                    initial={{ scale: 1.1, color: '#fbbf24' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={{ duration: 0.4 }}
                    className="text-4xl font-black text-white">
                    ฿{savings.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </motion.p>
                  <p className="text-xs text-gray-400 mt-1">
                    เทียบเท่า <span className="text-amber-400 font-bold">{Math.floor(savings)}</span> เหรียญ
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Level card */}
            <motion.div variants={itemVariants} className="bg-app-dark rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentLevel.icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">ระดับปัจจุบัน</p>
                    <p className="text-sm font-bold text-white">{currentLevel.name}</p>
                  </div>
                </div>
                {nextLevel && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">ถัดไป: {nextLevel.name}</p>
                    <p className="text-xs text-amber-400 font-bold">
                      อีก ฿{(nextLevel.min - savings).toFixed(0)}
                    </p>
                  </div>
                )}
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPct, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${currentLevel.color}`} />
              </div>
              {nextLevel && (
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-gray-500">฿{currentLevel.min}</span>
                  <span className="text-[10px] text-gray-500">฿{nextLevel.min}</span>
                </div>
              )}
            </motion.div>

            {/* Cashback rate info */}
            <motion.div variants={itemVariants} className="bg-gradient-to-r from-green-950/60 to-emerald-950/60 rounded-2xl border border-green-500/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <I8Icon name="trending" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">รับเงินคืนอัตโนมัติ</p>
                  <p className="text-xs text-gray-400">ทุกครั้งที่ล้างรถ รับ <span className="text-green-400 font-bold">5%</span> เข้ากระปุกทันที</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 rounded-xl p-2">
                  <p className="text-[10px] text-gray-500">ล้างรถ</p>
                  <p className="text-xs font-bold text-amber-400">+฿14.95</p>
                  <p className="text-[10px] text-gray-600">ต่อครั้ง</p>
                </div>
                <div className="bg-black/30 rounded-xl p-2">
                  <p className="text-[10px] text-gray-500">เคลือบแก้ว</p>
                  <p className="text-xs font-bold text-amber-400">+฿64.50</p>
                  <p className="text-[10px] text-gray-600">ต่อครั้ง</p>
                </div>
                <div className="bg-black/30 rounded-xl p-2">
                  <p className="text-[10px] text-gray-500">ขัดสี</p>
                  <p className="text-xs font-bold text-amber-400">+฿44.50</p>
                  <p className="text-[10px] text-gray-600">ต่อครั้ง</p>
                </div>
              </div>
            </motion.div>

            {/* Recent cashback */}
            <motion.div variants={itemVariants} className="space-y-2">
              <p className="text-sm font-bold text-white px-1">เงินคืนล่าสุด</p>
              {washHistory.slice(0, 3).map(tx => (
                <div key={tx.id} className="bg-app-dark rounded-xl p-3 border border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                    <span className="text-sm">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{tx.service}</p>
                    <p className="text-[10px] text-gray-500">{tx.branch} • {tx.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-green-400">+฿{tx.cashback.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">จาก ฿{tx.amount}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ========== HISTORY TAB ========== */}
        {tab === 'history' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="px-4 pt-6 space-y-4">

            {/* Summary */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
              <div className="bg-app-dark rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[10px] text-gray-400 mb-1">รวมเงินที่จ่าย</p>
                <p className="text-xl font-black text-white">
                  ฿{washHistory.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-app-dark rounded-2xl p-4 border border-amber-500/20 text-center">
                <p className="text-[10px] text-amber-400/70 mb-1">รวมเงินคืน</p>
                <p className="text-xl font-black text-green-400">
                  +฿{washHistory.reduce((s, t) => s + t.cashback, 0).toFixed(2)}
                </p>
              </div>
            </motion.div>

            {/* Full history list */}
            <motion.div variants={itemVariants} className="space-y-2">
              <p className="text-sm font-bold text-white px-1">ประวัติทั้งหมด</p>
              {washHistory.map(tx => (
                <div key={tx.id} className="bg-app-dark rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">{tx.service}</p>
                      <p className="text-xs text-gray-400">{tx.branch}</p>
                    </div>
                    <p className="text-[10px] text-gray-500">{tx.date}</p>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">ยอดชำระ</span>
                      <span className="text-sm font-bold text-white">฿{tx.amount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">เงินคืน 5%</span>
                      <span className="text-sm font-bold text-green-400">+฿{tx.cashback.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ========== REWARDS TAB ========== */}
        {tab === 'rewards' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="px-4 pt-6 space-y-4">

            {/* Balance chip */}
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl py-3 px-4">
              <span className="text-lg">P</span>
              <span className="text-white font-bold">ยอดในกระปุก:</span>
              <span className="text-amber-400 font-black text-lg">฿{savings.toFixed(2)}</span>
            </motion.div>

            {/* Rewards grid */}
            <motion.div variants={itemVariants} className="space-y-3">
              <p className="text-sm font-bold text-white px-1">ของรางวัลที่แลกได้</p>
              {rewards.map(reward => {
                const canAfford = savings >= reward.coins;
                return (
                  <div key={reward.id}
                    className={`bg-app-dark rounded-2xl p-4 border transition-all ${
                      canAfford ? 'border-amber-500/30' : 'border-white/5 opacity-60'
                    }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        canAfford ? 'bg-amber-500/20' : 'bg-white/5'
                      }`}>
                        {reward.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{reward.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-amber-400 text-xs font-bold">฿{reward.coins}</span>
                          <span className="text-gray-500 text-xs">จากกระปุก</span>
                        </div>
                      </div>
                      {canAfford ? (
                        <button
                          onClick={() => handleRedeem(reward)}
                          className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-900 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-900/30">
                          แลก
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-600">
                          <I8Icon name="lock" size={12} />
                          <span className="text-xs">ไม่พอ</span>
                        </div>
                      )}
                    </div>
                    {!canAfford && (
                      <div className="mt-2 ml-16">
                        <p className="text-[10px] text-gray-500">
                          ต้องการอีก <span className="text-amber-500">฿{(reward.coins - savings).toFixed(2)}</span>
                        </p>
                        <div className="w-full h-1 bg-black rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full"
                            style={{ width: `${Math.min((savings / reward.coins) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {showSuccess && selectedReward && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            className="absolute bottom-28 left-4 right-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-4 shadow-2xl z-[60] flex items-center gap-3">
            <span className="text-2xl">{selectedReward.icon}</span>
            <div>
              <p className="text-white font-black text-sm">แลกสำเร็จ!</p>
              <p className="text-green-200 text-xs">{selectedReward.name} ถูกเพิ่มในคูปองของคุณแล้ว</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-app-black via-app-black to-transparent z-40">
        <Button className="w-full text-sm" onClick={onBack}>
          จองล้างรถ – สะสมเงินคืน
        </Button>
      </div>
    </div>
  );
}
