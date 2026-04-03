import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountAction, useUpdateUserSettings, useUserSettings } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { getIconUrl, type IconName } from '@/services/icons';

const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';
const SETTINGS_STORAGE_KEY = 'roboss_user_settings_fallback';
const APP_VERSION = 'v1.0.0';

function Ico({ id, size = 20, className = '' }: { id: string | number; size?: number; className?: string }) {
  return <img src={`${ICONS8_BASE}${size * 2}&id=${id}`} width={size} height={size} alt="" className={`inline-block flex-shrink-0 ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} loading="lazy" />;
}

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size} className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />;
}

interface SettingItem {
  iconId: number;
  label: string;
  description?: string;
  type: 'toggle' | 'link' | 'danger';
  key: string;
  value?: string;
}

type ToggleKey = 'notify_general' | 'notify_wash' | 'notify_coupon' | 'notify_points';
type ToggleState = Record<ToggleKey, boolean>;
type LocaleValue = 'th' | 'en';

const defaultToggles: ToggleState = {
  notify_general: true,
  notify_wash: true,
  notify_coupon: true,
  notify_points: false,
};

const localeLabels: Record<LocaleValue, string> = {
  th: 'ไทย',
  en: 'English',
};

function loadFallbackSettings() {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return { toggles: defaultToggles, locale: 'th' as LocaleValue };
  }

  try {
    const parsed = JSON.parse(raw) as { toggles?: ToggleState; locale?: LocaleValue };
    return {
      toggles: parsed.toggles ?? defaultToggles,
      locale: parsed.locale ?? 'th',
    };
  } catch {
    return { toggles: defaultToggles, locale: 'th' as LocaleValue };
  }
}

function saveFallbackSettings(toggles: ToggleState, locale: LocaleValue) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ toggles, locale }));
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const useApi = Boolean(import.meta.env.VITE_API_URL);
  const settingsQuery = useUserSettings(useApi);
  const updateSettingsMutation = useUpdateUserSettings();
  const accountActionMutation = useAccountAction();
  const [toggles, setToggles] = useState<ToggleState>(defaultToggles);
  const [locale, setLocale] = useState<LocaleValue>('th');
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (useApi) {
      if (!settingsQuery.data) {
        return;
      }

      setToggles({
        notify_general: settingsQuery.data.notificationGeneral,
        notify_wash: settingsQuery.data.notificationWash,
        notify_coupon: settingsQuery.data.notificationCoupon,
        notify_points: settingsQuery.data.notificationPoints,
      });
      setLocale(settingsQuery.data.locale);
      setSettingsError(null);
      return;
    }

    const fallback = loadFallbackSettings();
    setToggles(fallback.toggles);
    setLocale(fallback.locale);
  }, [settingsQuery.data, useApi]);

  const settingSections: { title: string; items: SettingItem[] }[] = useMemo(() => [
    {
      title: 'การแจ้งเตือน',
      items: [
        { iconId: 2580, label: 'แจ้งเตือนทั่วไป', description: 'โปรโมชั่น ข่าวสาร', type: 'toggle', key: 'notify_general' },
        { iconId: 25107, label: 'สถานะล้างรถ', description: 'แจ้งเตือนเมื่อล้างเสร็จ', type: 'toggle', key: 'notify_wash' },
        { iconId: 12394, label: 'คูปองใหม่', description: 'แจ้งเตือนคูปองส่วนลด', type: 'toggle', key: 'notify_coupon' },
        { iconId: 6703, label: 'คะแนนสะสม', description: 'เมื่อได้รับหรือใกล้หมดอายุ', type: 'toggle', key: 'notify_points' },
      ],
    },
    {
      title: 'ทั่วไป',
      items: [
        { iconId: 484, label: 'ภาษา', value: localeLabels[locale], type: 'link', key: 'language' },
        { iconId: 1358, label: 'ข้อมูลส่วนตัว', type: 'link', key: 'profile' },
        { iconId: 2864, label: 'ความเป็นส่วนตัว', type: 'link', key: 'privacy' },
      ],
    },
    {
      title: 'เกี่ยวกับ',
      items: [
        { iconId: 1168, label: 'เวอร์ชันแอป', value: APP_VERSION, type: 'link', key: 'version' },
        { iconId: 1804, label: 'ข้อกำหนดการใช้งาน', type: 'link', key: 'terms' },
        { iconId: 646, label: 'ช่วยเหลือ', type: 'link', key: 'help' },
      ],
    },
    {
      title: 'บัญชี',
      items: [
        { iconId: 1571, label: 'ออกจากระบบ', type: 'danger', key: 'logout' },
        { iconId: 6861, label: 'ลบบัญชี', description: 'ปิดการใช้งานหรือลบบัญชีของคุณ', type: 'danger', key: 'delete' },
      ],
    },
  ], [locale]);

  const enabledCount = Object.values(toggles).filter(Boolean).length;

  const persistSettings = async (nextToggles: ToggleState, nextLocale: LocaleValue) => {
    if (useApi) {
      await updateSettingsMutation.mutateAsync({
        notificationGeneral: nextToggles.notify_general,
        notificationWash: nextToggles.notify_wash,
        notificationCoupon: nextToggles.notify_coupon,
        notificationPoints: nextToggles.notify_points,
        locale: nextLocale,
      });
      return;
    }

    saveFallbackSettings(nextToggles, nextLocale);
  };

  const handleToggle = async (key: ToggleKey) => {
    const previous = toggles;
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    setSettingsError(null);

    try {
      await persistSettings(next, locale);
    } catch {
      setToggles(previous);
      setSettingsError('บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleLocaleChange = async (nextLocale: LocaleValue) => {
    const previousLocale = locale;
    setLocale(nextLocale);
    setSettingsError(null);

    try {
      await persistSettings(toggles, nextLocale);
      setShowLanguageDialog(false);
    } catch {
      setLocale(previousLocale);
      setSettingsError('เปลี่ยนภาษาไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleLinkAction = (key: string) => {
    if (key === 'profile') {
      navigate('/profile');
      return;
    }
    if (key === 'privacy') {
      navigate('/legal/privacy');
      return;
    }
    if (key === 'terms') {
      navigate('/legal/terms');
      return;
    }
    if (key === 'help') {
      navigate('/faq');
      return;
    }
    if (key === 'language') {
      setShowLanguageDialog(true);
      return;
    }
    if (key === 'version') {
      setShowVersionDialog(true);
    }
  };

  const handleDangerAction = async (key: string) => {
    if (key === 'logout') {
      await logout();
      return;
    }

    setShowAccountDialog(true);
  };

  const handleAccountAction = async (action: 'deactivate' | 'delete') => {
    setSettingsError(null);

    try {
      await accountActionMutation.mutateAsync(action);
      setShowAccountDialog(false);
      await logout();
    } catch {
      setSettingsError(action === 'delete' ? 'ลบบัญชีไม่สำเร็จ กรุณาลองใหม่' : 'ปิดการใช้งานบัญชีไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
  const itemVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } } };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white -ml-2">
          <I8Icon name="back" size={20} />
        </Button>
        <h1 className="text-white font-bold text-base">ตั้งค่า</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="px-4 pt-4 pb-6 space-y-4">
          {settingsError && (
            <motion.div variants={itemVariants}>
              <Card className="p-3 border-red-500/20 bg-red-500/5">
                <p className="text-red-300 text-xs">{settingsError}</p>
              </Card>
            </motion.div>
          )}

          {settingSections.map((section, sectionIndex) => (
            <motion.div key={sectionIndex} variants={itemVariants} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-white/30 text-[11px] font-medium tracking-wider uppercase">{section.title}</p>
                {section.title === 'การแจ้งเตือน' && (
                  <Badge variant="outline" className="text-[9px] border-app-red/20 text-app-red">{enabledCount}/4 เปิด</Badge>
                )}
              </div>

              <Card className="p-0 overflow-hidden border-white/5">
                {section.items.map((item, itemIndex) => (
                  <div key={item.key}>
                    {itemIndex > 0 && <div className="mx-3 h-[1px] bg-white/[0.04]" />}
                    <button
                      type="button"
                      onClick={() => {
                        if (item.type === 'toggle') {
                          void handleToggle(item.key as ToggleKey);
                          return;
                        }
                        if (item.type === 'link') {
                          handleLinkAction(item.key);
                          return;
                        }
                        void handleDangerAction(item.key);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-white/[0.02] transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        item.type === 'danger'
                          ? 'bg-app-red/10 border border-app-red/15'
                          : item.type === 'toggle' && toggles[item.key as ToggleKey]
                            ? 'bg-app-red/10 border border-app-red/15'
                            : 'bg-black border border-white/10'
                      }`}>
                        <Ico id={item.iconId} size={15} className={item.type === 'danger' ? 'opacity-80' : ''} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium ${item.type === 'danger' ? 'text-red-400' : 'text-white'}`}>{item.label}</p>
                        {item.description && (
                          <p className="text-[10px] text-white/20 mt-0.5">{item.description}</p>
                        )}
                      </div>

                      {item.type === 'toggle' && (
                        <Switch
                          checked={toggles[item.key as ToggleKey] ?? false}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => void handleToggle(item.key as ToggleKey)}
                          disabled={updateSettingsMutation.isPending}
                        />
                      )}
                      {item.type === 'link' && (
                        <div className="flex items-center gap-1.5">
                          {item.value && (
                            <span className="text-white/25 text-[11px]">{item.value}</span>
                          )}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/15 flex-shrink-0">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </div>
                      )}
                      {item.type === 'danger' && item.key !== 'delete' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400/30 flex-shrink-0">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </Card>
            </motion.div>
          ))}

          <motion.div variants={itemVariants} className="text-center pt-2 pb-4">
            <p className="text-white/10 text-[10px]">ROBOSS Mini App</p>
            <p className="text-white/[0.06] text-[9px] mt-0.5">© 2024 ROBOSS. All rights reserved.</p>
          </motion.div>
        </motion.div>
      </div>

      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">เลือกภาษา</DialogTitle>
            <DialogDescription className="text-white/40 text-[13px]">
              ภาษาที่เลือกจะใช้กับเมนูและข้อความหลักของแอป
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(['th', 'en'] as LocaleValue[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleLocaleChange(value)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  locale === value ? 'border-app-red/40 bg-app-red/10 text-white' : 'border-white/10 bg-white/[0.02] text-white/60'
                }`}
              >
                {localeLabels[value]}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">เวอร์ชันแอป</DialogTitle>
            <DialogDescription className="text-white/40 text-[13px]">
              ROBOSS Mini App {APP_VERSION}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-white/60">
            <p>Build channel: customer app</p>
            <p>Environment: {import.meta.env.MODE}</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="w-full border-white/10 text-white">ปิด</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent className="max-w-[90%] rounded-2xl bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-2">
              <Ico id={6861} size={22} />
            </div>
            <DialogTitle className="text-red-400 text-center">จัดการบัญชี</DialogTitle>
            <DialogDescription className="text-center text-white/40 text-[13px]">
              คุณสามารถปิดการใช้งานบัญชีชั่วคราว หรือลบบัญชีเพื่อยุติการใช้งานและออกจากระบบทันที
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full border-white/10 text-white"
              onClick={() => void handleAccountAction('deactivate')}
              disabled={accountActionMutation.isPending}
            >
              {accountActionMutation.isPending ? 'กำลังดำเนินการ...' : 'ปิดการใช้งานบัญชี'}
            </Button>
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => void handleAccountAction('delete')}
              disabled={accountActionMutation.isPending}
            >
              {accountActionMutation.isPending ? 'กำลังดำเนินการ...' : 'ลบบัญชี'}
            </Button>
          </div>
          <DialogFooter className="flex-row gap-2 mt-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 border-white/10 text-white">ยกเลิก</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
