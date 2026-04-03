import React from 'react';
import { Card } from '@/components/ui/card';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

const services = [
  {
    id: 1,
    name: 'ล้างรถภายนอก',
    price: '99',
    iconId: 25107,
    img: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=200&h=200',
  },
  {
    id: 2,
    name: 'ล้าง + ดูดฝุ่น',
    price: '199',
    iconId: 71290,
    img: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=200&h=200',
  },
  {
    id: 3,
    name: 'เคลือบแก้ว',
    price: '599',
    iconId: 38532,
    img: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=200&h=200',
  },
  {
    id: 4,
    name: 'แพ็กเกจ VIP',
    price: '999',
    iconId: 6478,
    img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=200&h=200',
  },
];

export function ProductCategories() {
  return (
    <div className="py-2">
      <div className="px-4 mb-3 flex items-center gap-2">
        <div className="w-1 h-4 bg-app-red rounded-full" />
        <h2 className="text-sm font-bold text-white">บริการของเรา</h2>
      </div>

      <div className="flex overflow-x-auto gap-2.5 px-4 pb-4 snap-x no-scrollbar">
        {services.map((service) => (
          <div key={service.id} className="snap-start shrink-0 w-[130px] group cursor-pointer">
            <Card className="w-full overflow-hidden border-white/5 p-0 group-hover:border-white/15 transition-all">
              <div className="relative h-24 overflow-hidden">
                <img
                  src={service.img}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                  <span className="text-[10px] text-white font-medium leading-tight">{service.name}</span>
                </div>
              </div>
              <div className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                    <img src={`${ICONS8_BASE}20&id=${service.iconId}`} width={10} height={10} alt="" style={{ filter: 'invert(1) brightness(1.1)' }} />
                  </div>
                  <span className="text-white font-black text-xs">{service.price}</span>
                  <span className="text-white/25 text-[9px]">฿</span>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
