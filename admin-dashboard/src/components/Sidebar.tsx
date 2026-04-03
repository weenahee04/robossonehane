import React from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  Bell,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Gift,
  Droplets,
  Megaphone,
  MessageSquareMore,
  History,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  TicketPercent,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { PageName } from '@/App';
import type { AdminUser } from '@/services/api';

interface SidebarProps {
  currentPage: PageName;
  onNavigate: (page: PageName) => void;
  collapsed: boolean;
  onToggle: () => void;
  user: AdminUser;
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggle, user }: SidebarProps) {
  const baseItems: Array<{ id: PageName; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { id: 'branches', label: user.role === 'hq_admin' ? 'สาขา' : 'ข้อมูลสาขา', icon: Building2 },
    { id: 'coupons', label: 'คูปอง', icon: TicketPercent },
    { id: 'promotions', label: 'โปรโมชั่น', icon: Megaphone },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'packages', label: 'แพ็กเกจ', icon: Package },
    { id: 'payments', label: 'การชำระเงิน', icon: ReceiptText },
    { id: 'rewards', label: 'ของรางวัล', icon: Gift },
    { id: 'machines', label: 'เครื่องล้าง', icon: Cpu },
    { id: 'sessions', label: 'รายการใช้งาน', icon: History },
    { id: 'revenue', label: 'รายได้', icon: TrendingUp },
    { id: 'customers', label: 'ลูกค้า', icon: Users },
    { id: 'feedback', label: 'ข้อเสนอแนะ', icon: MessageSquareMore },
  ];
  const hqItems: Array<{ id: PageName; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'admins', label: 'ผู้ดูแลระบบ', icon: ShieldCheck },
    { id: 'policies', label: 'นโยบาย', icon: SlidersHorizontal },
  ];
  const menuItems = user.role === 'hq_admin' ? [baseItems[0], baseItems[1], ...hqItems, ...baseItems.slice(2)] : baseItems;

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-red-950/60 bg-[linear-gradient(180deg,rgba(12,12,14,0.98),rgba(28,10,10,0.96))] transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-gray-800/50 px-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-black tracking-tight text-white">ROBOSS</h1>
            <p className="text-[10px] text-red-200/55">ศูนย์ควบคุมหลังบ้าน</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 py-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center shadow-[0_0_24px_rgba(239,68,68,0.06)]">
            <span className="text-[10px] font-semibold tracking-[0.18em] text-red-200">
              {user.role === 'hq_admin' ? 'ศูนย์ควบคุม HQ' : 'ปฏิบัติการระดับสาขา'}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 no-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive ? 'bg-red-500/15 text-red-400 shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-red-400')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-red-900/70 bg-black text-red-200 transition-colors hover:bg-red-950 hover:text-white"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="border-t border-gray-800/50 p-3">
        {!collapsed && (
          <p className="text-center text-[9px] text-red-100/35">
            {user.role === 'hq_admin' ? 'มองเห็นและควบคุมทุกสาขา' : 'ควบคุมเฉพาะสาขาที่ได้รับสิทธิ์'}
          </p>
        )}
      </div>
    </aside>
  );
}
