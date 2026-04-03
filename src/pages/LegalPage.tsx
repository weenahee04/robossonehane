import React from 'react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getIconUrl, type IconName } from '../services/icons';

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

const documents = {
  privacy: {
    title: 'นโยบายความเป็นส่วนตัว',
    updatedAt: 'อัปเดตล่าสุด 2 เมษายน 2026',
    sections: [
      {
        title: 'ข้อมูลที่เราเก็บ',
        body: 'ROBOSS เก็บข้อมูลโปรไฟล์ที่จำเป็นต่อการให้บริการ เช่น ชื่อที่แสดง รูปโปรไฟล์ เบอร์โทร อีเมล รายการรถ ประวัติการล้างรถ แต้มสะสม และการตั้งค่าการแจ้งเตือนของคุณ',
      },
      {
        title: 'วัตถุประสงค์การใช้ข้อมูล',
        body: 'เราใช้ข้อมูลเพื่อยืนยันตัวตน จัดการการชำระเงิน แจ้งสถานะการล้างรถ ดูแลสิทธิประโยชน์สมาชิก และให้ทีมซัพพอร์ตตรวจสอบปัญหาได้เร็วขึ้น',
      },
      {
        title: 'การควบคุมข้อมูลของคุณ',
        body: 'คุณสามารถแก้ไขข้อมูลโปรไฟล์ ปรับการแจ้งเตือน หรือขอลบบัญชีจากหน้า Settings ได้ตลอดเวลา หากลบบัญชี ระบบจะปิดการเข้าถึงและเก็บประวัติที่จำเป็นต่อการตรวจสอบธุรกรรมตามข้อกำหนดที่เกี่ยวข้อง',
      },
    ],
  },
  terms: {
    title: 'ข้อกำหนดการใช้งาน',
    updatedAt: 'มีผลตั้งแต่ 2 เมษายน 2026',
    sections: [
      {
        title: 'การใช้งานบัญชี',
        body: 'ผู้ใช้ต้องให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันในการใช้งาน ROBOSS และต้องรับผิดชอบการใช้งานบัญชีของตนเองหลังจากเข้าสู่ระบบผ่าน LINE',
      },
      {
        title: 'การจองและการชำระเงิน',
        body: 'เมื่อยืนยันการชำระเงินและเริ่มรอบล้างรถแล้ว ระบบจะถือว่าการใช้บริการได้เริ่มต้นขึ้น การคืนเงินและการชดเชยเป็นไปตามเงื่อนไขของสาขาและประเภทปัญหาที่ตรวจสอบได้',
      },
      {
        title: 'การระงับบัญชี',
        body: 'ROBOSS อาจระงับหรือปิดการใช้งานบัญชีที่มีการใช้งานผิดวัตถุประสงค์ กระทบความปลอดภัยของระบบ หรือฝ่าฝืนข้อกำหนดการให้บริการ',
      },
    ],
  },
} as const;

export function LegalPage({ onBack }: { onBack: () => void }) {
  const { document } = useParams();

  const content = useMemo(() => {
    if (document === 'terms') {
      return documents.terms;
    }

    return documents.privacy;
  }, [document]);

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">{content.title}</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
        <Card className="p-4 border-white/5">
          <p className="text-white/40 text-[11px]">{content.updatedAt}</p>
          <p className="text-white/60 text-sm mt-2">
            เอกสารนี้ใช้กับการใช้งานแอป ROBOSS Mini App สำหรับลูกค้า และอธิบายวิธีที่ระบบจัดการข้อมูลและเงื่อนไขการใช้บริการหลัก
          </p>
        </Card>

        {content.sections.map((section) => (
          <Card key={section.title} className="p-4 border-white/5">
            <h2 className="text-white font-bold text-sm">{section.title}</h2>
            <p className="text-white/50 text-sm leading-relaxed mt-2">{section.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
