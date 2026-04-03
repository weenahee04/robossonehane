// TODO: Wire to admin API when settings endpoints are available.
// Currently using local state only — no matching admin endpoints yet.
import React, { useState } from 'react';
import { Settings, Shield, Bell, Wifi, Database, Save, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';

type Section = 'general' | 'notifications' | 'security' | 'iot' | 'system';

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'general',       label: 'ทั่วไป',           icon: <Settings className="w-4 h-4" />,  desc: 'ข้อมูลระบบและการแสดงผล' },
  { id: 'notifications', label: 'การแจ้งเตือน',      icon: <Bell className="w-4 h-4" />,     desc: 'ตั้งค่าการแจ้งเตือน' },
  { id: 'security',      label: 'ความปลอดภัย',       icon: <Shield className="w-4 h-4" />,   desc: 'RBAC และการเข้าถึง' },
  { id: 'iot',           label: 'IoT & MQTT',        icon: <Wifi className="w-4 h-4" />,     desc: 'การเชื่อมต่อ ESP32' },
  { id: 'system',        label: 'ระบบ',              icon: <Database className="w-4 h-4" />, desc: 'Firebase และ backup' },
];

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-red-500' : 'bg-gray-700'}`}
  >
    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
  </button>
);

const InputField = ({ label, value, type = 'text', hint }: { label: string; value: string; type?: string; hint?: string }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    <input
      type={type}
      defaultValue={value}
      className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
    />
    {hint && <p className="text-[10px] text-gray-600 mt-1">{hint}</p>}
  </div>
);

export function SettingsPage() {
  const [section, setSection] = useState<Section>('general');
  const [saved, setSaved] = useState(false);
  const [notifMachine, setNotifMachine] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifLowRating, setNotifLowRating] = useState(true);
  const [notifDaily, setNotifDaily] = useState(false);
  const [require2FA, setRequire2FA] = useState(false);
  const [autoLogout, setAutoLogout] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div>
        <h2 className="text-2xl font-bold text-white">ตั้งค่าระบบ</h2>
        <p className="text-gray-500 text-sm mt-0.5">จัดการการตั้งค่า ROBOSS Admin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                section === s.id
                  ? 'bg-red-500/15 text-red-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s.icon}
              <div>
                <p>{s.label}</p>
                <p className="text-[10px] text-gray-600 font-normal">{s.desc}</p>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 ml-auto ${section === s.id ? 'text-red-400' : 'text-gray-700'}`} />
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="gradient-card rounded-2xl p-6 space-y-6">
            {section === 'general' && (
              <>
                <h3 className="text-white font-semibold border-b border-gray-800/50 pb-4">ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="ชื่อระบบ" value="ROBOSS Car Wash" />
                  <InputField label="เวอร์ชัน" value="v1.0.0" />
                  <div className="col-span-2">
                    <InputField label="ที่อยู่สำนักงานใหญ่" value="123 ถนนสุขุมวิท กรุงเทพฯ 10110" />
                  </div>
                  <InputField label="อีเมลติดต่อ" value="admin@roboss.co.th" type="email" />
                  <InputField label="เบอร์โทรสนับสนุน" value="02-xxx-xxxx" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Timezone</label>
                  <select className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-700/50 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50">
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">ภาษาเริ่มต้น</label>
                  <select className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-700/50 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50">
                    <option value="th">ภาษาไทย</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </>
            )}

            {section === 'notifications' && (
              <>
                <h3 className="text-white font-semibold border-b border-gray-800/50 pb-4">การแจ้งเตือน</h3>
                <div className="space-y-4">
                  {[
                    { label: 'เครื่อง Offline / ขัดข้อง', desc: 'แจ้งเตือนทันทีเมื่อ ESP32 ไม่ตอบสนอง', value: notifMachine, onChange: () => setNotifMachine(!notifMachine) },
                    { label: 'การชำระเงินผิดพลาด', desc: 'แจ้งเตือนเมื่อ payment webhook ล้มเหลว', value: notifPayment, onChange: () => setNotifPayment(!notifPayment) },
                    { label: 'Rating ต่ำกว่า 3', desc: 'แจ้งเตือนเมื่อลูกค้าให้คะแนนต่ำ', value: notifLowRating, onChange: () => setNotifLowRating(!notifLowRating) },
                    { label: 'รายงานสรุปรายวัน', desc: 'ส่งรายงานรายได้สรุปทุกเช้า 08:00 น.', value: notifDaily, onChange: () => setNotifDaily(!notifDaily) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-gray-700/30">
                      <div>
                        <p className="text-sm text-white font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle checked={item.value} onChange={item.onChange} />
                    </div>
                  ))}
                </div>
                <div className="space-y-4 pt-2">
                  <InputField label="LINE Notify Token (สำหรับแจ้งเตือน)" value="xxxxxxxxxxxxxxxxxxxx" type="password" hint="ใช้สำหรับส่งแจ้งเตือนไปยัง LINE Group" />
                  <InputField label="Slack Webhook URL (optional)" value="" hint="นำ webhook URL จาก Slack App มาวางที่นี่" />
                </div>
              </>
            )}

            {section === 'security' && (
              <>
                <h3 className="text-white font-semibold border-b border-gray-800/50 pb-4">ความปลอดภัย & การเข้าถึง</h3>
                <div className="space-y-4">
                  {[
                    { label: 'บังคับใช้ 2FA สำหรับ HQ Admin', desc: 'ต้องการ OTP เพิ่มเมื่อล็อกอิน', value: require2FA, onChange: () => setRequire2FA(!require2FA) },
                    { label: 'Auto Logout หลังไม่ใช้งาน 30 นาที', desc: 'ออกจากระบบอัตโนมัติเพื่อความปลอดภัย', value: autoLogout, onChange: () => setAutoLogout(!autoLogout) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-gray-700/30">
                      <div>
                        <p className="text-sm text-white font-medium">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle checked={item.value} onChange={item.onChange} />
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Admin Roles (RBAC)</p>
                      <p className="text-xs text-amber-400/60 mt-1">
                        การจัดการ Role ผู้ใช้ ต้องทำผ่าน Firebase Console &gt; Authentication หรือ Cloud Functions
                        เพื่อความปลอดภัย
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'iot' && (
              <>
                <h3 className="text-white font-semibold border-b border-gray-800/50 pb-4">การตั้งค่า IoT & MQTT</h3>
                <div className="grid gap-4">
                  <InputField label="MQTT Broker Host" value="mqtt.hivemq.com" hint="HiveMQ Cloud หรือ broker ของคุณ" />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="MQTT Port" value="8883" />
                    <InputField label="MQTT Topic Prefix" value="roboss/" />
                  </div>
                  <InputField label="MQTT Username" value="roboss_admin" />
                  <InputField label="MQTT Password" value="••••••••••••" type="password" />
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-blue-400 font-medium mb-2">Topic Structure</p>
                    <div className="space-y-1 font-mono text-[10px] text-gray-400">
                      <p>roboss/<span className="text-blue-400">{'{branchId}'}</span>/<span className="text-green-400">{'{machineId}'}</span>/command</p>
                      <p>roboss/<span className="text-blue-400">{'{branchId}'}</span>/<span className="text-green-400">{'{machineId}'}</span>/status</p>
                      <p>roboss/<span className="text-blue-400">{'{branchId}'}</span>/<span className="text-green-400">{'{machineId}'}</span>/heartbeat</p>
                    </div>
                  </div>
                  <InputField label="Heartbeat Timeout (วินาที)" value="60" hint="ถ้าไม่ได้รับ heartbeat นานกว่านี้ ถือว่า Offline" />
                </div>
              </>
            )}

            {section === 'system' && (
              <>
                <h3 className="text-white font-semibold border-b border-gray-800/50 pb-4">ระบบ & Firebase</h3>
                <div className="grid gap-4">
                  <InputField label="Firebase Project ID" value="roboss-app-prod" />
                  <InputField label="Firebase Region" value="asia-southeast1" hint="ใช้สำหรับ Cloud Functions" />
                  <InputField label="PromptPay Verification Endpoint" value="https://asia-southeast1-roboss-app-prod.cloudfunctions.net/verifyPayment" hint="Cloud Function endpoint สำหรับยืนยันการชำระเงิน" />
                </div>
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">สถานะระบบ</p>
                  {[
                    { label: 'Firebase Firestore', status: 'operational' },
                    { label: 'Firebase Auth', status: 'operational' },
                    { label: 'Cloud Functions', status: 'operational' },
                    { label: 'MQTT Broker', status: 'degraded' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-gray-700/30">
                      <span className="text-sm text-gray-300">{item.label}</span>
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${
                        item.status === 'operational' ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'operational' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
                        }`} />
                        {item.status === 'operational' ? 'ปกติ' : 'ช้า'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800/50">
              {saved && (
                <span className="flex items-center gap-1.5 text-green-400 text-sm animate-fade-in">
                  <CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว
                </span>
              )}
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                <Save className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
