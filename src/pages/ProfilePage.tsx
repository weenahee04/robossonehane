import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useVehicles } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { listenToUser, formatPoints } from '@/services/points';
import { getIconUrl, type IconName } from '@/services/icons';
import type { User as MockUser } from '@/services/mockData';
import fireAnimation from '../Fire.json';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return <img src={`${ICONS8_BASE}${size * 2}&id=${id}`} width={size} height={size} alt="" className={`inline-block flex-shrink-0 ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} loading="lazy" />;
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

function IconBox({ id, size = 14, boxSize = 'w-8 h-8' }: { id: string | number; size?: number; boxSize?: string }) {
  return (
    <div className={`${boxSize} rounded-lg bg-black border border-white/10 flex items-center justify-center flex-shrink-0`}>
      <Ico id={id} size={size} />
    </div>
  );
}

const memberTiers = [
  { name: 'Bronze', min: 0, max: 5000, icon: 12566 },
  { name: 'Silver', min: 5000, max: 15000, icon: 12566 },
  { name: 'Gold', min: 15000, max: 50000, icon: 12566 },
  { name: 'Platinum', min: 50000, max: 999999, icon: 6478 },
];

const mockSavedCars: { id: string; plate: string; brand: string; size: 'S' | 'M' | 'L' }[] = [
  { id: '1', plate: 'กข 1234', brand: 'Toyota Yaris', size: 'S' },
  { id: '2', plate: 'ขค 5678', brand: 'Honda CR-V', size: 'L' },
];

const defaultContact = {
  phone: '089-123-4567',
  email: 'user@example.com',
};

const profileMenuItems = [
  { icon: 'LeS5bIxWv2Kc', label: 'นโยบายความเป็นส่วนตัว', sub: 'เงื่อนไขการใช้ข้อมูล', action: 'privacy' },
  { icon: 15117, label: 'ตั้งค่า', sub: 'การแจ้งเตือน, ภาษา', action: 'settings' },
  { icon: 11715, label: 'ช่วยเหลือ', sub: 'คำถามที่พบบ่อย', action: 'help' },
] as const;

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { user: authUser, logout, updateUser } = useAuth();
  const { data: apiVehicles } = useVehicles();
  const updateProfileMutation = useUpdateProfile();
  const [mockUser, setMockUser] = useState<MockUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    displayName: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (!USE_LOCAL_DEV_FALLBACK) {
      return;
    }

    const unsubscribe = listenToUser(setMockUser);
    return unsubscribe;
  }, []);

  const user = useMemo(() => {
    if (HAS_API_BASE_URL && authUser) {
      return {
        displayName: authUser.displayName,
        avatarUrl: authUser.avatarUrl,
        points: authUser.totalPoints,
        totalWashes: authUser.totalWashes,
        memberSince: new Date(authUser.memberSince),
      } as MockUser;
    }

    return mockUser;
  }, [authUser, mockUser]);

  useEffect(() => {
    if (!showEditDialog) {
      return;
    }

    setFormValues({
      displayName: authUser?.displayName ?? user?.displayName ?? '',
      phone: authUser?.phone ?? defaultContact.phone,
      email: authUser?.email ?? defaultContact.email,
    });
    setEditError(null);
  }, [authUser?.displayName, authUser?.email, authUser?.phone, showEditDialog, user?.displayName]);

  const savedCars = useMemo(() => {
    if (HAS_API_BASE_URL && apiVehicles) {
      return apiVehicles.map((vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        brand: `${vehicle.brand} ${vehicle.model}`.trim(),
        size: vehicle.size,
      }));
    }

    return USE_LOCAL_DEV_FALLBACK ? mockSavedCars : [];
  }, [apiVehicles]);

  const currentTier = memberTiers.find((tier) => (user?.points || 0) >= tier.min && (user?.points || 0) < tier.max) || memberTiers[0];
  const nextTier = memberTiers[memberTiers.indexOf(currentTier) + 1];
  const contactPhone = authUser?.phone || defaultContact.phone;
  const contactEmail = authUser?.email || defaultContact.email;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  const handleFieldChange = (field: 'displayName' | 'phone' | 'email', value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleMenuAction = (action: (typeof profileMenuItems)[number]['action']) => {
    if (action === 'privacy') {
      navigate('/legal/privacy');
      return;
    }

    if (action === 'settings') {
      navigate('/settings');
      return;
    }

    navigate('/faq');
  };

  const handleSaveProfile = async () => {
    const displayName = formValues.displayName.trim();
    const phone = formValues.phone.trim();
    const email = formValues.email.trim();

    if (!displayName) {
      setEditError('กรุณากรอกชื่อที่แสดง');
      return;
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setEditError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    setEditError(null);

    try {
      if (HAS_API_BASE_URL) {
        const updatedUser = await updateProfileMutation.mutateAsync({
          displayName,
          phone: phone || null,
          email: email || null,
        });
        updateUser(updatedUser);
      } else {
        setMockUser((prev) => (prev ? { ...prev, displayName } : prev));
      }

      setShowEditDialog(false);
    } catch {
      setEditError('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">โปรไฟล์</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)} className="text-white">
          <I8Icon name="edit" size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 pt-4 pb-6 space-y-4">
          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-white/5">
              <div className="bg-gradient-to-br from-app-dark via-app-black to-app-dark p-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-18 h-18 border-2 border-white/10">
                      <AvatarImage src={user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100'} />
                      <AvatarFallback className="bg-black text-white text-lg">{user?.displayName?.[0] || 'W'}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                      <Ico id={currentTier.icon} size={14} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">{user?.displayName || 'User'}</h2>
                    <p className="text-gray-500 text-[11px]">
                      สมาชิกตั้งแต่ {user?.memberSince ? new Date(user.memberSince).toLocaleDateString('th-TH', { year: 'numeric', month: 'short' }) : '-'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/80 gap-1">
                        <Ico id={12566} size={10} />
                        {currentTier.name}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/80 gap-1">
                        <Ico id={47269} size={10} />
                        Member
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-4 pb-5 border-white/5">
              <div className="flex items-center gap-3 mb-5">
                <IconBox id={12566} size={14} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">ระดับสมาชิก</p>
                  {nextTier && (
                    <p className="text-gray-500 text-[11px] truncate">อีก {formatPoints(nextTier.min - (user?.points || 0))} คะแนน ไป {nextTier.name}</p>
                  )}
                </div>
              </div>

              {(() => {
                const currentIdx = memberTiers.indexOf(currentTier);
                const badgeH = 24;
                const fireSize = 64;
                const topOffset = (fireSize - badgeH) / 2;

                return (
                  <div className="relative" style={{ paddingTop: topOffset, paddingBottom: 20 }}>
                    <div className="absolute z-0 left-[30px] right-[30px]" style={{ top: topOffset + badgeH / 2 - 1 }}>
                      <div className="h-[2px] bg-white/10 rounded-full" />
                      <div
                        className="h-[2px] bg-white/50 rounded-full transition-all duration-500"
                        style={{
                          width: `${(currentIdx / (memberTiers.length - 1)) * 100}%`,
                          marginTop: -2,
                        }}
                      />
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                      {memberTiers.map((tier, index) => {
                        const isActive = index === currentIdx;
                        const isPast = index < currentIdx;

                        return (
                          <div key={tier.name} className="flex flex-col items-center" style={{ width: 60 }}>
                            <div className="relative flex items-center justify-center" style={{ height: badgeH }}>
                              {isActive && (
                                <div
                                  className="absolute pointer-events-none"
                                  style={{
                                    width: fireSize,
                                    height: fireSize,
                                    bottom: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                  }}
                                >
                                  <Lottie animationData={fireAnimation} loop autoplay className="w-full h-full" />
                                </div>
                              )}

                              <div
                                className={`relative z-20 px-2 py-0.5 rounded-full border ${
                                  isActive
                                    ? 'bg-black border-orange-400/60 shadow-[0_0_12px_rgba(251,146,60,0.35)]'
                                    : isPast
                                      ? 'bg-[#1f1f1f] border-white/25'
                                      : 'bg-[#161616] border-white/10'
                                }`}
                              >
                                <span
                                  className={`text-[9px] font-bold whitespace-nowrap ${
                                    isActive ? 'text-orange-300' : isPast ? 'text-white/70' : 'text-white/20'
                                  }`}
                                >
                                  {tier.name}
                                </span>
                              </div>
                            </div>

                            <span className={`text-[9px] mt-1.5 ${
                              isActive ? 'text-orange-300/70 font-bold' : isPast ? 'text-white/30' : 'text-white/15'
                            }`}>
                              {isActive ? 'ปัจจุบัน' : index === 0 ? 'เริ่มต้น' : `${(tier.min / 1000).toFixed(0)}k pt`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
            {[
              { icon: 25107, label: 'ล้างรถ', value: String(user?.totalWashes || 0), sub: 'ครั้ง' },
              { icon: 104, label: 'คะแนน', value: user ? formatPoints(user.points) : '0', sub: 'พอยท์' },
              { icon: 12666, label: 'รถบันทึก', value: String(savedCars.length), sub: 'คัน' },
            ].map((stat, index) => (
              <Card key={index} className="p-3 border-white/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Ico id={stat.icon} size={10} />
                  </div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-gray-500">{stat.sub}</p>
              </Card>
            ))}
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-4 border-white/5 space-y-0">
              <div className="flex items-center gap-3 mb-3">
                <IconBox id={7345} size={14} />
                <h3 className="text-white font-bold text-sm">ข้อมูลติดต่อ</h3>
              </div>
              <Separator className="bg-white/5 mb-3" />
              <div className="space-y-3">
                {[
                  { icon: 687, label: 'เบอร์โทร', value: contactPhone },
                  { icon: 12549, label: 'อีเมล', value: contactEmail },
                  { icon: 3471, label: 'LINE ID', value: authUser?.lineUserId || `@${(user?.displayName || 'user').replace(/\s+/g, '').toLowerCase()}` },
                ].map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setShowEditDialog(true)}
                    className="w-full flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/5 text-left"
                  >
                    <IconBox id={item.icon} size={13} boxSize="w-9 h-9" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm text-white font-medium truncate">{item.value}</p>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Ico id={49} size={12} className="opacity-40" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-4 border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconBox id={12666} size={14} />
                  <h3 className="text-white font-bold text-sm">รถที่บันทึกไว้</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/add-vehicle')} className="text-white/60 text-xs h-7 gap-1.5 hover:text-white">
                  <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">+</span>
                  </div>
                  เพิ่มรถ
                </Button>
              </div>
              <Separator className="bg-white/5 mb-3" />
              <div className="space-y-2.5">
                {savedCars.map((car) => (
                  <div key={car.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/5">
                    <IconBox id={car.size === 'L' ? 16551 : car.size === 'M' ? 12666 : 16553} size={16} boxSize="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{car.brand}</p>
                      <p className="text-gray-500 text-[11px]">{car.plate}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">ไซส์ {car.size}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-0 overflow-hidden border-white/5">
              {profileMenuItems.map((item, index, arr) => (
                <button
                  key={item.action}
                  type="button"
                  onClick={() => handleMenuAction(item.action)}
                  className="relative w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] active:bg-white/5 transition-colors text-left"
                >
                  <IconBox id={item.icon} size={14} boxSize="w-9 h-9" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-gray-600 text-[10px]">{item.sub}</p>
                  </div>
                  <I8Icon name="back" size={14} className="opacity-20 rotate-180" />
                  {index < arr.length - 1 && <Separator className="absolute bottom-0 left-16 right-4 bg-white/5" />}
                </button>
              ))}
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => void logout()}
              className="w-full justify-center gap-2.5 h-12 border-white/10 text-white/50 hover:text-white hover:bg-white/5"
            >
              <div className="w-7 h-7 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                <Ico id={12555} size={14} />
              </div>
              ออกจากระบบ
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูล</DialogTitle>
            <DialogDescription>อัปเดตข้อมูลส่วนตัวของคุณ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'displayName' as const, icon: 7345, label: 'ชื่อที่แสดง', type: 'text' },
              { key: 'phone' as const, icon: 687, label: 'เบอร์โทร', type: 'tel' },
              { key: 'email' as const, icon: 12549, label: 'อีเมล', type: 'email' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-black border border-white/10 flex items-center justify-center">
                    <Ico id={field.icon} size={10} />
                  </div>
                  {field.label}
                </label>
                <Input
                  value={formValues[field.key]}
                  type={field.type}
                  onChange={(event) => handleFieldChange(field.key, event.target.value)}
                />
              </div>
            ))}
            {editError && <p className="text-xs text-red-400">{editError}</p>}
          </div>
          <DialogFooter className="flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">ยกเลิก</Button>
            </DialogClose>
            <Button className="flex-1" onClick={() => void handleSaveProfile()} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
