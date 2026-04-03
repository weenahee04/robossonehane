import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getIconUrl, type IconName } from '../services/icons';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

const navItems: NavItem[] = [
  { path: '/', label: 'หน้าหลัก', icon: 'home' },
  { path: '/carwash', label: 'ล้างรถ', icon: 'car' },
  { path: '/notification', label: 'แจ้งเตือน', icon: 'bell' },
  { path: '/history', label: 'ประวัติ', icon: 'receipt' },
  { path: '/profile', label: 'โปรไฟล์', icon: 'user' },
];

interface BottomNavBarProps {
  active: string;
  onNavigate?: (view: string) => void;
  notificationCount?: number;
}

export function BottomNavBar({ active, notificationCount = 0 }: BottomNavBarProps) {
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav sticky bottom-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md border-t border-white/5 px-1 pt-2 pb-0.5 flex items-start justify-around">
      {navItems.map((item) => {
        const isActive = active === item.path;
        const badgeCount = item.path === '/notification' ? notificationCount : 0;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-0 flex-1 transition-colors"
          >
            <div className="relative">
              <div className={`w-6 h-6 flex items-center justify-center transition-all duration-200 ${isActive ? '' : 'opacity-40'}`}>
                <img
                  src={getIconUrl(item.icon, 48)}
                  alt={item.label}
                  width={22}
                  height={22}
                  className="inline-block"
                  style={{
                    filter: isActive
                      ? 'invert(30%) sepia(100%) saturate(3000%) hue-rotate(350deg) brightness(95%)'
                      : 'invert(1) brightness(1.1)',
                  }}
                />
              </div>
              {badgeCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1.5 w-4 h-4 bg-app-red text-white text-[8px] font-bold rounded-full flex items-center justify-center"
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </motion.span>
              )}
            </div>
            <span className={`text-[10px] leading-tight transition-colors truncate max-w-full ${isActive ? 'text-app-red font-bold' : 'text-gray-500'}`}>
              {item.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-0.5 w-8 h-0.5 bg-app-red rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
