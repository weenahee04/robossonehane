import { useEffect, useRef } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';

function ClerkScreenState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="app-shell">
      <div className="app-container safe-top bg-app-black flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#101010] p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="mb-4 flex justify-center">
            <img src="/Roboss_logo.png" alt="ROBOSS" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-lg font-bold text-white">{title}</h1>
          <p className="mt-2 text-sm text-white/50">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ClerkSignUpPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      window.location.replace('/');
      return;
    }

    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void clerk.redirectToSignUp({
      signInForceRedirectUrl: '/',
      signInFallbackRedirectUrl: '/',
      signUpForceRedirectUrl: '/',
      signUpFallbackRedirectUrl: '/',
    });
  }, [clerk, isLoaded, isSignedIn]);

  return (
    <ClerkScreenState
      title="กำลังเปิดหน้าสมัครสมาชิก"
      description="ระบบกำลังพาไปยังหน้าสมัครสมาชิกของ ROBOSS ผ่าน Clerk"
    />
  );
}
