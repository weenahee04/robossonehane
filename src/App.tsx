import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryGrid } from './components/CategoryGrid';
import { BottomNavBar } from './components/BottomNavBar';
import { CarWashFlow } from './pages/CarWashFlow';
import { CouponPage } from './pages/CouponPage';
import { NearbyBranches } from './pages/NearbyBranches';
import { MemberCard } from './pages/MemberCard';
import { PromotionPage } from './pages/PromotionPage';
import { ArticlePage } from './pages/ArticlePage';
import { PiggyBankPage } from './pages/PiggyBankPage';
import { StampPage } from './pages/StampPage';
import { ProfilePage } from './pages/ProfilePage';
import { WashHistoryPage } from './pages/WashHistoryPage';
import { NotificationPage } from './pages/NotificationPage';
import { PointsShopPage } from './pages/PointsShopPage';
import { SettingsPage } from './pages/SettingsPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { FAQPage } from './pages/FAQPage';
import { AddVehiclePage } from './pages/AddVehiclePage';
import { LegalPage } from './pages/LegalPage';
import { ClerkSignInPage } from './pages/ClerkSignInPage';
import { ClerkSignUpPage } from './pages/ClerkSignUpPage';
import { LoadingScreen } from './components/LoadingScreen';
import { CustomerAuthGate } from './components/CustomerAuthGate';
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useApi';

const BOTTOM_NAV_PATHS = ['/', '/carwash', '/notification', '/history', '/profile'];
const PUBLIC_AUTH_PATHS = ['/sign-in', '/sign-up'];
const USE_CLERK_AUTH = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto no-scrollbar pb-2">
        <HeroBanner />
        <CategoryGrid onNavigate={(view) => navigate(`/${view}`)} />
        <div className="h-4" />
      </main>
    </>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const goHome = () => navigate('/');
  const returnPath =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? ((location.state as { from: string }).from || '/profile')
      : '/profile';

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/carwash" element={<CarWashFlow onBack={goHome} />} />
      <Route path="/coupon" element={<CouponPage onBack={goHome} />} />
      <Route path="/branches" element={<NearbyBranches onBack={goHome} />} />
      <Route path="/member" element={<MemberCard onBack={goHome} />} />
      <Route path="/promotion" element={<PromotionPage onBack={goHome} />} />
      <Route path="/article" element={<ArticlePage onBack={goHome} />} />
      <Route path="/piggybank" element={<PiggyBankPage onBack={goHome} />} />
      <Route path="/stamp" element={<StampPage onBack={goHome} />} />
      <Route path="/profile" element={<ProfilePage onBack={goHome} />} />
      <Route path="/history" element={<WashHistoryPage onBack={goHome} />} />
      <Route path="/notification" element={<NotificationPage onBack={goHome} />} />
      <Route path="/pointsshop" element={<PointsShopPage onBack={goHome} />} />
      <Route path="/settings" element={<SettingsPage onBack={goHome} />} />
      <Route path="/feedback" element={<FeedbackPage onBack={goHome} />} />
      <Route
        path="/add-vehicle"
        element={
          <AddVehiclePage
            onBack={() => navigate(returnPath)}
            onSaved={() => navigate(returnPath, { replace: true })}
          />
        }
      />
      <Route
        path="/faq"
        element={<FAQPage onBack={goHome} onNavigateFeedback={() => navigate('/feedback')} />}
      />
      <Route
        path="/legal/:document"
        element={<LegalPage onBack={() => navigate(-1)} />}
      />
      {USE_CLERK_AUTH ? <Route path="/sign-in" element={<ClerkSignInPage />} /> : null}
      {USE_CLERK_AUTH ? <Route path="/sign-up" element={<ClerkSignUpPage />} /> : null}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const usesBackendAuth = Boolean(import.meta.env.VITE_API_URL);
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.includes(location.pathname);
  const notificationQuery = useNotifications(1, usesBackendAuth && isAuthenticated);
  const shouldGateAuth =
    usesBackendAuth &&
    !isLoading &&
    !isAuthenticated &&
    !isPublicAuthPath;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const activeNavTab = BOTTOM_NAV_PATHS.includes(location.pathname)
    ? location.pathname
    : '/';
  const shouldHideBottomNav = isPublicAuthPath;

  if (usesBackendAuth && isLoading && !isPublicAuthPath) {
    return (
      <div className="app-shell">
        <LoadingScreen />
      </div>
    );
  }

  return (
    shouldGateAuth ? (
      <CustomerAuthGate />
    ) : (
      <div className="app-shell">
        {loading && !isPublicAuthPath ? <LoadingScreen /> : null}
        <div className="app-container safe-top">
          <AppRoutes />
          {shouldHideBottomNav ? null : (
            <BottomNavBar active={activeNavTab} notificationCount={notificationQuery.data?.unreadCount ?? 0} />
          )}
        </div>
      </div>
    )
  );
}
