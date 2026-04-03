import React, { useState, useRef, useEffect } from 'react';

const promos = [
  { img: '/freepik_0001.png', nav: 'promotion' },
  { img: '/freepik_0001_(1).png', nav: 'coupon' },
  { img: '/freepik_0001_(2).png', nav: 'promotion' },
];

export function PromoBanners({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % promos.length;
        scrollRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    const idx = Math.round(scrollLeft / width);
    setActive(idx);
  };

  return (
    <div className="py-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {promos.map((p, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(p.nav)}
            className="snap-center shrink-0 w-full px-4"
          >
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/5 bg-black" style={{ aspectRatio: '16/7' }}>
              <img
                src={p.img}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </button>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-2">
        {promos.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${i === active ? 'w-5 h-1.5 bg-app-red' : 'w-1.5 h-1.5 bg-white/15'}`}
          />
        ))}
      </div>
    </div>
  );
}
