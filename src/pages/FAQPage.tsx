import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getIconUrl, type IconName } from '../services/icons';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return <img src={`${ICONS8_BASE}${size * 2}&id=${id}`} width={size} height={size} alt="" className={`inline-block flex-shrink-0 ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} loading="lazy" />;
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

const faqCategories = [
  {
    id: 'usage',
    title: 'การใช้งาน',
    iconId: 25107,
    count: 4,
    questions: [
      { q: 'ใช้บริการล้างรถอัตโนมัติอย่างไร?', a: 'สแกน QR Code ที่ตู้ล้างรถ → เลือกแพ็กเกจ → ชำระเงินผ่าน PromptPay → รอรถเข้าตู้ล้าง → เสร็จสิ้น' },
      { q: 'รถขนาดไหนที่ล้างได้?', a: 'รองรับรถ 3 ขนาด: S (เก๋ง), M (กลาง/SUV ขนาดเล็ก), L (SUV/กระบะ) ราคาแตกต่างกันตามขนาดรถ' },
      { q: 'ใช้เวลาล้างรถนานเท่าไหร่?', a: 'QUICK & CLEAN ใช้เวลาประมาณ 8-10 นาที, SHINE MODE ประมาณ 12-15 นาที, SPECIAL MODE ประมาณ 15-20 นาที' },
      { q: 'ล้างรถมอเตอร์ไซค์ได้ไหม?', a: 'บางสาขามีตู้ล้างมอเตอร์ไซค์ ตรวจสอบได้ที่หน้า "สาขาใกล้คุณ"' },
    ],
  },
  {
    id: 'payment',
    title: 'การชำระเงิน',
    iconId: 12394,
    count: 3,
    questions: [
      { q: 'รับชำระเงินช่องทางไหนบ้าง?', a: 'รับชำระผ่าน PromptPay QR Code และคูปองส่วนลด สามารถใช้คะแนนสะสมหักค่าบริการได้' },
      { q: 'ถ้าจ่ายเงินแล้วแต่เครื่องไม่ทำงาน?', a: 'กรุณาติดต่อสายด่วน 02-xxx-xxxx หรือแจ้งปัญหาผ่าน "แจ้งปัญหา" ในแอป ทีมงานจะคืนเงินภายใน 24 ชม.' },
      { q: 'ดูใบเสร็จย้อนหลังได้ไหม?', a: 'ได้ ไปที่ "ประวัติการล้างรถ" จะเห็นรายละเอียดทุกรายการ' },
    ],
  },
  {
    id: 'member',
    title: 'สมาชิก & คะแนน',
    iconId: 6703,
    count: 4,
    questions: [
      { q: 'สมัครสมาชิกยังไง?', a: 'เพิ่มเพื่อน LINE Official @ROBOSS แล้วกดเข้าแอปครั้งแรก ระบบจะสร้างสมาชิกให้อัตโนมัติ' },
      { q: 'คะแนนสะสมคิดยังไง?', a: 'ทุก 1 บาท ได้ 10 คะแนน เช่น ล้างรถ 109 บาท ได้ 1,090 คะแนน' },
      { q: 'คะแนนหมดอายุไหม?', a: 'คะแนนมีอายุ 1 ปี นับจากวันที่ได้รับ ระบบจะแจ้งเตือนก่อนหมดอายุ 30 วัน' },
      { q: 'ระดับสมาชิกมีอะไรบ้าง?', a: 'Bronze (0-5,000), Silver (5,001-15,000), Gold (15,001-50,000), Platinum (50,001+) ยิ่งระดับสูงยิ่งได้สิทธิพิเศษมาก' },
    ],
  },
  {
    id: 'service',
    title: 'บริการ & สาขา',
    iconId: 345,
    count: 3,
    questions: [
      { q: 'มีกี่สาขา?', a: 'ปัจจุบันมี 22 สาขาทั่วประเทศ ครอบคลุมกรุงเทพฯ ปริมณฑล และหัวเมืองใหญ่' },
      { q: 'เปิดให้บริการกี่โมง?', a: 'เปิดบริการ 24 ชั่วโมง ทุกสาขา (ยกเว้นกรณีซ่อมบำรุง)' },
      { q: 'QUICK & CLEAN กับ SHINE MODE ต่างกันยังไง?', a: 'QUICK & CLEAN เป็นการล้างพื้นฐาน 4 ขั้นตอน ส่วน SHINE MODE เพิ่มเคลือบเงาให้รถดูใหม่' },
    ],
  },
];

export function FAQPage({ onBack, onNavigateFeedback }: { onBack: () => void; onNavigateFeedback?: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openQ, setOpenQ] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const activeCat = faqCategories.find(c => c.id === activeCategory);

  const allQuestions = faqCategories.flatMap(cat =>
    cat.questions.map(q => ({ ...q, catId: cat.id, catTitle: cat.title, catIconId: cat.iconId }))
  );
  const filtered = searchText.trim()
    ? allQuestions.filter(q => q.q.includes(searchText) || q.a.includes(searchText))
    : [];

  const totalQ = faqCategories.reduce((sum, c) => sum + c.questions.length, 0);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={activeCategory ? () => { setActiveCategory(null); setOpenQ(null); } : onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">
          {activeCategory ? activeCat?.title : 'คำถามที่พบบ่อย'}
        </h1>
        <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">{totalQ} คำถาม</Badge>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 pt-4 pb-6 space-y-3">

          {/* Search */}
          {!activeCategory && (
            <motion.div variants={itemVariants}>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Ico id={7695} size={14} className="opacity-30" />
                </div>
                <input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="ค้นหาคำถาม..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-app-red/30 transition-colors"
                />
                {searchText && (
                  <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Ico id={8372} size={12} className="opacity-30" />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Search Results */}
          {searchText.trim() && !activeCategory && (
            <>
              <motion.div variants={itemVariants}>
                <p className="text-white/30 text-[11px] px-1">พบ {filtered.length} ผลลัพธ์</p>
              </motion.div>
              {filtered.length > 0 ? filtered.map((fq, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Card
                    className="p-0 overflow-hidden border-white/5 cursor-pointer"
                    onClick={() => setOpenQ(openQ === `s-${i}` ? null : `s-${i}`)}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-lg bg-app-red/10 border border-app-red/15 flex items-center justify-center flex-shrink-0">
                        <Ico id={fq.catIconId} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[12px] font-medium leading-snug">{fq.q}</p>
                        <p className="text-white/20 text-[10px] mt-0.5">{fq.catTitle}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-white/20 transition-transform duration-200 flex-shrink-0 ${openQ === `s-${i}` ? 'rotate-180' : ''}`}>
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                    <AnimatePresence>
                      {openQ === `s-${i}` && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <div className="px-3 pb-3 pt-0">
                            <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
                              <p className="text-white/50 text-[12px] leading-relaxed">{fq.a}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              )) : (
                <motion.div variants={itemVariants}>
                  <div className="text-center py-8">
                    <Ico id={7695} size={28} className="opacity-10 mx-auto mb-2" />
                    <p className="text-white/20 text-xs">ไม่พบคำถามที่ค้นหา</p>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Category List */}
          {!activeCategory && !searchText.trim() && (
            <>
              {/* Quick Stats */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                    <p className="text-white font-bold text-lg">{faqCategories.length}</p>
                    <p className="text-white/20 text-[10px]">หมวดหมู่</p>
                  </div>
                  <div className="bg-app-red/5 rounded-xl p-3 border border-app-red/10">
                    <p className="text-app-red font-bold text-lg">{totalQ}</p>
                    <p className="text-white/20 text-[10px]">คำถามทั้งหมด</p>
                  </div>
                </div>
              </motion.div>

              {/* Categories */}
              {faqCategories.map((cat, idx) => (
                <motion.div key={cat.id} variants={itemVariants}>
                  <Card
                    className="p-0 overflow-hidden border-white/5 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Ico id={cat.iconId} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold">{cat.title}</p>
                        <p className="text-white/20 text-[10px] mt-0.5">{cat.questions.length} คำถาม</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/15 flex-shrink-0">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                    {/* Preview first question */}
                    <div className="px-3.5 pb-3 -mt-1">
                      <div className="bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.03]">
                        <p className="text-white/30 text-[11px] truncate">{cat.questions[0].q}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </>
          )}

          {/* Category Detail - Questions List */}
          {activeCategory && activeCat && (
            <>
              {/* Category header info */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-app-red/10 border border-app-red/15 flex items-center justify-center">
                    <Ico id={activeCat.iconId} size={18} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{activeCat.title}</p>
                    <p className="text-white/20 text-[10px]">{activeCat.questions.length} คำถาม</p>
                  </div>
                </div>
              </motion.div>

              {/* Questions */}
              {activeCat.questions.map((faq, fIdx) => {
                const key = `${activeCat.id}-${fIdx}`;
                const isOpen = openQ === key;
                return (
                  <motion.div key={fIdx} variants={itemVariants}>
                    <Card
                      className={`p-0 overflow-hidden cursor-pointer transition-colors ${isOpen ? 'border-app-red/15' : 'border-white/5'}`}
                      onClick={() => setOpenQ(isOpen ? null : key)}
                    >
                      <div className="flex items-start gap-3 p-3.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold ${
                          isOpen ? 'bg-app-red text-white' : 'bg-white/5 text-white/30'
                        }`}>
                          {fIdx + 1}
                        </div>
                        <p className={`flex-1 text-[13px] leading-snug font-medium ${isOpen ? 'text-white' : 'text-white/70'}`}>{faq.q}</p>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-app-red' : 'text-white/20'}`}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <div className="px-3.5 pb-3.5">
                              <div className="ml-9 bg-app-red/[0.04] rounded-xl p-3 border border-app-red/10">
                                <p className="text-white/50 text-[12px] leading-relaxed">{faq.a}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </>
          )}

          {/* Contact CTA */}
          <motion.div variants={itemVariants}>
            <Card className="p-4 border-app-red/10 bg-app-red/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-app-red/15 border border-app-red/20 flex items-center justify-center flex-shrink-0">
                  <Ico id={646} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">ไม่พบคำตอบ?</p>
                  <p className="text-white/25 text-[10px]">ส่งเรื่องให้ทีมงานตรวจสอบ</p>
                </div>
                <Button size="sm" onClick={onNavigateFeedback} className="bg-app-red hover:bg-red-600 rounded-full text-xs h-8 px-4 flex-shrink-0">
                  แจ้งปัญหา
                </Button>
              </div>
            </Card>
          </motion.div>

          <div className="h-2" />
        </motion.div>
      </div>
    </div>
  );
}
