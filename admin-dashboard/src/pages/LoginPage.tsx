import React, { useState } from 'react';
import { Droplets, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '@/services/api';

interface LoginPageProps {
  onLogin: () => void | Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('admin@roboss.co.th');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.login(email, password);
      await onLogin();
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเข้าสู่ระบบได้');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(153,27,27,0.18),transparent_28%),linear-gradient(180deg,#050505_0%,#140808_100%)]">
      <div className="pointer-events-none absolute left-[15%] top-[10%] h-[420px] w-[420px] rounded-full bg-red-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-5%] right-[10%] h-[480px] w-[480px] rounded-full bg-red-700/10 blur-[140px]" />

      <div className="relative mx-4 grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-10 lg:block">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
              <Droplets className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">ROBOSS หลังบ้าน</h1>
              <p className="text-sm text-gray-400">ศูนย์ควบคุมสาขา ผู้ดูแลระบบ และนโยบายการปฏิบัติการทั้งหมด</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['ภาพรวมระบบ', 'ติดตามรายการใช้งาน รายได้ สุขภาพเครื่อง และการเติบโตของทุกสาขาในจุดเดียว'],
              ['ควบคุมสาขา', 'สร้าง แก้ไข เปิดใช้งาน และปรับตั้งค่าการปฏิบัติการของแต่ละสาขาได้จริง'],
              ['สิทธิ์ผู้ดูแล', 'จัดการผู้ดูแล HQ และสาขาพร้อมกำหนดสิทธิ์ตามขอบเขตการเข้าถึง'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-white/5 bg-black/20 p-5">
                <ShieldCheck className="mb-4 h-5 w-5 text-red-300" />
                <h2 className="font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="gradient-card rounded-[28px] p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
                <Droplets className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">เข้าสู่ระบบหลังบ้าน</h2>
              <p className="mt-2 text-sm text-gray-400">ใช้บัญชีผู้ดูแล HQ หรือผู้ดูแลสาขาเพื่อเข้าสู่ระบบ</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">อีเมล</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 transition-all focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/20"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-red-600 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:from-red-600 hover:to-red-700 disabled:opacity-60"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบหลังบ้าน'}
              </button>
            </form>

            <div className="mt-6 grid gap-2 rounded-2xl border border-white/5 bg-black/20 p-4 text-[11px] text-gray-500">
              <p>เดโม HQ: `admin@roboss.co.th` / `admin123`</p>
              <p>เดโมสาขา: `rama.manager@roboss.co.th` / `manager123`</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
