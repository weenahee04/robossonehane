import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const USE_BACKEND_AUTH = Boolean(import.meta.env.VITE_API_URL);
const USE_CLERK_AUTH = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function CustomerAuthGate() {
  const navigate = useNavigate();
  const { isLoading, error, config, beginLineLogin, loginDev, clearAuthError } = useAuth();

  if (!USE_BACKEND_AUTH) {
    return null;
  }

  return (
    <div className="app-shell">
      <div className="app-container safe-top bg-app-black flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#101010] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="mb-6 flex justify-center">
            <img src="/Roboss_logo.png" alt="ROBOSS" className="h-12 w-auto object-contain" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-lg font-bold text-white">เข้าสู่ระบบเพื่อใช้งานพอร์ทัลลูกค้า</h1>
            <p className="text-sm text-white/45">
              เข้าดูคูปอง แต้มสะสม รถของคุณ และประวัติการล้างจากบัญชีเดียวกันได้ที่นี่
            </p>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <div>{error}</div>
              <button
                type="button"
                onClick={clearAuthError}
                className="mt-2 text-xs text-red-100/70 underline underline-offset-4"
              >
                ปิดข้อความ
              </button>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={() => {
                if (USE_CLERK_AUTH) {
                  navigate('/sign-in');
                  return;
                }
                void beginLineLogin();
              }}
              disabled={isLoading || !(config.clerkEnabled || config.lineLoginEnabled)}
              className="h-12 w-full rounded-2xl bg-[#06C755] text-base font-semibold text-black hover:bg-[#05b84e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบด้วย LINE'}
            </Button>

            {config.devLoginEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void loginDev()}
                disabled={isLoading}
                className="h-12 w-full rounded-2xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
              >
                ใช้ Dev Login
              </Button>
            ) : null}
          </div>

          <p className="mt-4 text-center text-xs text-white/30">
            หากเข้าสู่ระบบไม่สำเร็จ ให้ตรวจสอบการตั้งค่า LINE Login, Clerk และ backend ก่อน
          </p>
        </div>
      </div>
    </div>
  );
}
