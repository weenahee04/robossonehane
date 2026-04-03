import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useVehicles } from '@/hooks/useApi';

function sanitizePhone(value: string) {
  return value.replace(/[^\d+-\s]/g, '').trim();
}

export function ProfileCompletionPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const vehiclesQuery = useVehicles(true);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setPhone(user?.phone ?? '');
    setEmail(user?.email ?? '');
  }, [user?.displayName, user?.email, user?.phone]);

  const hasPhone = Boolean(user?.phone?.trim());
  const hasVehicle = (vehiclesQuery.data?.length ?? 0) > 0;
  const needsPhone = !hasPhone;
  const needsVehicle = !vehiclesQuery.isLoading && !hasVehicle;

  useEffect(() => {
    if (!needsPhone && !needsVehicle) {
      navigate('/', { replace: true });
    }
  }, [navigate, needsPhone, needsVehicle]);

  const lineIdentity = useMemo(() => user?.lineUserId || 'เชื่อมต่อผ่าน LINE แล้ว', [user?.lineUserId]);

  const saveProfile = async () => {
    const nextDisplayName = displayName.trim();
    const nextPhone = sanitizePhone(phone);
    const nextEmail = email.trim();

    if (!nextDisplayName) {
      setError('กรุณากรอกชื่อที่ใช้แสดง');
      return false;
    }

    if (!nextPhone) {
      setError('กรุณากรอกเบอร์โทรเพื่อใช้รับข้อมูลการให้บริการ');
      return false;
    }

    if (nextEmail && !/\S+@\S+\.\S+/.test(nextEmail)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return false;
    }

    setError(null);

    const updatedUser = await updateProfileMutation.mutateAsync({
      displayName: nextDisplayName,
      phone: nextPhone,
      email: nextEmail || null,
    });
    updateUser(updatedUser);
    return true;
  };

  const handleContinue = async () => {
    if (needsPhone) {
      const saved = await saveProfile();
      if (!saved) {
        return;
      }
    }

    if (needsVehicle) {
      navigate('/add-vehicle', { state: { from: '/complete-profile' } });
      return;
    }

    navigate('/', { replace: true });
  };

  const stepSummary = [
    needsPhone ? 'เพิ่มเบอร์โทร' : null,
    needsVehicle ? 'เพิ่มรถคันแรก' : null,
  ].filter(Boolean);

  return (
    <div className="app-shell">
      <div className="app-container safe-top bg-app-black min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
          <Card className="w-full border-white/10 bg-[#101010] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-5 flex justify-center">
              <img src="/Roboss_logo.png" alt="ROBOSS" className="h-10 w-auto object-contain" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">ยืนยันข้อมูลก่อนเริ่มใช้งาน</h1>
              <p className="mt-2 text-sm text-white/55">
                ล็อกอินด้วย LINE สำเร็จแล้ว เหลือเติมข้อมูลที่จำเป็นอีกเล็กน้อยเพื่อใช้งานพอร์ทัลลูกค้า
              </p>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {stepSummary.map((step) => (
                <Badge key={step} variant="outline" className="border-app-red/30 bg-app-red/10 text-app-red">
                  {step}
                </Badge>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">ข้อมูลจากการล็อกอิน</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-xs text-white/40">LINE ID</p>
                    <p className="truncate text-sm font-semibold text-white">{lineIdentity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">ชื่อที่ใช้แสดง</p>
                    <Input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="ชื่อของคุณ"
                      className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">เบอร์โทร</p>
                    <Input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="กรอกเบอร์โทร"
                      className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-white/40">อีเมล</p>
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="กรอกอีเมล (ถ้ามี)"
                      className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-white/25"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">สถานะบัญชี</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">เบอร์โทรพร้อมใช้งาน</span>
                    <span className={hasPhone ? 'text-emerald-400' : 'text-amber-300'}>
                      {hasPhone ? 'พร้อม' : 'ยังไม่ครบ'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">รถคันแรก</span>
                    <span className={hasVehicle ? 'text-emerald-400' : 'text-amber-300'}>
                      {hasVehicle ? 'พร้อม' : 'ยังไม่ได้เพิ่ม'}
                    </span>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <Button
                onClick={() => void handleContinue()}
                disabled={updateProfileMutation.isPending || vehiclesQuery.isLoading}
                className="h-12 w-full bg-app-red text-white hover:bg-app-red/90"
              >
                {updateProfileMutation.isPending
                  ? 'กำลังบันทึกข้อมูล...'
                  : needsVehicle
                    ? 'บันทึกและเพิ่มรถคันแรก'
                    : 'เริ่มใช้งานพอร์ทัล'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
