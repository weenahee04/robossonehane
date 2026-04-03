import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranch } from '../services/branchContext';
import { getPromotionsForBranch } from '../services/branchOffers';
import { usePromotions as useApiPromotions } from '@/hooks/useApi';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getIconUrl, type IconName } from '../services/icons';
import { setWashFlowIntent } from '@/services/washFlowIntent';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}
interface PromotionPageProps {
  onBack: () => void;
}
interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  discountBadge: string;
  validUntil: string;
  conditions: string[];
  gradient: string;
  patternOpacity: number;
  image?: string;
}
export function PromotionPage({ onBack }: PromotionPageProps) {
  const navigate = useNavigate();
  const { branch } = useBranch();
  const { data: apiPromotions } = useApiPromotions(branch.id);

  const promotions: Promotion[] = useMemo(() => {
    if (HAS_API_BASE_URL && apiPromotions) {
      return apiPromotions.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: '',
        description: p.description || '',
        discountBadge: '',
        validUntil: new Date(p.validUntil).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
        conditions: p.conditions ? p.conditions.split('\n').filter(Boolean) : [],
        gradient: p.gradient || 'from-app-red via-red-600 to-app-red-dark',
        patternOpacity: 0.08,
        image: p.image,
      }));
    }
    if (USE_LOCAL_DEV_FALLBACK) {
      return getPromotionsForBranch(branch.id);
    }

    return [];
  }, [apiPromotions, branch.id]);

  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  const handleUsePromotion = (promotion: Promotion) => {
    setWashFlowIntent({
      source: 'promotion',
      branchId: branch.id,
      branchName: branch.name,
      branchType: branch.type,
      promotion: {
        id: promotion.id,
        title: promotion.title,
        branchIds: [branch.id],
      },
    });
    setSelectedPromo(null);
    navigate('/carwash');
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-app-black/95 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <div className="flex flex-col items-center min-w-0 flex-1 mx-2">
          <h1 className="text-white font-bold text-lg leading-tight">โปรโมชั่น</h1>
          <p className="text-white/25 text-[9px] truncate w-full text-center mt-0.5">{branch.shortName} · โปรตามแฟรนไชส์สาขา · พ้อยท์รวมทุกสาขา</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Banner List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-4 pb-10">
        {promotions.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">ยังไม่มีโปรโมชั่นสำหรับสาขานี้</div>
        )}
        {promotions.map((promo, index) =>
        <motion.button
          key={promo.id}
          initial={{
            opacity: 0,
            y: 30
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: index * 0.07,
            duration: 0.4,
            type: 'spring',
            stiffness: 250,
            damping: 22
          }}
          onClick={() => setSelectedPromo(promo)}
          className="w-full relative rounded-2xl overflow-hidden shadow-lg text-left active:scale-[0.98] transition-transform">
          
            {promo.image ?
          <>
                <img
              src={promo.image}
              alt={promo.title}
              className="w-full h-auto object-cover"
              draggable={false} />
            
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-end">
                  <span className="text-white/90 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                    ดูรายละเอียด
                  </span>
                </div>
              </> :

          <>
                {/* Gradient Background */}
                <div
              className={`absolute inset-0 bg-gradient-to-br ${promo.gradient}`}>
            </div>

                {/* Dot Pattern */}
                <div
              className="absolute inset-0"
              style={{
                opacity: promo.patternOpacity,
                backgroundImage:
                'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}>
            </div>

                {/* Decorative Circle */}
                <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-md"></div>
                <div className="absolute -right-4 bottom-0 w-24 h-24 bg-black/10 rounded-full blur-lg"></div>

                {/* Content */}
                <div className="relative z-10 p-5 min-h-[140px] flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white/80 text-[11px] font-medium mb-1.5">
                        {promo.subtitle}
                      </p>
                      <h3 className="text-2xl font-black text-white leading-tight whitespace-pre-line">
                        {promo.title}
                      </h3>
                    </div>
                    <span className="bg-white text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg shrink-0 ml-3">
                      {promo.discountBadge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-white/70 text-[11px]">
                      ถึง {promo.validUntil}
                    </p>
                    <span className="text-white/90 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                      ดูรายละเอียด
                    </span>
                  </div>
                </div>
              </>
          }
          </motion.button>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPromo &&
        <motion.div
          initial={{
            opacity: 0
          }}
          animate={{
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          transition={{
            duration: 0.2
          }}
          className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPromo(null)}>
          
            <motion.div
            initial={{
              y: '100%'
            }}
            animate={{
              y: 0
            }}
            exit={{
              y: '100%'
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            className="absolute bottom-0 left-0 right-0 bg-app-black rounded-t-3xl border-t border-white/10 max-h-[85%] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
              </div>

              {/* Modal Header Banner */}
              <div className={`mx-4 mt-2 rounded-2xl overflow-hidden relative`}>
                {selectedPromo.image ?
              <img
                src={selectedPromo.image}
                alt={selectedPromo.title}
                className="w-full h-auto object-cover" /> :


              <>
                    <div
                  className={`absolute inset-0 bg-gradient-to-br ${selectedPromo.gradient}`}>
                </div>
                    <div
                  className="absolute inset-0"
                  style={{
                    opacity: selectedPromo.patternOpacity,
                    backgroundImage:
                    'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '16px 16px'
                  }}>
                </div>
                    <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-md"></div>
                    <div className="relative z-10 p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white/80 text-[11px] font-medium mb-1">
                            {selectedPromo.subtitle}
                          </p>
                          <h3 className="text-2xl font-black text-white leading-tight whitespace-pre-line">
                            {selectedPromo.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </>
              }
                <Button variant="ghost" size="icon"
                  onClick={() => setSelectedPromo(null)}
                  className="absolute top-3 right-3 z-20 w-8 h-8 bg-black/30 backdrop-blur-sm">
                  <I8Icon name="back" size={14} />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 space-y-5">
                {/* Discount Badge */}
                <div className="flex items-center gap-3">
                  <span
                  className={`bg-gradient-to-br ${selectedPromo.gradient} text-white text-lg font-black px-4 py-2 rounded-xl shadow-lg`}>
                  
                    {selectedPromo.discountBadge}
                  </span>
                  <div>
                    <p className="text-white font-bold text-sm">ส่วนลดพิเศษ</p>
                    <p className="text-gray-400 text-xs">
                      ถึง {selectedPromo.validUntil}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-app-dark rounded-xl p-4 border border-white/5">
                  <h4 className="text-white font-bold text-sm mb-2">
                    รายละเอียด
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedPromo.description}
                  </p>
                </div>

                {/* Conditions */}
                <div className="bg-app-dark rounded-xl p-4 border border-white/5">
                  <h4 className="text-white font-bold text-sm mb-3">
                    เงื่อนไขการใช้งาน
                  </h4>
                  <div className="space-y-2.5">
                    {selectedPromo.conditions.map((condition, idx) =>
                  <div key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-gray-300 text-sm">{condition}</p>
                      </div>
                  )}
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="p-4 border-t border-white/5">
                <Button className="w-full py-4 text-base" size="lg" onClick={() => handleUsePromotion(selectedPromo)}>
                  ใช้โปรโมชั่น
                </Button>
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}
