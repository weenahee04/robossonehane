import React, { useState, useEffect, useMemo } from 'react';
import Lottie from 'lottie-react';
import fireAnimation from '../Fire.json';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getIconUrl, type IconName } from '../services/icons';
import { useStamps, useClaimStampReward } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

const TOTAL_STAMPS = 10;
const STORAGE_KEY = 'roboss_stamps';

export function StampPage({ onBack }: { onBack: () => void }) {
  const [localStamps, setLocalStamps] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [animating, setAnimating] = useState<number | null>(null);
  const [showReward, setShowReward] = useState(false);

  const stampsQuery = useStamps();
  const claimRewardMutation = useClaimStampReward();

  const stamps = useMemo(() => {
    if (HAS_API_BASE_URL && stampsQuery.data?.currentCount != null) return stampsQuery.data.currentCount;
    return localStamps;
  }, [stampsQuery.data, localStamps]);

  const totalTarget = useMemo(() => {
    if (HAS_API_BASE_URL && stampsQuery.data?.targetCount) return stampsQuery.data.targetCount;
    return TOTAL_STAMPS;
  }, [stampsQuery.data]);

  const rewardClaimed = useMemo(() => {
    if (HAS_API_BASE_URL && stampsQuery.data) return stampsQuery.data.rewardClaimed;
    return false;
  }, [stampsQuery.data]);

  useEffect(() => {
    if (USE_LOCAL_DEV_FALLBACK) {
      localStorage.setItem(STORAGE_KEY, String(localStamps));
    }
    if (stamps >= totalTarget && !rewardClaimed) {
      setTimeout(() => setShowReward(true), 400);
    }
  }, [stamps, localStamps, totalTarget, rewardClaimed]);

  const progressPercent = Math.min(100, (stamps / totalTarget) * 100);
  const isRewardReady = stamps >= totalTarget && !rewardClaimed;

  const addStamp = () => {
    if (!USE_LOCAL_DEV_FALLBACK) return;
    if (localStamps >= TOTAL_STAMPS) return;
    const next = localStamps + 1;
    setAnimating(next - 1);
    setLocalStamps(next);
    setTimeout(() => setAnimating(null), 800);
  };

  const reset = () => {
    if (!USE_LOCAL_DEV_FALLBACK) return;
    setLocalStamps(0);
    setShowReward(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-app-black/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
          <I8Icon name="back" size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">สะสมแสตมป์</h1>
          <p className="text-[10px] text-gray-400">ล้างรถ {TOTAL_STAMPS} ครั้ง รับฟรี 1 ครั้ง</p>
        </div>
        <Button variant="ghost" size="icon" onClick={reset} className="text-gray-400">
          <I8Icon name="refresh" size={15} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6 flex flex-col gap-6">
        {/* Progress */}
        <div className="bg-app-dark rounded-2xl p-4 border border-app-dark">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">ความคืบหน้า</span>
            <span className="text-sm font-bold text-yellow-400">{stamps} / {totalTarget}</span>
          </div>
          <div className="w-full h-2 bg-black rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stamp grid */}
        <div className="bg-app-dark rounded-2xl p-5 border border-app-dark">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: totalTarget }).map((_, i) => {
              const collected = i < stamps;
              const isNew = animating === i;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                      ${collected
                        ? 'bg-gradient-to-br from-orange-900/60 to-yellow-900/40 border border-orange-500/40 shadow-[0_0_12px_rgba(234,88,12,0.3)]'
                        : 'bg-black/40 border border-white/10'
                      }
                      ${isNew ? 'scale-125' : 'scale-100'}
                    `}
                  >
                    {collected ? (
                      <div className="w-12 h-12">
                        <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
                      </div>
                    ) : (
                      <span className="text-lg font-black text-white/20">{i + 1}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reward slot */}
          <div className="mt-5 flex items-center gap-3 bg-black/30 rounded-xl p-3 border border-yellow-500/20">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500
              ${isRewardReady
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-[0_0_16px_rgba(234,179,8,0.5)]'
                : 'bg-black/40 border border-white/10'
              }`}
            >
              <I8Icon name="gift" size={22} className={isRewardReady ? '' : 'opacity-20'} />
            </div>
            <div>
              <p className={`text-sm font-bold ${isRewardReady ? 'text-yellow-400' : 'text-white/30'}`}>
                ล้างรถฟรี 1 ครั้ง
              </p>
              <p className="text-[10px] text-gray-500">เมื่อสะสมครบ {totalTarget} แสตมป์</p>
            </div>
          </div>
        </div>

        {/* Reward banner */}
        {showReward && (
          <div className="bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-500 rounded-2xl p-5 text-center shadow-[0_4px_24px_rgba(234,88,12,0.4)]">
            <div className="w-16 h-16 mx-auto mb-2">
              <Lottie animationData={fireAnimation} loop={true} className="w-full h-full" />
            </div>
            <h2 className="text-xl font-black text-white mb-1">ยินดีด้วย!</h2>
            <p className="text-sm text-white/90 mb-3">คุณสะสมแสตมป์ครบ {totalTarget} ดวงแล้ว</p>
            <Button
              variant="secondary"
              className="bg-white text-orange-600 font-bold text-sm rounded-full hover:bg-white/90"
              onClick={() => { if (HAS_API_BASE_URL) claimRewardMutation.mutate(); }}
            >
              รับของรางวัล
            </Button>
          </div>
        )}

        {/* Add stamp button (demo) */}
        <Button
          onClick={addStamp}
          disabled={stamps >= totalTarget || HAS_API_BASE_URL}
          className="w-full py-4 text-sm disabled:opacity-40">
          {stamps >= totalTarget ? 'สะสมแสตมป์ครบแล้ว' : '+ เพิ่มแสตมป์ (จำลองการล้างรถ)'}
        </Button>
      </div>
    </div>
  );
}
