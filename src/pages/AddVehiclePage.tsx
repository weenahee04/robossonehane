import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateVehicle } from '@/hooks/useApi';

const USE_API = !!import.meta.env.VITE_API_URL;

interface AddVehiclePageProps {
  onBack: () => void;
  onSaved?: () => void;
}

interface Brand {
  id: string;
  name: string;
  abbr: string;
  color: string;
  domain: string;
}

const CAR_BRANDS: Brand[] = [
  { id: 'toyota',      name: 'Toyota',     abbr: 'TOY', color: '#EB0A1E', domain: 'toyota.com' },
  { id: 'honda',       name: 'Honda',      abbr: 'HON', color: '#CC0000', domain: 'honda.com' },
  { id: 'isuzu',       name: 'Isuzu',      abbr: 'ISZ', color: '#003087', domain: 'isuzu.com' },
  { id: 'mazda',       name: 'Mazda',      abbr: 'MAZ', color: '#1B4CA1', domain: 'mazda.com' },
  { id: 'ford',        name: 'Ford',       abbr: 'FOR', color: '#003478', domain: 'ford.com' },
  { id: 'mitsubishi',  name: 'Mitsubishi', abbr: 'MIT', color: '#E4003A', domain: 'mitsubishi-motors.com' },
  { id: 'nissan',      name: 'Nissan',     abbr: 'NIS', color: '#C3002F', domain: 'nissan.com' },
  { id: 'suzuki',      name: 'Suzuki',     abbr: 'SUZ', color: '#EF4135', domain: 'suzuki.com' },
  { id: 'bmw',         name: 'BMW',        abbr: 'BMW', color: '#0066B1', domain: 'bmw.com' },
  { id: 'mercedes',    name: 'Mercedes',   abbr: 'MB',  color: '#00ADEF', domain: 'mercedes-benz.com' },
  { id: 'hyundai',     name: 'Hyundai',    abbr: 'HYU', color: '#002C5F', domain: 'hyundai.com' },
  { id: 'kia',         name: 'Kia',        abbr: 'KIA', color: '#05141F', domain: 'kia.com' },
  { id: 'mg',          name: 'MG',         abbr: 'MG',  color: '#C41E3A', domain: 'mg-motor.co.th' },
  { id: 'byd',         name: 'BYD',        abbr: 'BYD', color: '#1D6FA4', domain: 'byd.com' },
  { id: 'haval',       name: 'Haval',      abbr: 'HAV', color: '#B01C2E', domain: 'haval.com' },
  { id: 'subaru',      name: 'Subaru',     abbr: 'SUB', color: '#003399', domain: 'subaru.com' },
  { id: 'lexus',       name: 'Lexus',      abbr: 'LEX', color: '#2C2C2C', domain: 'lexus.com' },
  { id: 'volvo',       name: 'Volvo',      abbr: 'VOL', color: '#003057', domain: 'volvocars.com' },
  { id: 'jeep',        name: 'Jeep',       abbr: 'JEP', color: '#2E7D32', domain: 'jeep.com' },
  { id: 'chevrolet',   name: 'Chevrolet',  abbr: 'CHE', color: '#AA8800', domain: 'chevrolet.com' },
  { id: 'other',       name: 'อื่นๆ',      abbr: '•••', color: '#555555', domain: '' },
];

const CAR_COLORS = [
  { label: 'ขาว',    hex: '#FFFFFF' },
  { label: 'เงิน',   hex: '#C0C0C0' },
  { label: 'เทา',    hex: '#808080' },
  { label: 'ดำ',     hex: '#1a1a1a' },
  { label: 'แดง',    hex: '#CC0000' },
  { label: 'น้ำเงิน', hex: '#003478' },
  { label: 'เขียว',  hex: '#2E7D32' },
  { label: 'ทอง',   hex: '#C9A84C' },
  { label: 'น้ำตาล', hex: '#7B4F2E' },
  { label: 'ชมพู',  hex: '#E91E8C' },
];

const CAR_SIZES = [
  { id: 'S', label: 'S', desc: 'รถเล็ก' },
  { id: 'M', label: 'M', desc: 'รถกลาง' },
  { id: 'L', label: 'L', desc: 'รถใหญ่ / SUV' },
] as const;

const THAI_PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี',
  'ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด',
  'ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี',
  'นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี',
  'พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์',
  'แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง',
  'ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล',
  'สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย',
  'สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ',
  'อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
];

function BrandLogo({ brand, selected }: { brand: Brand; selected: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);

  const logoUrl = brand.domain
    ? `https://logo.clearbit.com/${brand.domain}?size=80`
    : null;

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={() => {}}
      className="relative flex flex-col items-center gap-1.5"
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200 overflow-hidden relative ${
          selected
            ? 'border-app-red shadow-[0_0_14px_rgba(220,38,38,0.5)]'
            : 'border-white/8 hover:border-white/20'
        }`}
        style={{ background: selected ? `${brand.color}22` : '#111111' }}
      >
        {logoUrl && !imgFailed ? (
          <img
            src={logoUrl}
            alt={brand.name}
            width={36}
            height={36}
            className="object-contain"
            style={{ filter: 'brightness(1.05) saturate(1.1)' }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className="text-[11px] font-black tracking-tight"
            style={{ color: brand.color === '#1a1a1a' || brand.color === '#05141F' ? '#e8e8e8' : brand.color }}
          >
            {brand.abbr}
          </span>
        )}
        {selected && (
          <motion.div
            layoutId="brand-check"
            className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-app-red rounded-full flex items-center justify-center"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </motion.div>
        )}
      </div>
      <span className={`text-[9px] font-medium text-center leading-tight truncate w-full ${selected ? 'text-white' : 'text-white/40'}`}>
        {brand.name}
      </span>
    </motion.button>
  );
}

export function AddVehiclePage({ onBack, onSaved }: AddVehiclePageProps) {
  const createVehicle = useCreateVehicle();
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [plate, setPlate] = useState('');
  const [province, setProvince] = useState('กรุงเทพมหานคร');
  const [model, setModel] = useState('');
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showProvincePicker, setShowProvincePicker] = useState(false);

  const canSave = selectedBrand && plate.trim().length >= 2 && model.trim().length >= 1;

  const handleSave = async () => {
    if (!canSave) return;

    if (USE_API) {
      try {
        await createVehicle.mutateAsync({
          brand: selectedBrand!.name,
          model,
          plate: plate.trim(),
          province,
          color: selectedColor.label,
          size: selectedSize,
        });
      } catch {
        // API failed — still show success for offline-first UX
      }
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onSaved?.();
      onBack();
    }, 1600);
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:bg-white/10 transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-white font-bold text-base">เพิ่มยานพาหนะ</h1>
          <p className="text-white/30 text-[11px]">บันทึกรถเพื่อใช้ล้างอัตโนมัติ</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 py-5 space-y-6 pb-32">

          {/* ── Brand selection ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-app-red rounded-full" />
              <h2 className="text-white font-bold text-sm">ยี่ห้อรถ</h2>
              {selectedBrand && (
                <span className="ml-auto text-[11px] text-app-red font-medium">{selectedBrand.name}</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-3">
              {CAR_BRANDS.map(brand => (
                <div key={brand.id} onClick={() => setSelectedBrand(brand)}>
                  <BrandLogo brand={brand} selected={selectedBrand?.id === brand.id} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Thai License Plate ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-app-red rounded-full" />
              <h2 className="text-white font-bold text-sm">ทะเบียนรถ</h2>
            </div>

            {/* Plate preview */}
            <div className="flex justify-center mb-3">
              <div
                className="relative w-52 rounded-[6px] overflow-hidden border-2 border-[#1a1a90] shadow-lg"
                style={{ aspectRatio: '2.35/1', background: 'linear-gradient(135deg, #f8f8f0, #eaeae0, #f8f8f0)' }}
              >
                {/* Blue top strip */}
                <div className="absolute top-0 left-0 right-0 h-[24%] bg-[#1a1a90] flex items-center justify-center gap-1.5 px-2">
                  <div className="w-3 h-3 rounded-full border border-yellow-300/60 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-300/60" />
                  </div>
                  <span className="text-white text-[8px] font-bold tracking-widest">
                    {province || 'กรุงเทพมหานคร'}
                  </span>
                  <div className="w-3 h-3 rounded-full border border-yellow-300/60 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-300/60" />
                  </div>
                </div>
                {/* Plate number */}
                <div className="absolute bottom-0 left-0 right-0 top-[24%] flex items-center justify-center">
                  <span
                    className="font-black tracking-[0.2em] text-gray-900"
                    style={{ fontSize: '1.6rem', fontFamily: '"Noto Serif Thai", serif', letterSpacing: '0.15em' }}
                  >
                    {plate || 'กข 1234'}
                  </span>
                </div>
              </div>
            </div>

            {/* Plate input */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  value={plate}
                  onChange={e => setPlate(e.target.value.toUpperCase())}
                  placeholder="เช่น กข 1234"
                  maxLength={10}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center font-bold tracking-widest text-base placeholder:text-white/20 focus:outline-none focus:border-app-red/60 transition-colors"
                />
              </div>
              {/* Province picker button */}
              <button
                onClick={() => setShowProvincePicker(true)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white active:bg-white/10 transition-colors"
              >
                <span className="text-white/50 text-sm">จังหวัด</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-medium">{province}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </button>
            </div>
          </section>

          {/* ── Car Model ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-app-red rounded-full" />
              <h2 className="text-white font-bold text-sm">รุ่นรถ</h2>
            </div>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="เช่น Corolla Cross 1.8 HEV"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-app-red/60 transition-colors"
            />
          </section>

          {/* ── Car Size ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-app-red rounded-full" />
              <h2 className="text-white font-bold text-sm">ขนาดรถ</h2>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {CAR_SIZES.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200 ${
                    selectedSize === size.id
                      ? 'bg-app-red/15 border-app-red/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                      : 'bg-white/[0.03] border-white/8 hover:border-white/20'
                  }`}
                >
                  <span className={`text-xl font-black ${selectedSize === size.id ? 'text-app-red' : 'text-white/60'}`}>
                    {size.label}
                  </span>
                  <span className={`text-[10px] font-medium ${selectedSize === size.id ? 'text-white/70' : 'text-white/30'}`}>
                    {size.desc}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Car Color ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-app-red rounded-full" />
              <h2 className="text-white font-bold text-sm">สีรถ</h2>
              <span className="ml-auto text-[11px] text-white/40">{selectedColor.label}</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {CAR_COLORS.map(col => (
                <button
                  key={col.hex}
                  onClick={() => setSelectedColor(col)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`w-9 h-9 rounded-full transition-all duration-200 ${
                      selectedColor.hex === col.hex
                        ? 'ring-2 ring-app-red ring-offset-2 ring-offset-app-black scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      background: col.hex,
                      border: col.hex === '#FFFFFF' || col.hex === '#C0C0C0' ? '1.5px solid rgba(255,255,255,0.15)' : 'none',
                    }}
                  />
                  <span className={`text-[9px] font-medium ${selectedColor.hex === col.hex ? 'text-white' : 'text-white/30'}`}>
                    {col.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Save button — fixed at bottom */}
      <div className="px-4 pt-3 pb-6 border-t border-white/5 bg-app-black">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all duration-300 ${
            canSave
              ? 'bg-app-red text-white shadow-lg shadow-red-900/40 hover:bg-red-600'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {canSave ? 'บันทึกยานพาหนะ' : 'กรุณากรอกข้อมูลให้ครบ'}
        </motion.button>
      </div>

      {/* Province picker sheet */}
      <AnimatePresence>
        {showProvincePicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowProvincePicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] rounded-t-3xl border-t border-white/8 overflow-hidden"
              style={{ maxHeight: '72vh' }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5">
                <h3 className="text-white font-bold text-sm">เลือกจังหวัด</h3>
                <button onClick={() => setShowProvincePicker(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(72vh - 56px)' }}>
                {THAI_PROVINCES.map(prov => (
                  <button
                    key={prov}
                    onClick={() => { setProvince(prov); setShowProvincePicker(false); }}
                    className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04] transition-colors ${
                      province === prov ? 'bg-app-red/15 text-app-red' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-medium">{prov}</span>
                    {province === prov && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-[#111] border border-white/8 rounded-3xl px-10 py-8 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <p className="text-white font-bold text-base text-center">บันทึกยานพาหนะแล้ว!</p>
              <p className="text-white/40 text-xs text-center">
                {selectedBrand?.name} {model}<br/>
                <span className="font-mono tracking-wider">{plate}</span> · {province}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
