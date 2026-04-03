import React from 'react';

export function HeroBanner() {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="relative rounded-2xl overflow-hidden bg-black border border-white/5">
        <img
          src="/freepik_assistant_1774454922406.png"
          alt="ROBOSS ล้างรถยนต์อัตโนมัติ"
          className="w-full h-auto object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
    </div>
  );
}
