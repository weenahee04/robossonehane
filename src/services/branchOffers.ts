/**
 * พ้อยท์สะสมใช้ร่วมกันทุกสาขา (ดู services/points.ts)
 * คูปองและโปรโมชั่นแยกตามสาขา / แฟรนไชส์ — แต่ละรายการระบุ branchIds ที่ใช้ได้
 */

export type CouponStatus = 'available' | 'used' | 'expired';

export interface BranchCoupon {
  id: string;
  branchIds: string[];
  title: string;
  description: string;
  discount: string;
  discountType: 'percent' | 'amount' | 'text';
  minSpend: number;
  expiryDate: string;
  daysLeft: number;
  status: CouponStatus;
  code: string;
  iconId: number;
}

export interface BranchPromotion {
  id: string;
  branchIds: string[];
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

/** คูปองทั้งหมด — แต่ละใบผูกกับสาขาที่ franchise กำหนด */
export const ALL_BRANCH_COUPONS: BranchCoupon[] = [
  { id: 'cp_c1_1', branchIds: ['c1'], title: 'สาขารามอินทรา 109 — สมาชิกใหม่', description: 'ต้อนรับสาขานี้โดยเฉพาะ', discount: '40', discountType: 'percent', minSpend: 150, expiryDate: '30 เม.ย. 2026', daysLeft: 31, status: 'available', code: 'RAM109NEW', iconId: 12394 },
  { id: 'cp_c1_2', branchIds: ['c1'], title: 'ล้างรถ S ราคาพิเศษ', description: 'เฉพาะสาขารามอินทรา 109', discount: '89', discountType: 'amount', minSpend: 0, expiryDate: '15 พ.ค. 2026', daysLeft: 46, status: 'available', code: 'C1S89', iconId: 25107 },
  { id: 'cp_c1_3', branchIds: ['c1'], title: 'เคลือบเงา -10%', description: 'แฟรนไชส์สาขานี้ร่วมรายการ', discount: '10', discountType: 'percent', minSpend: 400, expiryDate: '1 มิ.ย. 2026', daysLeft: 63, status: 'available', code: 'C1SHINE', iconId: 71290 },
  { id: 'cp_c1_4', branchIds: ['c1'], title: 'โปรเก่า', description: 'หมดอายุแล้ว', discount: '15', discountType: 'percent', minSpend: 200, expiryDate: '1 มี.ค. 2026', daysLeft: 0, status: 'expired', code: 'C1OLD', iconId: 491 },
  { id: 'cp_c2_1', branchIds: ['c2'], title: 'พระราม 9 — ล้างด่วน', description: 'QUICK & CLEAN ลดพิเศษ', discount: '25', discountType: 'amount', minSpend: 0, expiryDate: '20 พ.ค. 2026', daysLeft: 51, status: 'available', code: 'R9QUICK', iconId: 25107 },
  { id: 'cp_c2_2', branchIds: ['c2'], title: 'ส่วนลด SHINE MODE', description: 'เฉพาะสาขาพระราม 9', discount: '15', discountType: 'percent', minSpend: 250, expiryDate: '30 เม.ย. 2026', daysLeft: 31, status: 'available', code: 'R9SHINE', iconId: 71290 },
  { id: 'cp_c2_3', branchIds: ['c2'], title: 'คูปองใช้แล้ว (ตัวอย่าง)', description: 'ใช้ไปแล้ว', discount: '50', discountType: 'amount', minSpend: 0, expiryDate: '31 ธ.ค. 2026', daysLeft: 200, status: 'used', code: 'R9USED', iconId: 12394 },
  { id: 'cp_c3_1', branchIds: ['c3'], title: 'ท่าพระ — ดูดฝุ่นฟรี', description: 'เมื่อล้างครบตามเงื่อนไขสาขา', discount: 'ฟรี', discountType: 'text', minSpend: 200, expiryDate: '15 มิ.ย. 2026', daysLeft: 77, status: 'available', code: 'TPVAC', iconId: 71290 },
  { id: 'cp_c3_2', branchIds: ['c3'], title: 'ส่วนลดวันหยุด', description: 'เสาร์-อาทิตย์ที่สาขาท่าพระ', discount: '12', discountType: 'percent', minSpend: 300, expiryDate: '31 พ.ค. 2026', daysLeft: 62, status: 'available', code: 'TPWKND', iconId: 491 },
  { id: 'cp_c4_1', branchIds: ['c4'], title: 'ชลบุรี — SPECIAL MODE', description: 'แพ็กเกจพรีเมียมลดราคา', discount: '120', discountType: 'amount', minSpend: 500, expiryDate: '30 มิ.ย. 2026', daysLeft: 92, status: 'available', code: 'CBRSPEC', iconId: 25107 },
  { id: 'cp_c4_2', branchIds: ['c4'], title: 'ลูกค้าประจำชลบุรี', description: 'สะสมครบตามเงื่อนไข', discount: '20', discountType: 'percent', minSpend: 0, expiryDate: '1 ก.ค. 2026', daysLeft: 93, status: 'available', code: 'CBRVIP', iconId: 12394 },
  { id: 'cp_c5_1', branchIds: ['c5'], title: 'สตูล — เปิดสาขา', description: 'โปรต้อนรับภาคใต้', discount: '35', discountType: 'percent', minSpend: 180, expiryDate: '31 พ.ค. 2026', daysLeft: 62, status: 'available', code: 'STULOC', iconId: 491 },
  { id: 'cp_c6_1', branchIds: ['c6'], title: 'นครศรีฯ — ล้าง SUV', description: 'รถใหญ่ลดเพิ่ม', discount: '80', discountType: 'amount', minSpend: 350, expiryDate: '20 มิ.ย. 2026', daysLeft: 82, status: 'available', code: 'NSTSUV80', iconId: 25107 },
  { id: 'cp_c7_1', branchIds: ['c7'], title: 'อุทัยธานี — ราคาชาวบ้าน', description: 'คูปองจากเจ้าของแฟรนไชส์ท้องถิ่น', discount: '45', discountType: 'amount', minSpend: 0, expiryDate: '30 เม.ย. 2026', daysLeft: 31, status: 'available', code: 'UTT45', iconId: 12394 },
  { id: 'cp_b1_1', branchIds: ['b1'], title: 'มอไซค์ พระราม 9', description: 'ล้างมอไซค์ลดทันที', discount: '15', discountType: 'amount', minSpend: 0, expiryDate: '31 พ.ค. 2026', daysLeft: 62, status: 'available', code: 'B9MC15', iconId: 25107 },
  { id: 'cp_b1_2', branchIds: ['b1'], title: 'แพ็ก 5 ครั้ง', description: 'ซื้อแพ็กราคาพิเศษที่สาขานี้', discount: '10', discountType: 'percent', minSpend: 100, expiryDate: '1 ก.ค. 2026', daysLeft: 93, status: 'available', code: 'B9PACK5', iconId: 12394 },
  { id: 'cp_b2_1', branchIds: ['b2'], title: 'ปตท. พระราม 4', description: 'ล้างมอไซค์หลังเติมน้ำมัน', discount: '20', discountType: 'amount', minSpend: 50, expiryDate: '15 มิ.ย. 2026', daysLeft: 77, status: 'available', code: 'B4PTT', iconId: 491 },
  { id: 'cp_b3_1', branchIds: ['b3'], title: 'ท่าพระ มอไซค์', description: 'โปรเฉพาะจุดนี้', discount: '12', discountType: 'amount', minSpend: 0, expiryDate: '30 เม.ย. 2026', daysLeft: 31, status: 'available', code: 'BTP12', iconId: 25107 },
  { id: 'cp_b4_1', branchIds: ['b4'], title: 'ชลบุรี มอไซค์', description: 'ล้างเร็ว ราคาพิเศษ', discount: '18', discountType: 'amount', minSpend: 0, expiryDate: '20 พ.ค. 2026', daysLeft: 51, status: 'available', code: 'BBC18', iconId: 12394 },
  { id: 'cp_b5_1', branchIds: ['b5'], title: 'ภูเก็ต — นักท่องเที่ยว', description: 'แสดงคูปองที่สาขา', discount: '25', discountType: 'amount', minSpend: 80, expiryDate: '31 ต.ค. 2026', daysLeft: 185, status: 'available', code: 'BPKT25', iconId: 491 },
  { id: 'cp_b6_1', branchIds: ['b6'], title: 'แม่สอด — ชายแดน', description: 'คูปองจากแฟรนไชส์ท้องถิ่น', discount: '10', discountType: 'amount', minSpend: 0, expiryDate: '30 มิ.ย. 2026', daysLeft: 92, status: 'available', code: 'BMS10', iconId: 25107 },
];

export const ALL_BRANCH_PROMOTIONS: BranchPromotion[] = [
  { id: 'pr_c1_1', branchIds: ['c1'], title: 'รามอินทรา 109\nล้างเริ่ม 89 บาท', subtitle: 'โปรเจ้าของแฟรนไชส์สาขานี้', description: 'ราคาพิเศษเฉพาะสาขารามอินทรา 109 กำหนดโดยแฟรนไชส์ — ไม่เหมือนสาขาอื่น', discountBadge: '89฿', validUntil: '30 มิ.ย. 2026', conditions: ['เฉพาะสาขารามอินทรา 109', 'รถขนาด S', 'ไม่รวมวันหยุดนักขัตฤกษ์ตามประกาศสาขา'], gradient: 'from-app-red via-red-600 to-app-red-dark', patternOpacity: 0.08, image: '/freepik_assistant_1774454922406.png' },
  { id: 'pr_c1_2', branchIds: ['c1'], title: 'สะสม 5 ครั้ง\nรับฟรี 1', subtitle: 'เฉพาะสาขานี้', description: 'สะสมสแตมป์ครบ 5 ครั้งที่สาขารามอินทรา 109 รับสิทธิ์ล้างฟรี 1 ครั้ง', discountBadge: 'ฟรี 1', validUntil: '31 ธ.ค. 2026', conditions: ['นับเฉพาะการใช้บริการที่สาขานี้', 'แลกภายใน 60 วันหลังครบ'], gradient: 'from-amber-500 via-amber-600 to-orange-700', patternOpacity: 0.1 },
  { id: 'pr_c2_1', branchIds: ['c2'], title: 'พระราม 9\nSHINE ลด 25%', subtitle: 'โปรแฟรนไชส์กลางเมือง', description: 'แพ็กเกจ SHINE MODE ลดพิเศษเฉพาะลูกค้าที่สาขาพระราม 9', discountBadge: '-25%', validUntil: '15 พ.ค. 2026', conditions: ['เฉพาะสาขาพระราม 9', 'จองคิวผ่านแอป'], gradient: 'from-blue-600 via-blue-700 to-indigo-800', patternOpacity: 0.08 },
  { id: 'pr_c2_2', branchIds: ['c2'], title: 'จันทร์-พุธ\nลดเพิ่ม 50 บาท', subtitle: 'วันสงบของสาขา', description: 'เจ้าของแฟรนไชส์กำหนดวันโปรเป็นพิเศษ', discountBadge: '-50฿', validUntil: '30 เม.ย. 2026', conditions: ['เฉพาะวันจันทร์-พุธ', 'ขั้นต่ำ 199 บาท'], gradient: 'from-cyan-600 via-teal-600 to-emerald-700', patternOpacity: 0.08 },
  { id: 'pr_c3_1', branchIds: ['c3'], title: 'ท่าพระ\nแพ็กครอบครัว', subtitle: 'ล้าง 2 คัน ถูกลง', description: 'นำรถมา 2 คันต่อครั้ง รับส่วนลดพิเศษจากแฟรนไชส์สาขาท่าพระ', discountBadge: '2 คัน', validUntil: '1 ก.ค. 2026', conditions: ['ทั้ง 2 คันต้องล้างในวันเดียวกัน', 'แจ้งพนักงานก่อนชำระ'], gradient: 'from-purple-600 via-purple-700 to-violet-800', patternOpacity: 0.1 },
  { id: 'pr_c4_1', branchIds: ['c4'], title: 'ชลบุรี\nล้าง + ฉีดยางฟรี', subtitle: 'โปรภาคตะวันออก', description: 'แพ็กเกจที่ร้านชลบุรีจัดเอง — ไม่ใช้ร่วมกับสาขากรุงเทพ', discountBadge: 'แถม', validUntil: '30 ก.ย. 2026', conditions: ['เฉพาะสาขาชลบุรี', 'ตามสต็อกน้ำยา'], gradient: 'from-green-600 via-green-700 to-emerald-800', patternOpacity: 0.1 },
  { id: 'pr_c4_2', branchIds: ['c4'], title: 'สมาชิก LINE\nลด 15%', subtitle: 'ชลบุรีเท่านั้น', description: 'กดรับคูปองใน LINE OA ของสาขาชลบุรี', discountBadge: '-15%', validUntil: '31 พ.ค. 2026', conditions: ['แสดงคูปองจาก LINE', '1 สิทธิ์/เดือน'], gradient: 'from-app-red via-red-600 to-app-red-dark', patternOpacity: 0.05 },
  { id: 'pr_c5_1', branchIds: ['c5'], title: 'สตูล\nโปรเปิดแอป', subtitle: 'ดาวน์โหลดแล้วรับสิทธิ์', description: 'สาขาสตูลมอบสิทธิ์พิเศษสำหรับผู้ใช้แอปครั้งแรกที่สาขานี้', discountBadge: 'แรก 1', validUntil: '31 ธ.ค. 2026', conditions: ['เฉพาะสาขาสตูล', 'บัญชีละ 1 ครั้ง'], gradient: 'from-orange-500 via-red-500 to-rose-600', patternOpacity: 0.12 },
  { id: 'pr_c6_1', branchIds: ['c6'], title: 'นครศรีฯ\nเคลือบแก้วพิเศษ', subtitle: 'ราคาเจ้าถิ่น', description: 'แฟรนไชส์นครศรีธรรมราชกำหนดแพ็กเกจเคลือบแก้วราคาพิเศษ', discountBadge: 'พิเศษ', validUntil: '15 ส.ค. 2026', conditions: ['เฉพาะสาขานครศรีฯ', 'จองล่วงหน้า 1 วัน'], gradient: 'from-amber-500 via-amber-600 to-orange-700', patternOpacity: 0.12 },
  { id: 'pr_c7_1', branchIds: ['c7'], title: 'อุทัยธานี\nล้างเช้าราคาดี', subtitle: 'ก่อน 10:00 น.', description: 'เจ้าของแฟรนไชส์อุทัยธานีส่งเสริมลูกค้าช่วงเช้า', discountBadge: 'เช้า', validUntil: '30 พ.ย. 2026', conditions: ['เข้าระหว่าง 06:00-10:00', 'เฉพาะสาขาอุทัยธานี'], gradient: 'from-sky-600 via-blue-700 to-indigo-800', patternOpacity: 0.1 },
  { id: 'pr_b1_1', branchIds: ['b1'], title: 'มอไซค์ พระราม 9\n30 บาท', subtitle: 'ราคาจากแฟรนไชส์จุดนี้', description: 'ล้างมอเตอร์ไซค์อัตโนมัติ ราคาโปรเฉพาะสาขาพระราม 9 (มอไซค์)', discountBadge: '30฿', validUntil: '30 มิ.ย. 2026', conditions: ['เฉพาะมอเตอร์ไซค์', 'สาขาพระราม 9 มอไซค์เท่านั้น'], gradient: 'from-orange-500 via-orange-600 to-red-600', patternOpacity: 0.1 },
  { id: 'pr_b2_1', branchIds: ['b2'], title: 'พระราม 4 ปตท.\nล้างฟรีครั้งที่ 10', subtitle: 'สะสมที่สาขานี้', description: 'นับเฉพาะการล้างที่สาขาปตท. พระราม 4 — แต่ละแฟรนไชส์กำหนดโปรต่างกันได้', discountBadge: '10 ฟรี', validUntil: '31 ธ.ค. 2026', conditions: ['สะสม 9 ครั้งที่สาขานี้', 'ครั้งที่ 10 ฟรี'], gradient: 'from-app-red via-red-600 to-app-red-dark', patternOpacity: 0.06 },
  { id: 'pr_b3_1', branchIds: ['b3'], title: 'ท่าพระ มอไซค์\nแพ็กเดือน', subtitle: 'ไม่จำกัดครั้ง (ตามเงื่อนไข)', description: 'แพ็กรายเดือนจากเจ้าของแฟรนไชส์สาขาท่าพระ', discountBadge: 'แพ็ก', validUntil: '1 ก.ค. 2026', conditions: ['สมัครที่หน้าร้าน', 'เฉพาะสาขาท่าพระ มอไซค์'], gradient: 'from-violet-600 via-purple-700 to-fuchsia-800', patternOpacity: 0.1 },
  { id: 'pr_b4_1', branchIds: ['b4'], title: 'ชลบุรี มอไซค์\nล้างคู่ถูกลง', subtitle: '2 คันในรอบเดียวกัน', description: 'โปรเฉพาะแฟรนไชส์ชลบุรี (มอไซค์)', discountBadge: '2 คัน', validUntil: '31 ส.ค. 2026', conditions: ['ทั้ง 2 คันต้องอยู่ในคิวเดียวกัน'], gradient: 'from-teal-600 via-cyan-700 to-blue-800', patternOpacity: 0.1 },
  { id: 'pr_b5_1', branchIds: ['b5'], title: 'ภูเก็ต\nโปรฤดูท่องเที่ยว', subtitle: 'สูงฤดูราคาพิเศษ', description: 'แฟรนไชส์ภูเก็ตปรับโปรตามฤดูกาล — ไม่เหมือนสาขาอื่น', discountBadge: 'ฤดูทอง', validUntil: '15 เม.ย. 2027', conditions: ['ตามประกาศหน้าร้าน', 'เฉพาะสาขาภูเก็ต'], gradient: 'from-amber-400 via-orange-500 to-rose-600', patternOpacity: 0.15 },
  { id: 'pr_b6_1', branchIds: ['b6'], title: 'แม่สอด\nล้างหลังด่าน', subtitle: 'คนใช้เส้นทางชายแดน', description: 'โปรจากแฟรนไชส์แม่สอด — พ้อยท์สะสมยังใช้ร่วมกับเครือได้', discountBadge: 'พิเศษ', validUntil: '30 ก.ย. 2026', conditions: ['เฉพาะสาขาแม่สอด', 'แสดงสลิปตามเงื่อนไขสาขา'], gradient: 'from-stone-600 via-neutral-700 to-zinc-900', patternOpacity: 0.12 },
];

export function getCouponsForBranch(branchId: string): Omit<BranchCoupon, 'branchIds'>[] {
  return ALL_BRANCH_COUPONS.filter(c => c.branchIds.includes(branchId)).map(({ branchIds: _, ...rest }) => rest);
}

export function getPromotionsForBranch(branchId: string): Omit<BranchPromotion, 'branchIds'>[] {
  return ALL_BRANCH_PROMOTIONS.filter(p => p.branchIds.includes(branchId)).map(({ branchIds: _, ...rest }) => rest);
}
