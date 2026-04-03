import React, { useState, createContext, useContext } from 'react';
import { I8 } from './adminIcons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  ALL_USERS, MOCK_ADMIN, MOCK_BRANCHES, MOCK_MACHINES, MOCK_SESSIONS,
  MOCK_REVENUE, MOCK_PACKAGE_STATS, getOverviewStats,
  type AdminUser, type AdminRole
} from './data';

type Page = 'dashboard' | 'branches' | 'machines' | 'sessions' | 'settings';

// ─── Auth Context ────────────────────────────────────
interface AuthCtx { user: AdminUser; isHQ: boolean; branchIds: string[]; }
const AuthContext = createContext<AuthCtx>({ user: MOCK_ADMIN, isHQ: true, branchIds: [] });
const useAuth = () => useContext(AuthContext);

// ─── Helpers ─────────────────────────────────────────
function roleMeta(role: AdminRole) {
  switch (role) {
    case 'hq_admin':        return { label: 'HQ Admin',           badgeClass: 'bg-gray-900 text-white border-gray-900' };
    case 'franchise_owner': return { label: 'เจ้าของแฟรนไชส์',    badgeClass: 'bg-gray-200 text-gray-800 border-gray-300' };
    case 'branch_manager':  return { label: 'ผู้จัดการสาขา',       badgeClass: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'idle':        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">ว่าง</Badge>;
    case 'reserved':    return <Badge className="bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50">รอเริ่มล้าง</Badge>;
    case 'washing':     return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">กำลังล้าง</Badge>;
    case 'maintenance': return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">ซ่อม</Badge>;
    case 'offline':     return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">Offline</Badge>;
    case 'in_progress': return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">กำลังล้าง</Badge>;
    case 'completed':   return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">เสร็จสิ้น</Badge>;
    default:            return <Badge variant="secondary">{status}</Badge>;
  }
}

// ─── Login Page ──────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (user: AdminUser) => void }) {
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser>(MOCK_ADMIN);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(selectedUser); }, 700);
  };

  const rm = roleMeta(selectedUser.role);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Left panel - Brand */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] min-h-screen bg-gray-900 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <I8 name="water" size={24} className="invert brightness-200" />
          </div>
          <span className="text-white font-black text-xl tracking-tight">ROBOSS</span>
        </div>
        <div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Franchise<br />Management<br />System
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            จัดการสาขา, ติดตามเครื่อง IoT, ดูรายได้แบบ Real-time สำหรับ ROBOSS ทุกสาขาทั่วประเทศ
          </p>
        </div>
        <div className="space-y-3">
          {[{ label: 'สาขาทั่วประเทศ', value: '8 สาขา' }, { label: 'เครื่องทั้งหมด', value: '8 เครื่อง' }, { label: 'Sessions วันนี้', value: '186 ครั้ง' }].map((s, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-t border-gray-700">
              <span className="text-gray-400 text-sm">{s.label}</span>
              <span className="text-white font-bold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
              <I8 name="water" size={20} className="invert brightness-200" />
            </div>
            <span className="text-gray-900 font-black text-lg">ROBOSS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
            <p className="text-gray-500 text-sm mt-1">เลือกบทบาทและกรอกข้อมูลเข้าสู่ระบบ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">เข้าใช้งานในฐานะ</label>
              <div className="relative">
                <button type="button" onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors text-left">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={selectedUser.avatar} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-bold">{selectedUser.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedUser.displayName}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                  <Badge className={`flex-shrink-0 text-[10px] ${rm.badgeClass}`}>{rm.label}</Badge>
                  <I8 name="chevronDown" size={16} className="opacity-40" />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
                    {ALL_USERS.map(u => {
                      const um = roleMeta(u.role);
                      return (
                        <button key={u.uid} type="button" onClick={() => { setSelectedUser(u); setShowDropdown(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${selectedUser.uid === u.uid ? 'bg-gray-100' : ''}`}>
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">{u.displayName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.displayName}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          <Badge className={`text-[10px] ${um.badgeClass}`}>{um.label}</Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">อีเมล</label>
              <Input readOnly value={selectedUser.email} className="bg-gray-50" />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">รหัสผ่าน</label>
              <Input type="password" defaultValue="demo1234" />
            </div>

            {/* Access scope info */}
            {selectedUser.role !== 'hq_admin' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <I8 name="warning" size={16} className="mt-0.5 opacity-70" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">สิทธิ์จำกัด</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    เข้าถึงได้เฉพาะ: {MOCK_BRANCHES.filter(b => selectedUser.branchIds.includes(b.id)).map(b => b.name.replace('ROBOSS ', '')).join(', ')}
                  </p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 text-sm font-semibold">
              {loading ? <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>กำลังเข้าสู่ระบบ...</span> : 'เข้าสู่ระบบ'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────
function Sidebar({ page, onNav, collapsed, onToggle }: { page: Page; onNav: (p: Page) => void; collapsed: boolean; onToggle: () => void }) {
  const { user, isHQ } = useAuth();
  const rm = roleMeta(user.role);
  const menuItems: { id: Page; label: string; icon: Parameters<typeof I8>[0]['name'] }[] = [
    { id: 'dashboard', label: 'ภาพรวม', icon: 'layoutDashboard' },
    { id: 'branches', label: isHQ ? 'จัดการสาขา' : 'ข้อมูลสาขา', icon: 'building' },
    { id: 'machines', label: 'สถานะเครื่อง', icon: 'processor' },
    { id: 'sessions', label: 'รายการล้าง', icon: 'activityHistory' },
    { id: 'settings', label: 'ตั้งค่า', icon: 'gear' },
  ];

  return (
    <aside className={`h-screen flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <I8 name="water" size={16} className="invert brightness-200" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-black text-gray-900 text-base">ROBOSS</span>
            <p className="text-[10px] text-gray-400 -mt-0.5">Admin</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3">
          <Badge className={`w-full justify-center py-1 text-[11px] ${rm.badgeClass}`}>{rm.label}</Badge>
          {user.role !== 'hq_admin' && (
            <p className="text-[10px] text-gray-400 text-center mt-1.5 truncate px-1">
              {MOCK_BRANCHES.filter(b => user.branchIds.includes(b.id)).map(b => b.name.replace('ROBOSS ', '')).join(' / ')}
            </p>
          )}
        </div>
      )}

      <Separator />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {menuItems.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} ${collapsed ? 'justify-center' : ''}`}>
              <I8 name={item.icon} size={18} className={active ? 'opacity-100' : 'opacity-50'} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-gray-100">
        <button onClick={onToggle} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          {collapsed
            ? <I8 name="chevronRight" size={18} className="opacity-50" />
            : <><I8 name="chevronLeft" size={18} className="opacity-50" /><span>ย่อเมนู</span></>
          }
        </button>
      </div>
    </aside>
  );
}

// ─── TopBar ──────────────────────────────────────────
function TopBar({ user, onLogout }: { user: AdminUser; onLogout: () => void }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="relative w-64">
        <I8 name="search" size={16} className="opacity-40 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input placeholder="ค้นหา..." className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-gray-500">
          <I8 name="notification" size={20} className="opacity-60" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gray-900 rounded-full" />
        </Button>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-bold">{user.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-none">{user.displayName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="text-gray-400 hover:text-gray-900 ml-1">
            <I8 name="logout" size={16} className="opacity-60" />
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Stat Card ───────────────────────────────────────
function StatCard({ label, value, unit, change, positive = true, icon, className }: any) {
  return (
    <Card className={className}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="p-2.5 bg-gray-100 rounded-xl">
            <I8 name={icon} size={20} className="opacity-70" />
          </div>
          {change && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
              <I8 name="graph" size={12} className="opacity-60" />{change}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ──────────────────────────────────
function DashboardPage() {
  const { isHQ, branchIds } = useAuth();
  const stats = getOverviewStats(branchIds.length ? branchIds : undefined);
  const myBranches = branchIds.length ? MOCK_BRANCHES.filter(b => branchIds.includes(b.id)) : MOCK_BRANCHES;
  const myMachines = branchIds.length ? MOCK_MACHINES.filter(m => branchIds.includes(m.branchId)) : MOCK_MACHINES;
  const mySessions = branchIds.length ? MOCK_SESSIONS.filter(s => branchIds.includes(s.branchId)) : MOCK_SESSIONS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{isHQ ? 'ภาพรวมระบบ' : `ภาพรวม ${myBranches.map(b => b.name.replace('ROBOSS ', '')).join(' / ')}`}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{isHQ ? 'ข้อมูลสรุปทุกสาขา ROBOSS วันนี้' : 'ข้อมูลสาขาที่คุณรับผิดชอบ'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="รายได้วันนี้" value={stats.totalRevenue.toLocaleString()} unit="บาท" change="+12.5%" icon="dollarBag" />
        <StatCard label="Session วันนี้" value={stats.totalSessions} unit="ครั้ง" change="+8.3%" icon="carService" />
        <StatCard label={isHQ ? 'สาขาเปิด' : 'เครื่องว่าง'} value={isHQ ? `${stats.activeBranches}/${stats.totalBranches}` : `${stats.machinesIdle}/${stats.totalMachines}`} unit={isHQ ? 'สาขา' : 'เครื่อง'} icon="building" />
        <StatCard label="คะแนนรีวิว" value={stats.avgRating} unit="/ 5.0" change="+0.2" icon="star" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">รายได้ 30 วัน</CardTitle>
            <CardDescription>{stats.monthlyRevenue.toLocaleString()} บาท (รวม 30 วัน)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-[2px] h-44">
              {MOCK_REVENUE.map((d, i) => {
                const maxRev = Math.max(...MOCK_REVENUE.map(r => r.revenue));
                return (
                  <div key={i} className="flex-1 rounded-t-sm bg-gray-800 hover:bg-gray-900 transition-colors cursor-pointer opacity-60 hover:opacity-100"
                    style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                    title={`${new Date(d.date).getDate()}/${new Date(d.date).getMonth()+1}: ${d.revenue.toLocaleString()} บาท`} />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>30 วันก่อน</span><span>วันนี้</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">แพ็กเกจนิยม</CardTitle>
            <CardDescription>{MOCK_PACKAGE_STATS.reduce((s, p) => s + p.sessions, 0).toLocaleString()} session รวม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_PACKAGE_STATS.map((pkg, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-700">{pkg.name}</span>
                  <span className="font-bold text-gray-900">{pkg.percentage}%</span>
                </div>
                <Progress value={pkg.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">สถานะเครื่อง</CardTitle>
              <span className="text-xs text-gray-500">{myMachines.length} เครื่อง</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ n: myMachines.filter(m => m.status === 'idle').length, l: 'ว่าง', c: 'bg-emerald-50 text-emerald-700' },
                { n: myMachines.filter(m => m.status === 'washing' || m.status === 'reserved').length, l: 'ใช้งาน', c: 'bg-blue-50 text-blue-700' },
                { n: myMachines.filter(m => ['maintenance','offline'].includes(m.status)).length, l: 'ซ่อม', c: 'bg-gray-100 text-gray-700' }
              ].map((s, i) => (
                <div key={i} className={`text-center p-3 rounded-xl ${s.c}`}>
                  <p className="text-2xl font-bold">{s.n}</p>
                  <p className="text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {myMachines.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'washing' ? 'bg-blue-500 animate-pulse' : m.status === 'reserved' ? 'bg-violet-500' : m.status === 'idle' ? 'bg-emerald-500' : m.status === 'maintenance' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {isHQ && <span className="text-xs text-gray-400">({m.branchName.replace('ROBOSS ', '')})</span>}
                  </div>
                  {statusBadge(m.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Session ล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {mySessions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">ยังไม่มี session</p>
            ) : (
              <div className="space-y-3">
                {mySessions.map(s => {
                  const t = Math.round((Date.now() - s.createdAt.getTime()) / 60000);
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{s.customerName}</span>
                          {statusBadge(s.washStatus)}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.packageName} ({s.carSize}){isHQ ? ` — ${s.branchName.replace('ROBOSS ','')}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{s.totalPrice.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{t < 60 ? `${t} นาที` : `${Math.floor(t/60)} ชม.`} ที่แล้ว</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {myBranches.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">รายได้ตามสาขา (วันนี้)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myBranches.filter(b => b.isActive).map(b => {
              const maxRev = Math.max(...myBranches.map(x => x.todayRevenue));
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{b.name.replace('ROBOSS ', '')}</span>
                    <span className="font-bold text-gray-900">{b.todayRevenue.toLocaleString()} บาท</span>
                  </div>
                  <Progress value={(b.todayRevenue / maxRev) * 100} className="h-2.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Branches Page ───────────────────────────────────
function BranchesPage() {
  const { isHQ, branchIds } = useAuth();
  const [search, setSearch] = useState('');
  const allBranches = branchIds.length ? MOCK_BRANCHES.filter(b => branchIds.includes(b.id)) : MOCK_BRANCHES;
  const filtered = allBranches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.area.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isHQ ? 'จัดการสาขา' : 'ข้อมูลสาขา'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{allBranches.length} สาขา{isHQ ? 'ทั้งหมด' : 'ที่รับผิดชอบ'}</p>
        </div>
        {isHQ && <Button className="bg-gray-900 hover:bg-gray-800 text-white gap-2"><I8 name="plus" size={16} className="invert brightness-200" />เพิ่มสาขาใหม่</Button>}
      </div>

      <div className="relative max-w-sm">
        <I8 name="search" size={16} className="opacity-40 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input placeholder="ค้นหาสาขา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all">ทั้งหมด ({allBranches.length})</TabsTrigger>
          <TabsTrigger value="active">เปิดบริการ ({allBranches.filter(b => b.isActive).length})</TabsTrigger>
          <TabsTrigger value="inactive">ปิดปรับปรุง ({allBranches.filter(b => !b.isActive).length})</TabsTrigger>
        </TabsList>
        {['all','active','inactive'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.filter(b => tab === 'all' ? true : tab === 'active' ? b.isActive : !b.isActive).map(branch => (
                <Card key={branch.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${branch.isActive ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                          <I8 name="building" size={20} className={branch.isActive ? 'opacity-70' : 'opacity-40'} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{branch.name}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <I8 name="mapPin" size={12} className="opacity-40" />
                            <span className="text-xs text-gray-500">{branch.area}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={branch.isActive ? 'default' : 'secondary'} className={branch.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50' : ''}>
                        {branch.isActive ? 'เปิด' : 'ปิด'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><I8 name="clock" size={12} className="opacity-40" />{branch.operatingHours.open}–{branch.operatingHours.close}</span>
                      <span className="flex items-center gap-1"><I8 name="starFilled" size={12} className="opacity-50" />{branch.avgRating}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ v: branch.machineCount, l: 'เครื่อง' }, { v: branch.todaySessions, l: 'session' }, { v: `${(branch.todayRevenue/1000).toFixed(1)}k`, l: 'บาท' }].map((d, i) => (
                        <div key={i} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-base font-bold text-gray-900">{d.v}</p>
                          <p className="text-[10px] text-gray-500">{d.l}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ─── Machines Page ───────────────────────────────────
function MachinesPage() {
  const { isHQ, branchIds } = useAuth();
  const [filter, setFilter] = useState('all');
  const allMachines = branchIds.length ? MOCK_MACHINES.filter(m => branchIds.includes(m.branchId)) : MOCK_MACHINES;
  const filtered = filter === 'all' ? allMachines : allMachines.filter(m => m.status === filter);
  const cnt = { all: allMachines.length, idle: allMachines.filter(m => m.status === 'idle').length, active: allMachines.filter(m => m.status === 'washing' || m.status === 'reserved').length, maintenance: allMachines.filter(m => m.status === 'maintenance').length, offline: allMachines.filter(m => m.status === 'offline').length };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">สถานะเครื่อง IoT</h1>
        <p className="text-sm text-gray-500 mt-0.5">จัดการ ESP32 {isHQ ? 'ทุกสาขา' : 'ของสาขาคุณ'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries({ all: `ทั้งหมด (${cnt.all})`, idle: `ว่าง (${cnt.idle})`, active: `ใช้งาน (${cnt.active})`, maintenance: `ซ่อม (${cnt.maintenance})`, offline: `Offline (${cnt.offline})` }).map(([k, l]) => (
          <Button key={k} variant={filter === k ? 'default' : 'outline'} size="sm" onClick={() => setFilter(k)}
            className={filter === k ? 'bg-gray-900 hover:bg-gray-800 text-white border-0' : 'text-gray-600'}>{l}</Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => {
          const t = Math.round((Date.now() - m.lastHeartbeat.getTime()) / 1000);
          const hb = t < 60 ? `${t}s ago` : t < 3600 ? `${Math.floor(t/60)}m ago` : `${Math.floor(t/3600)}h ago`;
          return (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${m.status === 'idle' ? 'bg-emerald-50' : m.status === 'washing' ? 'bg-blue-50' : m.status === 'reserved' ? 'bg-violet-50' : m.status === 'maintenance' ? 'bg-amber-50' : 'bg-gray-100'}`}>
                      <I8 name="processor" size={20} className="opacity-60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      <p className="text-xs text-gray-500">{m.branchName}</p>
                    </div>
                  </div>
                  {statusBadge(m.status)}
                </div>

                <div className="space-y-2 mb-4">
                  {[['ESP32 ID', <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{m.espDeviceId}</code>],
                    ['ประเภท', m.type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'],
                    ['ล้างทั้งหมด', `${m.totalWashes.toLocaleString()} ครั้ง`],
                    ['Heartbeat', <span className={`font-medium text-xs ${t > 300 ? 'text-red-600' : 'text-emerald-600'}`}>{hb}</span>],
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{k as string}</span>
                      <span className="text-gray-800">{v as React.ReactNode}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5 h-8"><I8 name="refresh" size={12} className="opacity-50" />Restart</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5 h-8"><I8 name="wrench" size={12} className="opacity-50" />Maintenance</Button>
                  <Button variant="outline" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-700 hover:bg-gray-50"><I8 name="power" size={14} className="opacity-50" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-12">ไม่พบเครื่องที่ตรงกับเงื่อนไข</p>}
      </div>
    </div>
  );
}

// ─── Sessions Page ───────────────────────────────────
function SessionsPage() {
  const { isHQ, branchIds } = useAuth();
  const [tab, setTab] = useState('all');
  const allSessions = branchIds.length ? MOCK_SESSIONS.filter(s => branchIds.includes(s.branchId)) : MOCK_SESSIONS;
  const filtered = tab === 'all' ? allSessions : allSessions.filter(s => s.washStatus === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">รายการล้างรถ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isHQ ? 'ทุกสาขา' : 'สาขาของคุณ'}</p>
        </div>
        <Button variant="outline" className="gap-2 text-sm"><I8 name="download" size={16} className="opacity-50" />Export CSV</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all">ทั้งหมด ({allSessions.length})</TabsTrigger>
          <TabsTrigger value="in_progress">กำลังล้าง ({allSessions.filter(s => s.washStatus === 'in_progress').length})</TabsTrigger>
          <TabsTrigger value="completed">เสร็จสิ้น ({allSessions.filter(s => s.washStatus === 'completed').length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>ลูกค้า</TableHead>
                  {isHQ && <TableHead>สาขา</TableHead>}
                  <TableHead>แพ็กเกจ</TableHead>
                  <TableHead>ราคา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>เวลา</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-12">ยังไม่มี session</TableCell></TableRow>
                )}
                {filtered.map(s => {
                  const t = Math.round((Date.now() - s.createdAt.getTime()) / 60000);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-semibold text-gray-900 text-sm">{s.customerName}</p>
                        <p className="text-xs text-gray-400">{s.id}</p>
                      </TableCell>
                      {isHQ && <TableCell className="text-sm text-gray-600">{s.branchName.replace('ROBOSS ', '')}</TableCell>}
                      <TableCell className="text-sm text-gray-700">{s.packageName} <span className="text-gray-400">({s.carSize})</span></TableCell>
                      <TableCell className="font-semibold text-gray-900 text-sm">{s.totalPrice.toLocaleString()} ฿</TableCell>
                      <TableCell>{statusBadge(s.washStatus)}</TableCell>
                      <TableCell>
                        {s.rating ? <span className="flex items-center gap-1 text-amber-500 text-sm font-medium"><I8 name="starFilled" size={14} className="opacity-70" />{s.rating}</span> : <span className="text-gray-400 text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{t < 60 ? `${t} นาที` : `${Math.floor(t/60)} ชม.`} ที่แล้ว</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-gray-700"><I8 name="eye" size={16} className="opacity-50" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────
function SettingsPage() {
  const { user, isHQ, branchIds } = useAuth();
  const rm = roleMeta(user.role);
  const myBranches = MOCK_BRANCHES.filter(b => branchIds.length ? branchIds.includes(b.id) : true);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ตั้งค่า</h1>
        <p className="text-sm text-gray-500 mt-0.5">โปรไฟล์และสิทธิ์การเข้าถึง</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">โปรไฟล์ผู้ใช้</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gray-200 text-gray-700 text-xl font-bold">{user.displayName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold text-gray-900">{user.displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <Badge className={`mt-1.5 text-xs ${rm.badgeClass}`}>{rm.label}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            {[['UID', user.uid], ['สร้างเมื่อ', user.createdAt.toLocaleDateString('th-TH')], ['Role', user.role]].map(([k, v], i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-medium text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <I8 name="shield" size={16} className="opacity-60" />สิทธิ์การเข้าถึง
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isHQ ? (
            <p className="text-sm text-gray-600">คุณมีสิทธิ์เข้าถึงข้อมูลทุกสาขา และสามารถเพิ่ม/แก้ไข/ลบ สาขา, เครื่อง, แพ็กเกจ ได้ทั้งหมด</p>
          ) : (
            <div className="space-y-2">
              {myBranches.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <I8 name="building" size={20} className="opacity-40" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.address}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────
export function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return <LoginPage onLogin={(u) => setUser(u)} />;

  const isHQ = user.role === 'hq_admin';
  const branchIds = isHQ ? [] : user.branchIds;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage />;
      case 'branches':  return <BranchesPage />;
      case 'machines':  return <MachinesPage />;
      case 'sessions':  return <SessionsPage />;
      case 'settings':  return <SettingsPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isHQ, branchIds }}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar page={page} onNav={setPage} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar user={user} onLogout={() => { setUser(null); setPage('dashboard'); }} />
          <main className="flex-1 overflow-y-auto p-6">{renderPage()}</main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
