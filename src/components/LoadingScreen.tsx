import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../loading.json';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-app-black flex flex-col items-center justify-center z-[100]">
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        className="w-56 h-56"
      />
      <img
        src="/Roboss_logo.png"
        alt="ROBOSS"
        className="h-16 w-auto object-contain mt-4 opacity-90"
      />
      <p className="text-gray-400 text-xs mt-3 tracking-widest animate-pulse">
        กำลังโหลด...
      </p>
    </div>
  );
}
