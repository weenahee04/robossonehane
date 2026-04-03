import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getIconUrl, type IconName } from '../services/icons';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

interface Article {
  id: string;
  category: string;
  categoryColor: string;
  title: string;
  excerpt: string;
  content: string[];
  coverImage: string;
  date: string;
  readTime: string;
  tips?: string[];
}

const articles: Article[] = [
  {
    id: 'a1',
    category: 'ล้างรถ',
    categoryColor: 'bg-app-red',
    title: 'ทำไมต้องล้างรถบ่อยๆ? เหตุผลที่คุณไม่ควรมองข้าม',
    excerpt: 'รถสกปรกไม่ใช่แค่เรื่องความสวยงาม แต่ส่งผลต่ออายุของสีรถและมูลค่าในระยะยาว',
    coverImage: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
    date: '25 มี.ค. 2568',
    readTime: '3 นาที',
    content: [
      'หลายคนอาจคิดว่าการล้างรถเป็นแค่เรื่องของความสะอาดและความสวยงาม แต่ความจริงแล้ว การล้างรถสม่ำเสมอมีความสำคัญมากกว่านั้นในหลายด้าน',
      'ฝุ่น คราบน้ำมัน และสิ่งสกปรกต่างๆ ที่สะสมบนตัวถังรถสามารถกัดกร่อนชั้นสีได้อย่างช้าๆ โดยเฉพาะมูลนก น้ำยางต้นไม้ และสารเคมีจากท้องถนน ซึ่งมีฤทธิ์เป็นกรดและด่างที่ทำลายสีรถได้',
      'นอกจากนี้ รถที่สะอาดยังช่วยให้การตรวจสอบสภาพภายนอกทำได้ง่ายขึ้น เช่น รอยขีดข่วน บุบ หรือสนิมเริ่มต้น ซึ่งหากปล่อยทิ้งไว้จะกลายเป็นปัญหาใหญ่และซ่อมแพงกว่าเดิม',
      'นักวิจัยพบว่ารถที่ได้รับการดูแลสีอย่างสม่ำเสมอ มีมูลค่าตลาดสูงกว่ารถที่ปล่อยปละละเลยถึง 10-15% เมื่อถึงเวลาขายต่อ',
    ],
    tips: [
      'ล้างรถอย่างน้อย 2 ครั้งต่อเดือน',
      'หลังฝนตกควรล้างทันทีเพราะน้ำฝนมีกรด',
      'หลีกเลี่ยงจอดใต้ต้นไม้เพราะยางไม้ทำลายสี',
    ],
  },
  {
    id: 'a2',
    category: 'เคลือบแก้ว',
    categoryColor: 'bg-blue-600',
    title: 'เคลือบแก้ว vs เคลือบเงา ต่างกันอย่างไร เลือกแบบไหนดี?',
    excerpt: 'สองบริการที่ฟังดูคล้ายกัน แต่เทคโนโลยีและผลลัพธ์ต่างกันมาก มาดูกันว่าแบบไหนเหมาะกับรถคุณ',
    coverImage: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
    date: '20 มี.ค. 2568',
    readTime: '5 นาที',
    content: [
      'เคลือบเงา (Wax/Sealant) เป็นการใช้ผลิตภัณฑ์ที่มีส่วนผสมของขี้ผึ้งหรือโพลิเมอร์สังเคราะห์เคลือบผิวสีรถ เพื่อเพิ่มความเงาและป้องกันสิ่งสกปรกในระยะสั้น โดยทั่วไปอยู่ได้ประมาณ 2-6 เดือน',
      'เคลือบแก้ว (Ceramic Coating) เป็นเทคโนโลยีขั้นสูงที่ใช้สารซิลิกาไดออกไซด์ (SiO2) หรือ Titanium Dioxide เคลือบลงบนสีรถ สร้างชั้นป้องกันที่แข็งแกร่งมาก ทนทานได้ 1-3 ปี และป้องกันได้ทั้งรอยขีดข่วนเล็กน้อย รังสี UV และสารเคมีต่างๆ',
      'สำหรับรถใหม่หรือรถที่ต้องการการปกป้องระยะยาว การเคลือบแก้วคือตัวเลือกที่คุ้มค่ากว่า แม้ราคาเริ่มต้นจะสูงกว่า แต่ประหยัดค่าดูแลในระยะยาวได้มาก',
      'ส่วนเคลือบเงาเหมาะสำหรับผู้ที่ต้องการความเงางามในระยะสั้น หรือต้องการ "รีเฟรช" รถก่อนงานสำคัญ',
    ],
    tips: [
      'เคลือบแก้วควรทำโดยช่างผู้เชี่ยวชาญ',
      'ก่อนเคลือบแก้วต้องขัดสีให้สะอาดก่อน',
      'หลังเคลือบแก้วใหม่ๆ ห้ามล้างรถ 24-48 ชั่วโมง',
    ],
  },
  {
    id: 'a3',
    category: 'ขัดสี',
    categoryColor: 'bg-amber-500',
    title: '5 สัญญาณที่บอกว่ารถคุณต้องขัดสีแล้ว',
    excerpt: 'สีรถหม่น รอยวน หรือผิวสีไม่เรียบ? เหล่านี้คือสัญญาณที่รถของคุณกำลังร้องขอการขัดสี',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
    date: '15 มี.ค. 2568',
    readTime: '4 นาที',
    content: [
      'การขัดสีรถ (Car Polishing) เป็นกระบวนการใช้สารขัดละเอียดกำจัดชั้นสีที่เสื่อมสภาพออก เพื่อเผยให้เห็นชั้นสีที่สดใสอยู่ข้างใต้ ซึ่งแตกต่างจากการเคลือบที่เป็นการ "เพิ่ม" ชั้นปกป้อง',
      'สัญญาณแรกที่ชัดเจนที่สุดคือสีรถดูหม่น ขาดความเงาเมื่อเทียบกับตอนใหม่ๆ แม้จะล้างสะอาดแล้วก็ตาม นี่คือสัญญาณว่าชั้น Clear Coat เริ่มเสื่อมสภาพ',
      'รอยวน (Swirl Marks) ที่มักเห็นเป็นลวดลายวงกลมเล็กๆ บนสีรถเมื่อส่องกับแสง มักเกิดจากการล้างรถด้วยวิธีที่ไม่ถูกต้องหรือใช้ผ้าเนื้อหยาบ',
      'ผิวสีที่จับน้ำไม่ดี เมื่อเอาน้ำสาดแล้วน้ำไม่รวมตัวเป็นหยดกลมๆ แต่กระจายแบนราบ แสดงว่าชั้นป้องกันหมดแล้ว',
      'หากพบสัญญาณเหล่านี้ ควรรีบนำรถเข้าขัดสีและเคลือบใหม่ ก่อนที่ความเสียหายจะลึกถึงชั้นสีจริงซึ่งซ่อมแพงกว่ามาก',
    ],
    tips: [
      'ขัดสีด้วยแสงไฟส่องตรงเพื่อมองเห็นรอยชัดขึ้น',
      'ไม่ควรขัดสีเองหากไม่มีประสบการณ์',
      'ควรขัดสีก่อนเคลือบแก้วทุกครั้ง',
    ],
  },
  {
    id: 'a4',
    category: 'ดูแลรถ',
    categoryColor: 'bg-green-600',
    title: 'วิธีดูแลรถในช่วงหน้าฝน ป้องกันสนิมและกลิ่นอับ',
    excerpt: 'หน้าฝนคือศัตรูตัวร้ายของรถคุณ เรียนรู้วิธีดูแลรถให้ผ่านฤดูฝนได้อย่างปลอดภัย',
    coverImage: 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?auto=format&fit=crop&w=800&q=80',
    date: '10 มี.ค. 2568',
    readTime: '4 นาที',
    content: [
      'ฤดูฝนในไทยเป็นช่วงเวลาที่รถยนต์ต้องเผชิญกับความชื้น น้ำขัง และสารปนเปื้อนในน้ำฝนมากเป็นพิเศษ การดูแลรถอย่างถูกวิธีในช่วงนี้จะช่วยยืดอายุรถได้มาก',
      'หลังขับรถในฝนหรือน้ำขัง ควรล้างรถโดยเร็วที่สุด โดยเฉพาะใต้ท้องรถและซอกล้อ เพราะน้ำฝนมีสภาพเป็นกรดเล็กน้อยจากมลพิษในอากาศ',
      'ตรวจสอบและเปลี่ยนยางปัดน้ำฝนหากเริ่มมีรอยแตกหรือปัดไม่สะอาด ความสามารถในการมองเห็นขณะฝนตกสำคัญมากต่อความปลอดภัย',
      'สำหรับพรมรถและห้องโดยสาร ควรระวังความชื้นที่อาจทำให้เกิดเชื้อรา นำพรมออกมาผึ่งแดดหลังขับในวันฝนตก และใช้สารดูดความชื้นในห้องโดยสาร',
    ],
    tips: [
      'ใช้ผลิตภัณฑ์ไล่น้ำบนกระจกเพื่อความปลอดภัย',
      'ตรวจสอบแผ่นกรองอากาศบ่อยขึ้นในหน้าฝน',
      'ระวังน้ำเข้าท่อไอเสียเมื่อขับในน้ำลึก',
    ],
  },
  {
    id: 'a5',
    category: 'เทคโนโลยี',
    categoryColor: 'bg-purple-600',
    title: 'ระบบล้างรถอัตโนมัติ ROBOSS ทำงานอย่างไร?',
    excerpt: 'เบื้องหลังความสะอาดภายใน 15 นาที เทคโนโลยีและกระบวนการที่ ROBOSS ใช้เพื่อรถของคุณ',
    coverImage: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80',
    date: '5 มี.ค. 2568',
    readTime: '5 นาที',
    content: [
      'ระบบล้างรถอัตโนมัติของ ROBOSS ใช้เทคโนโลยีหัวฉีดน้ำแรงดันสูงหลายจุด ร่วมกับแปรงขนนิ่มพิเศษที่ไม่ทำลายสีรถ สามารถล้างทำความสะอาดได้อย่างทั่วถึงในเวลาเพียง 10-15 นาที',
      'ขั้นตอนแรกคือการฉีดน้ำยาล้างรถที่เป็นมิตรกับสิ่งแวดล้อม เพื่อละลายคราบสกปรกและไขมัน ตามด้วยระบบแปรงหมุนที่ปรับแรงกดอัตโนมัติตามรูปทรงรถ',
      'ระบบล้างล้อและซุ้มล้อด้วยหัวฉีดทิศทางเฉพาะ กำจัดคราบฝุ่น เบรก และสิ่งสกปรกที่สะสมในจุดที่ยากต่อการล้างด้วยมือ',
      'สุดท้ายคือระบบเป่าแห้งด้วยลมร้อนแรงดันสูง ลดรอยน้ำบนตัวรถให้น้อยที่สุด ทำให้รถออกมาสะอาดและแห้งพร้อมใช้งานได้ทันที',
    ],
    tips: [
      'ปิดกระจกและซันรูฟทุกบานก่อนเข้าระบบ',
      'พับกระจกมองข้างก่อนเข้าล้างทุกครั้ง',
      'ถอดเสาอากาศออกหากเป็นแบบถอดได้',
    ],
  },
];

const CATEGORIES = ['ทั้งหมด', 'ล้างรถ', 'เคลือบแก้ว', 'ขัดสี', 'ดูแลรถ', 'เทคโนโลยี'];

interface ArticlePageProps {
  onBack: () => void;
}

export function ArticlePage({ onBack }: ArticlePageProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');

  const filtered = activeCategory === 'ทั้งหมด'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-app-black/95 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-lg">บทความ & ข่าวสาร</h1>
        <div className="w-10" />
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-app-red text-white shadow-lg shadow-red-900/40'
                  : 'bg-app-dark text-gray-400 hover:text-white'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Article */}
      {activeCategory === 'ทั้งหมด' && (
        <div className="px-4 pt-2 pb-3">
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedArticle(articles[0])}
            className="w-full relative rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform shadow-xl">
            <img
              src={articles[0].coverImage}
              alt={articles[0].title}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${articles[0].categoryColor} mb-2 inline-block`}>
                {articles[0].category}
              </span>
              <h2 className="text-white font-bold text-base leading-snug">{articles[0].title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-400 text-[11px] flex items-center gap-1">
                  <I8Icon name="timer" size={11} /> {articles[0].date}
                </span>
                <span className="text-gray-400 text-[11px] flex items-center gap-1">
                  <I8Icon name="timer" size={11} /> {articles[0].readTime}
                </span>
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Article List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-10 space-y-3">
        {(activeCategory === 'ทั้งหมด' ? filtered.slice(1) : filtered).map((article, index) => (
          <motion.button
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => setSelectedArticle(article)}
            className="w-full flex gap-3 bg-app-dark rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform border border-white/5 p-3">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-24 h-24 object-cover rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${article.categoryColor} inline-block mb-1.5`}>
                  {article.category}
                </span>
                <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{article.title}</h3>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-500 text-[10px] flex items-center gap-1">
                  <I8Icon name="timer" size={10} /> {article.date}
                </span>
                <span className="text-gray-500 text-[10px] flex items-center gap-1">
                  <I8Icon name="timer" size={10} /> {article.readTime}
                </span>
              </div>
            </div>
            <I8Icon name="back" size={14} className="self-center shrink-0 opacity-40 rotate-180" />
          </motion.button>
        ))}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedArticle(null)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 bg-app-black rounded-t-3xl border-t border-white/10 max-h-[92%] flex flex-col"
              onClick={e => e.stopPropagation()}>

              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Cover Image */}
                <div className="relative mx-4 mt-2 rounded-2xl overflow-hidden">
                  <img
                    src={selectedArticle.coverImage}
                    alt={selectedArticle.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Button variant="ghost" size="icon"
                    onClick={() => setSelectedArticle(null)}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm">
                    <I8Icon name="back" size={14} />
                  </Button>
                  <span className={`absolute bottom-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white ${selectedArticle.categoryColor}`}>
                    {selectedArticle.category}
                  </span>
                </div>

                {/* Article Content */}
                <div className="px-4 pt-4 pb-6 space-y-4">
                  <h2 className="text-white font-bold text-xl leading-snug">{selectedArticle.title}</h2>

                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-xs flex items-center gap-1.5">
                      <I8Icon name="timer" size={12} /> {selectedArticle.date}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-1.5">
                      <I8Icon name="timer" size={12} /> อ่าน {selectedArticle.readTime}
                    </span>
                  </div>

                  <div className="w-full h-px bg-white/5" />

                  {selectedArticle.content.map((para, idx) => (
                    <p key={idx} className="text-gray-300 text-sm leading-relaxed">{para}</p>
                  ))}

                  {selectedArticle.tips && (
                    <div className="bg-app-dark rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 mb-3">
                        <I8Icon name="star" size={14} />
                        <h4 className="text-white font-bold text-sm">เคล็ดลับสำคัญ</h4>
                      </div>
                      <div className="space-y-2">
                        {selectedArticle.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-app-red/20 text-app-red text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-gray-300 text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="p-4 border-t border-white/5">
                <Button className="w-full py-4 text-base" size="lg" onClick={() => setSelectedArticle(null)}>
                  จองบริการล้างรถ
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
