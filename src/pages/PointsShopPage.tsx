import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { getIconUrl, type IconName } from '../services/icons';
import { getUserPoints, formatPoints } from '../services/points';
import { usePointsBalance, useRedeemPoints, useRewards } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { useBranch } from '@/services/branchContext';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  category: string;
  tag?: string;
  icon: IconName;
  iconBg: string;
  stock?: number;
}

const rewards: Reward[] = [
  { id: 'r1', name: 'ส่วนลด 30 บาท', description: 'ใช้ได้กับทุกแพ็กเกจ', points: 300, category: 'discount', icon: 'tag', iconBg: 'bg-orange-500/20' },
  { id: 'r2', name: 'ส่วนลด 50 บาท', description: 'ใช้ได้กับทุกแพ็กเกจ', points: 500, category: 'discount', icon: 'tag', iconBg: 'bg-orange-500/20' },
  { id: 'r3', name: 'ส่วนลด 100 บาท', description: 'ใช้ได้กับแพ็ก SPECIAL MODE', points: 800, category: 'discount', icon: 'tag', iconBg: 'bg-red-500/20', tag: 'HOT' },
  { id: 'r4', name: 'ดูดฝุ่นฟรี', description: 'บริการดูดฝุ่นภายในฟรี 1 ครั้ง', points: 500, category: 'service', icon: 'wind', iconBg: 'bg-blue-500/20' },
  { id: 'r5', name: 'เคลือบเงาฟรี', description: 'เพิ่มเคลือบเงาฟรีกับทุกแพ็ก', points: 1200, category: 'service', icon: 'shine', iconBg: 'bg-purple-500/20', tag: 'จำกัด' },
  { id: 'r6', name: 'ล้างรถฟรี 1 ครั้ง', description: 'QUICK & CLEAN ไซส์ S-M', points: 2000, category: 'service', icon: 'car', iconBg: 'bg-green-500/20', tag: 'BEST' },
  { id: 'r7', name: 'หมวก ROBOSS', description: 'หมวกแบรนด์ ROBOSS Limited Edition', points: 3000, category: 'premium', icon: 'gift', iconBg: 'bg-yellow-500/20', stock: 15 },
  { id: 'r8', name: 'เสื้อยืด ROBOSS', description: 'เสื้อยืดคอกลม Cotton 100%', points: 5000, category: 'premium', icon: 'gift', iconBg: 'bg-yellow-500/20', stock: 8 },
];

export function PointsShopPage({ onBack }: { onBack: () => void }) {
  const { branch } = useBranch();
  const [filter, setFilter] = useState('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const balanceQuery = usePointsBalance();
  const redeemMutation = useRedeemPoints();
  const rewardsQuery = useRewards(branch.id);

  const userPoints = useMemo(() => {
    if (HAS_API_BASE_URL && balanceQuery.data?.balance != null) return balanceQuery.data.balance;
    return USE_LOCAL_DEV_FALLBACK ? getUserPoints() : 0;
  }, [balanceQuery.data]);

  const rewardList = useMemo(() => {
    if (HAS_API_BASE_URL && rewardsQuery.data) {
      return rewardsQuery.data.map((reward) => ({
        id: reward.id,
        name: reward.name,
        description: reward.description || '',
        points: reward.points,
        category: reward.category,
        tag: reward.tag || undefined,
        icon: reward.icon as IconName,
        iconBg: reward.iconBg || 'bg-white/10',
        stock: reward.stock ?? undefined,
      }));
    }

    return rewards;
  }, [rewardsQuery.data]);

  const filtered = filter === 'all' ? rewardList : rewardList.filter(r => r.category === filter);

  const handleRedeem = () => {
    if (HAS_API_BASE_URL && selectedReward) {
      redeemMutation.mutate(
        { amount: selectedReward.points, rewardId: selectedReward.id },
        {
          onSuccess: () => { setSelectedReward(null); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 2000); },
        }
      );
    } else if (USE_LOCAL_DEV_FALLBACK) {
      setSelectedReward(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-app-black/95 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-lg">แลกของรางวัล</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 py-5 space-y-4">
          {/* Points Balance */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 bg-gradient-to-r from-yellow-950/60 to-orange-950/40 border-yellow-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">คะแนนคงเหลือ</p>
                  <p className="text-3xl font-black text-yellow-400">{formatPoints(userPoints)}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">คะแนน</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                  <I8Icon name="lightning" size={28} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Category Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="all" onValueChange={setFilter}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">ทั้งหมด</TabsTrigger>
                <TabsTrigger value="discount" className="flex-1 text-xs">ส่วนลด</TabsTrigger>
                <TabsTrigger value="service" className="flex-1 text-xs">บริการ</TabsTrigger>
                <TabsTrigger value="premium" className="flex-1 text-xs">ของรางวัล</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((reward, index) => {
              const canAfford = userPoints >= reward.points;
              return (
                <motion.div key={reward.id} variants={itemVariants}>
                  <Card
                    className={`p-3.5 cursor-pointer transition-all hover:border-white/20 ${!canAfford ? 'opacity-50' : ''}`}
                    onClick={() => canAfford && setSelectedReward(reward)}
                  >
                    {reward.tag && (
                      <Badge className="absolute top-2 right-2 text-[9px] h-4">{reward.tag}</Badge>
                    )}
                    <div className={`w-11 h-11 rounded-xl ${reward.iconBg} flex items-center justify-center mb-2.5`}>
                      <I8Icon name={reward.icon} size={22} />
                    </div>
                    <p className="text-white text-sm font-bold leading-tight">{reward.name}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5 line-clamp-1">{reward.description}</p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1">
                        <I8Icon name="lightning" size={12} />
                        <span className="text-yellow-400 text-xs font-bold">{formatPoints(reward.points)}</span>
                      </div>
                      {reward.stock !== undefined && (
                        <span className="text-[9px] text-gray-500">เหลือ {reward.stock}</span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <div className="h-4" />
        </motion.div>
      </div>

      {/* Redeem Confirmation Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>ยืนยันการแลก</DialogTitle>
            <DialogDescription>ต้องการแลก {selectedReward?.name} หรือไม่?</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-3">
            <div className={`w-12 h-12 rounded-xl ${selectedReward?.iconBg} flex items-center justify-center`}>
              {selectedReward && <I8Icon name={selectedReward.icon} size={24} />}
            </div>
            <div>
              <p className="text-white font-bold">{selectedReward?.name}</p>
              <p className="text-yellow-400 text-sm flex items-center gap-1">
                <I8Icon name="lightning" size={14} /> {selectedReward ? formatPoints(selectedReward.points) : 0} คะแนน
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400">คะแนนคงเหลือหลังแลก: <span className="text-white font-bold">{formatPoints(userPoints - (selectedReward?.points || 0))}</span></p>
          <DialogFooter className="flex-row gap-2">
            <DialogClose asChild><Button variant="outline" className="flex-1">ยกเลิก</Button></DialogClose>
            <Button className="flex-1" onClick={handleRedeem}>ยืนยันแลก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-[200] flex items-center gap-2"
        >
          <I8Icon name="checkmark" size={18} /> แลกสำเร็จ!
        </motion.div>
      )}
    </div>
  );
}
