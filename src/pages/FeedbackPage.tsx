import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { getIconUrl, type IconName } from '../services/icons';
import { useSubmitFeedback } from '@/hooks/useApi';

const USE_API = !!import.meta.env.VITE_API_URL;

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

const issueTypes = [
  { id: 'machine', label: 'เครื่องขัดข้อง', icon: 'settings' as IconName, bg: 'bg-red-500/20' },
  { id: 'quality', label: 'ล้างไม่สะอาด', icon: 'water' as IconName, bg: 'bg-blue-500/20' },
  { id: 'payment', label: 'ชำระเงินผิดพลาด', icon: 'receipt' as IconName, bg: 'bg-orange-500/20' },
  { id: 'app', label: 'ปัญหาแอป', icon: 'info' as IconName, bg: 'bg-purple-500/20' },
  { id: 'other', label: 'อื่นๆ', icon: 'chat' as IconName, bg: 'bg-gray-500/20' },
];

const pastReports = [
  { id: '1', type: 'machine', title: 'เครื่องตู้ A2 ไม่ทำงาน', branch: 'สาขาลาดพร้าว', date: '25 มี.ค. 2026', status: 'resolved' },
  { id: '2', type: 'quality', title: 'น้ำยาไม่เพียงพอ', branch: 'สาขาบางนา', date: '20 มี.ค. 2026', status: 'pending' },
];

export function FeedbackPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'select' | 'form' | 'success'>('select');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = () => {
    if (USE_API && selectedType) {
      submitFeedback.mutate(
        { type: selectedType, message },
        {
          onSuccess: () => {
            setStep('success');
            setTimeout(() => { setStep('select'); setSelectedType(null); setMessage(''); }, 3000);
          },
          onError: () => {
            setStep('success');
            setTimeout(() => { setStep('select'); setSelectedType(null); setMessage(''); }, 3000);
          },
        }
      );
    } else {
      setStep('success');
      setTimeout(() => { setStep('select'); setSelectedType(null); setMessage(''); }, 3000);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-app-black/95 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={step === 'form' ? () => setStep('select') : onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-lg">แจ้งปัญหา</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {step === 'success' ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <I8Icon name="checkmark" size={36} />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">ส่งเรื่องเรียบร้อย!</h2>
            <p className="text-gray-400 text-sm">ทีมงานจะตรวจสอบและตอบกลับภายใน 24 ชั่วโมง</p>
          </motion.div>
        ) : step === 'form' ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 py-5 space-y-4">
            <motion.div variants={itemVariants}>
              <p className="text-xs text-gray-400 mb-2">ประเภทปัญหา</p>
              <Card className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${issueTypes.find(t => t.id === selectedType)?.bg} flex items-center justify-center`}>
                  <I8Icon name={issueTypes.find(t => t.id === selectedType)?.icon || 'info'} size={16} />
                </div>
                <span className="text-white text-sm font-medium">{issueTypes.find(t => t.id === selectedType)?.label}</span>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-xs text-gray-400 mb-2">รายละเอียด</p>
              <Textarea
                placeholder="อธิบายปัญหาที่พบ..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="text-xs text-gray-400 mb-2">แนบรูปภาพ (ไม่บังคับ)</p>
              <Card className="p-6 border-dashed border-2 border-white/10 text-center cursor-pointer hover:border-white/20 transition-colors">
                <I8Icon name="camera" size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-gray-500 text-xs">แตะเพื่อเลือกรูปภาพ</p>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button className="w-full py-4" disabled={!message.trim()} onClick={handleSubmit}>
                ส่งเรื่อง
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 py-5 space-y-4">
            <motion.div variants={itemVariants}>
              <p className="text-white font-bold text-sm mb-3">เลือกประเภทปัญหา</p>
              <div className="grid grid-cols-2 gap-3">
                {issueTypes.map(type => (
                  <Card
                    key={type.id}
                    className="p-4 cursor-pointer hover:border-white/20 transition-all text-center"
                    onClick={() => { setSelectedType(type.id); setStep('form'); }}
                  >
                    <div className={`w-12 h-12 rounded-xl ${type.bg} flex items-center justify-center mx-auto mb-2`}>
                      <I8Icon name={type.icon} size={22} />
                    </div>
                    <p className="text-white text-xs font-medium">{type.label}</p>
                  </Card>
                ))}
              </div>
            </motion.div>

            <Separator className="my-4" />

            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-bold text-sm">เรื่องที่แจ้งไว้</p>
                <Badge variant="outline" className="text-[10px]">{pastReports.length} รายการ</Badge>
              </div>
              <div className="space-y-3">
                {pastReports.map(report => (
                  <Card key={report.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{report.title}</p>
                        <p className="text-gray-500 text-[11px] mt-0.5">{report.branch} • {report.date}</p>
                      </div>
                      <Badge variant={report.status === 'resolved' ? 'success' : 'warning'} className="text-[10px] shrink-0">
                        {report.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอตรวจสอบ'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
            <div className="h-4" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
