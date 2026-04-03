import React from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import type { AdminUser, BranchOption } from '@/services/api';

interface TopBarProps {
  user: AdminUser;
  branches: BranchOption[];
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string | null) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({
  user,
  branches,
  selectedBranchId,
  onSelectBranch,
  onLogout,
  onToggleSidebar,
}: TopBarProps) {
  const branchOptions =
    user.role === 'hq_admin'
      ? branches
      : branches.filter((branch) => user.branchIds.includes(branch.id));

  return (
    <header className="flex h-16 items-center justify-between border-b border-red-950/60 bg-black/65 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs tracking-[0.24em] text-red-200/55">ระบบจัดการหลังบ้าน</p>
          <p className="text-sm font-medium text-white">
            {user.role === 'hq_admin'
              ? 'ควบคุมภาพรวม เปรียบเทียบสาขา และตั้งค่านโยบายจากส่วนกลาง'
              : 'พื้นที่ปฏิบัติการของสาขาตามสิทธิ์ที่ได้รับ'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={selectedBranchId ?? ''}
          onChange={(event) => onSelectBranch(event.target.value || null)}
          className="rounded-xl border border-red-950/60 bg-zinc-950 px-3 py-2 text-sm text-gray-200 focus:border-red-500/50 focus:outline-none"
        >
          {user.role === 'hq_admin' && <option value="">ทุกสาขา</option>}
          {branchOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName || branch.name}
            </option>
          ))}
        </select>

          <button className="relative rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900" />
          </button>

        <div className="flex items-center gap-3 border-l border-gray-800 pl-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-[10px] text-gray-500">{user.email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 text-sm font-semibold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
