import React from 'react';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

function CatIcon({ id, size = 22 }: { id: string | number; size?: number }) {
  return (
    <img
      src={`${ICONS8_BASE}${size * 2}&id=${id}`}
      width={size} height={size} alt=""
      className="inline-block flex-shrink-0"
      style={{ filter: 'invert(1) brightness(1.1)' }}
      loading="lazy"
    />
  );
}

const categories: { label: string; nav: string; iconId: string | number; accent?: boolean }[] = [
  { label: 'ล้างรถ\nอัตโนมัติ', nav: 'carwash', iconId: 25107, accent: true },
  { label: 'โปรโมชั่น', nav: 'promotion', iconId: 491 },
  { label: 'คูปอง\nส่วนลด', nav: 'coupon', iconId: 12394 },
  { label: 'สาขา\nใกล้คุณ', nav: 'branches', iconId: 345 },
  { label: 'บัตรสมาชิก', nav: 'member', iconId: 47269 },
  { label: 'ช่วยเหลือ', nav: 'faq', iconId: 646 },
  { label: 'ตั้งค่า', nav: 'settings', iconId: 53375 },
];

export function CategoryGrid({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
  onNavigateCoupon?: () => void;
  onNavigateBranches?: () => void;
  onNavigateMember?: () => void;
  onNavigatePromotion?: () => void;
  onNavigateArticle?: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(cat.nav)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
              cat.accent
                ? 'bg-app-red/15 border border-app-red/25 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
                : 'bg-black border border-white/10'
            }`}>
              <CatIcon id={cat.iconId} size={cat.accent ? 24 : 22} />
            </div>
            <span className="text-[10px] text-center text-white/50 font-medium leading-tight min-h-[24px] flex items-start justify-center whitespace-pre-line group-hover:text-white/80 transition-colors">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
