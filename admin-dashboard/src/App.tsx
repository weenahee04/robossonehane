import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { BranchesPage } from './pages/BranchesPage';
import { CouponsPage } from './pages/CouponsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackInboxPage } from './pages/FeedbackInboxPage';
import { LoginPage } from './pages/LoginPage';
import { MachinesPage } from './pages/MachinesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PackagesPage } from './pages/PackagesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { RevenuePage } from './pages/RevenuePage';
import { RewardsPage } from './pages/RewardsPage';
import { SessionsPage } from './pages/SessionsPage';
import api, { type AdminMeta, type AdminUser, type BranchOption } from './services/api';

export type PageName =
  | 'dashboard'
  | 'branches'
  | 'admins'
  | 'policies'
  | 'coupons'
  | 'promotions'
  | 'notifications'
  | 'packages'
  | 'payments'
  | 'rewards'
  | 'machines'
  | 'sessions'
  | 'customers'
  | 'revenue'
  | 'feedback';

function getDefaultBranchSelection(admin: AdminUser | null, branches: BranchOption[]) {
  if (!admin) {
    return null;
  }

  if (admin.role === 'hq_admin') {
    return null;
  }

  return admin.branchIds[0] ?? branches[0]?.id ?? null;
}

export function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  async function bootstrapSession() {
    const admin = await api.getCurrentAdmin();
    if (!admin) {
      setCurrentUser(null);
      setMeta(null);
      setSelectedBranchId(null);
      setIsBootstrapping(false);
      return;
    }

    const nextMeta = await api.fetchMeta();
    setCurrentUser(nextMeta.admin);
    setMeta(nextMeta);
    setSelectedBranchId((current) => {
      if (current && nextMeta.branches.some((branch) => branch.id === current)) {
        return current;
      }
      return getDefaultBranchSelection(nextMeta.admin, nextMeta.branches);
    });
    setIsBootstrapping(false);
  }

  useEffect(() => {
    void bootstrapSession();
  }, []);

  const visibleBranchIds = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (selectedBranchId) {
      return [selectedBranchId];
    }

    if (currentUser.role === 'hq_admin') {
      return meta?.branches.map((branch) => branch.id) ?? [];
    }

    return currentUser.branchIds;
  }, [currentUser, meta?.branches, selectedBranchId]);

  if (isBootstrapping) {
    return <div className="min-h-screen bg-[linear-gradient(180deg,#050505_0%,#140808_100%)]" />;
  }

  if (!currentUser || !meta) {
    return (
      <LoginPage
        onLogin={async () => {
          setIsBootstrapping(true);
          await bootstrapSession();
        }}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage admin={currentUser} branchId={selectedBranchId} />;
      case 'branches':
        return (
          <BranchesPage
            admin={currentUser}
            branchId={selectedBranchId}
            branches={meta.branches}
            onBranchesChanged={async () => {
              const nextMeta = await api.fetchMeta();
              setMeta(nextMeta);
            }}
          />
        );
      case 'admins':
        return <AdminUsersPage admin={currentUser} branches={meta.branches} />;
      case 'policies':
        return <PoliciesPage admin={currentUser} branches={meta.branches} />;
      case 'coupons':
        return <CouponsPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      case 'promotions':
        return <PromotionsPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      case 'notifications':
        return <NotificationsPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      case 'packages':
        return <PackagesPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      case 'payments':
        return <PaymentsPage admin={currentUser} branchId={selectedBranchId} />;
      case 'rewards':
        return <RewardsPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      case 'machines':
        return <MachinesPage admin={currentUser} branchId={selectedBranchId} realtimeBranchIds={visibleBranchIds} />;
      case 'sessions':
        return <SessionsPage admin={currentUser} branchId={selectedBranchId} realtimeBranchIds={visibleBranchIds} />;
      case 'revenue':
        return <RevenuePage admin={currentUser} branchId={selectedBranchId} />;
      case 'customers':
        return <CustomersPage admin={currentUser} branchId={selectedBranchId} />;
      case 'feedback':
        return <FeedbackInboxPage admin={currentUser} branchId={selectedBranchId} branches={meta.branches} />;
      default:
        return <DashboardPage admin={currentUser} branchId={selectedBranchId} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[linear-gradient(180deg,#050505_0%,#140808_100%)]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={currentUser}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          user={currentUser}
          branches={meta.branches}
          selectedBranchId={selectedBranchId}
          onSelectBranch={setSelectedBranchId}
          onLogout={() => {
            api.logout();
            setCurrentUser(null);
            setMeta(null);
            setSelectedBranchId(null);
          }}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto p-6">{renderPage()}</main>
      </div>
    </div>
  );
}
