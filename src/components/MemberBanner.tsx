import React from 'react';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

export function MemberBanner() {
  return (
    <div className="px-4 py-2">
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-black">
        {/* Subtle red glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-app-red/8 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-app-red/5 rounded-full -ml-12 -mb-12 blur-2xl" />

        <div className="relative z-10 p-4 flex items-center gap-4">
          {/* Left — icon + text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-app-red/15 border border-app-red/20 flex items-center justify-center flex-shrink-0">
                <img src={`${ICONS8_BASE}28&id=47269`} width={14} height={14} alt="" style={{ filter: 'invert(1) brightness(1.1)' }} />
              </div>
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">สมัครสมาชิก</span>
            </div>
            <h3 className="text-lg font-black text-white leading-none mb-1">NEW MEMBER</h3>
            <p className="text-[10px] text-white/30">ล้างรถสะอาด ราคาคุ้มค่า</p>
          </div>

          {/* Right — discount */}
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="px-2.5 py-0.5 rounded-full bg-app-red/15 border border-app-red/25 mb-1.5">
              <span className="text-[9px] font-bold text-app-red">รับส่วนลดทันที</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-4xl font-black text-white leading-none">50</span>
              <span className="text-base font-bold text-white/50 ml-0.5">%</span>
            </div>
            <p className="text-[8px] text-white/20 mt-1 text-right max-w-[100px]">สำหรับการล้างรถครั้งแรก</p>
          </div>
        </div>
      </div>
    </div>
  );
}
