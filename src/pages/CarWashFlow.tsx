import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import carAnimation from '../CarAnimation.json';
import { getIconUrl, type IconName } from '../services/icons';
import { branches } from '../services/mockData';
import { createSession, confirmPayment, listenToSession, rateSession } from '../services/washSession';
import { addPoints, calculatePoints, formatPoints, getUserPoints } from '../services/points';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePointsBalance } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { ALLOW_DEV_API_FAILURE_FALLBACK, HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import { getSessionWashStage } from '../lib/session';
import { useBranch } from '../services/branchContext';
import type { Branch, WashSession } from '../types';
import type { WashFlowIntentCoupon, WashFlowIntentPromotion } from '@/services/washFlowIntent';
import { consumeWashFlowIntent } from '@/services/washFlowIntent';

// Reusable Icons8 icon component - renders monochrome PNG with brightness filter for dark theme
function I8Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <img
      src={getIconUrl(name, size * 2)}
      alt={name}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ filter: 'invert(1) brightness(1.1)' }}
      draggable={false}
    />
  );
}

// Colored variant (with custom filter)
function I8IconColored({ name, size = 24, color, className = '' }: { name: IconName; size?: number; color?: string; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <img
        src={getIconUrl(name, size * 2)}
        alt={name}
        width={size}
        height={size}
        className="inline-block"
        style={{ filter: 'invert(1) brightness(1.1)' }}
        draggable={false}
      />
    </div>
  );
}

type Step = 'scan' | 'select' | 'payment' | 'warning' | 'working' | 'complete';
type CarSize = 'S' | 'M' | 'L';

interface CarWashFlowProps {
  onBack: () => void;
}

const carSizes: { id: CarSize; label: string; desc: string; iconName: IconName }[] = [
  { id: 'S', label: 'S', desc: 'รถเล็ก', iconName: 'sedan' },
  { id: 'M', label: 'M', desc: 'รถกลาง', iconName: 'car' },
  { id: 'L', label: 'L', desc: 'รถใหญ่ / SUV', iconName: 'suv' },
];

const stepIcons: { name: string; iconName: IconName; color: string }[] = [
  { name: 'ฉีดน้ำแรงดันสูง', iconName: 'water', color: '#3B82F6' },
  { name: 'ล้างโฟมสลายคราบ', iconName: 'soap', color: '#F59E0B' },
  { name: 'ขัดล้างอัตโนมัติ', iconName: 'refresh', color: '#F97316' },
  { name: 'เป่าแห้ง', iconName: 'wind', color: '#10B981' },
  { name: 'เคลือบเงา', iconName: 'shine', color: '#8B5CF6' },
];

function normalizeSession(session: WashSession): WashSession {
  return {
    ...session,
    addons: session.addons || [],
  };
}

function normalizeBranchType(branchType?: Branch['type'] | string): 'car' | 'bike' {
  return branchType === 'bike' ? 'bike' : 'car';
}

function matchesBranchMachineType(machine: Branch['machines'][number], branchType: Branch['type'] | string = 'car') {
  if (normalizeBranchType(branchType) === 'bike') {
    return machine.type === 'motorcycle';
  }

  return machine.type === 'car';
}

function findAvailableMachine(branch: Branch) {
  return branch.machines.find(
    (machine) =>
      matchesBranchMachineType(machine, branch.type) &&
      machine.isEnabled !== false &&
      machine.status === 'idle'
  );
}

function buildBranchScanCandidates(params: {
  preferredBranchId?: string;
  branches: Branch[];
}) {
  const { preferredBranchId, branches } = params;
  if (!preferredBranchId) {
    return branches;
  }

  const preferred = branches.find((branch) => branch.id === preferredBranchId);
  const others = branches.filter((branch) => branch.id !== preferredBranchId);
  return preferred ? [preferred, ...others] : branches;
}

function mapBranchToBranchContext(branch: Branch) {
  return {
    id: branch.id,
    name: branch.name,
    shortName: branch.shortName || branch.name.replace('ROBOSS ', ''),
    address: branch.address,
    type: normalizeBranchType(branch.type),
    isOpen: branch.isOpen,
    hours: branch.hours || '06:00 - 22:00',
    mapsUrl: branch.mapsUrl || undefined,
    lat: branch.location?.lat,
    lng: branch.location?.lng,
    promptPayId: branch.promptPayId,
    promptPayName: branch.promptPayName,
    machinesFree: branch.machinesFree,
    machinesTotal: branch.machinesTotal,
  };
}

function resolveCouponDiscount(params: {
  coupon: WashFlowIntentCoupon | null;
  branchId?: string;
  packageId?: string;
  subtotalPrice: number;
}) {
  const { coupon, branchId, packageId, subtotalPrice } = params;
  if (!coupon || subtotalPrice <= 0) {
    return 0;
  }

  if (coupon.branchIds?.length && branchId && !coupon.branchIds.includes(branchId)) {
    return 0;
  }

  if (coupon.packageIds?.length && packageId && !coupon.packageIds.includes(packageId)) {
    return 0;
  }

  if (subtotalPrice < coupon.minSpend) {
    return 0;
  }

  if (coupon.discountType === 'fixed') {
    return Math.min(coupon.discountValue, subtotalPrice);
  }

  if (coupon.discountType === 'percent') {
    return Math.min(Math.floor(subtotalPrice * (coupon.discountValue / 100)), subtotalPrice);
  }

  return 0;
}

export function CarWashFlow({ onBack }: CarWashFlowProps) {
  const { user: authUser, refreshUser } = useAuth();
  const { branch: currentBranch, setBranch: setCurrentBranch } = useBranch();
  const pointsBalanceQuery = usePointsBalance();
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>('scan');
  const [direction, setDirection] = useState(1);

  // Branch & Machine state (from QR scan)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedCoupon, setSelectedCoupon] = useState<WashFlowIntentCoupon | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<WashFlowIntentPromotion | null>(null);

  // Package selection state
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0);
  const [carSize, setCarSize] = useState<CarSize>('M');
  const [addVacuum, setAddVacuum] = useState(false);

  // Payment state
  const [paymentCountdown, setPaymentCountdown] = useState(300); // 5 minutes
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [isStartingWash, setIsStartingWash] = useState(false);

  // Session state
  const [session, setSession] = useState<WashSession | null>(null);

  // Complete state
  const [rating, setRating] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);

  // WebSocket for real-time progress (API mode only)
  const wsHandlerRef = useRef<(data: unknown) => void>(() => {});
  const { connected: wsConnected, subscribeSession } = useWebSocket({
    onMessage: (data) => wsHandlerRef.current(data),
    autoReconnect: HAS_API_BASE_URL,
  });

  useEffect(() => {
    wsHandlerRef.current = (data: unknown) => {
      const msg = data as Record<string, unknown>;
      const isTrackedSession =
        session &&
        ((msg.type === 'session_progress' && msg.sessionId === session.id) ||
          (msg.type === 'session_update' && msg.sessionId === session.id));

      if (isTrackedSession) {
        const sessionPayload =
          msg.type === 'session_update' && msg.session && typeof msg.session === 'object'
            ? (msg.session as Record<string, unknown>)
            : null;
        const machinePayload =
          msg.type === 'session_update' && msg.machine && typeof msg.machine === 'object'
            ? (msg.machine as Record<string, unknown>)
            : null;

        setSession((prev) => {
          if (!prev) return prev;
          return normalizeSession({
            ...prev,
            currentStep:
              (sessionPayload?.currentStep as number) ?? (msg.currentStep as number) ?? prev.currentStep,
            progress: (sessionPayload?.progress as number) ?? (msg.progress as number) ?? prev.progress,
            status:
              (sessionPayload?.status as WashSession['status']) ??
              (msg.sessionStatus as WashSession['status']) ??
              prev.status,
            pointsEarned:
              (sessionPayload?.pointsEarned as number) ?? (msg.pointsEarned as number) ?? prev.pointsEarned,
            payment: prev.payment
              ? {
                  ...prev.payment,
                  status:
                    (sessionPayload?.paymentStatus as NonNullable<WashSession['payment']>['status']) ??
                    prev.payment.status,
                }
              : prev.payment,
            machine: prev.machine
              ? {
                  ...prev.machine,
                  status: (machinePayload?.status as NonNullable<WashSession['machine']>['status']) ?? prev.machine.status,
                  lastHeartbeat:
                    (machinePayload?.lastHeartbeat as string) ?? prev.machine.lastHeartbeat,
                }
              : prev.machine,
          });
        });
        const effectiveMachineStatus =
          (machinePayload?.status as string) ?? (msg.status as string);
        const effectiveProgress =
          (sessionPayload?.progress as number) ?? (msg.progress as number);

        if (effectiveMachineStatus === 'idle' && effectiveProgress === 100) {
          const earned = (msg.pointsEarned as number) ?? session.pointsEarned ?? calculatePoints(session.totalPrice || 0);
          setTimeout(() => {
            goToStep('complete');
            if (HAS_API_BASE_URL) {
              void pointsBalanceQuery.refetch();
              void refreshUser();
            }
            setTimeout(() => {
              setShowPointsAnimation(true);
              animatePointsCounter(earned);
            }, 800);
          }, 600);
        }
      }
    };
  }, [session, goToStep, pointsBalanceQuery, refreshUser]);

  useEffect(() => {
    if (HAS_API_BASE_URL && session && currentStep === 'working' && wsConnected) {
      subscribeSession(session.id);
    }
  }, [session, currentStep, wsConnected, subscribeSession]);

  // Scanning animation
  const [scanPulse, setScanPulse] = useState(false);

  // Get packages for selected branch (exclude addons)
  const mainPackages = selectedBranch?.packages.filter((p) => !['vacuum', 'pkg_vacuum'].includes(p.id)) || [];
  const vacuumPackage = selectedBranch?.packages.find((p) => ['vacuum', 'pkg_vacuum'].includes(p.id));
  const selectedPackage = mainPackages[selectedPackageIndex];
  const selectedMachine = selectedBranch?.machines.find((machine) => machine.id === selectedMachineId) ?? null;

  const subtotalPrice = selectedPackage
    ? selectedPackage.prices[carSize] + (addVacuum && vacuumPackage ? vacuumPackage.prices[carSize] : 0)
    : 0;
  const discountAmount = resolveCouponDiscount({
    coupon: selectedCoupon,
    branchId: selectedBranch?.id,
    packageId: selectedPackage?.id,
    subtotalPrice,
  });
  const totalPrice = Math.max(subtotalPrice - discountAmount, 0);

  useEffect(() => {
    setSelectedPackageIndex(0);
    setAddVacuum(false);
  }, [selectedBranch?.id, selectedMachineId]);

  // Navigate to next step
  function goToStep(step: Step) {
    const stepOrder: Step[] = ['scan', 'select', 'payment', 'warning', 'working', 'complete'];
    const currentIdx = stepOrder.indexOf(currentStep);
    const nextIdx = stepOrder.indexOf(step);
    setDirection(nextIdx > currentIdx ? 1 : -1);
    setCurrentStep(step);
  }

  const resolvePreferredBranch = useCallback(async (preferredBranchId?: string) => {
    if (HAS_API_BASE_URL) {
      const branchList = preferredBranchId
        ? [await api.getBranch(preferredBranchId), ...(await api.getBranches()).filter((branch) => branch.id !== preferredBranchId)]
        : await api.getBranches();
      const branchWithMachine = branchList.find((branch) => findAvailableMachine(branch));
      const machine = branchWithMachine ? findAvailableMachine(branchWithMachine) : null;
      if (!branchWithMachine || !machine) {
        return null;
      }

      const qrData = `roboss://${branchWithMachine.id}/${machine.id}`;
      return api.resolveScan(qrData);
    }

    if (USE_LOCAL_DEV_FALLBACK) {
      const fallbackBranches = branches as unknown as Branch[];
      const orderedBranches = buildBranchScanCandidates({
        preferredBranchId,
        branches: fallbackBranches,
      });
      const branchWithMachine = orderedBranches.find((branch) => findAvailableMachine(branch));
      const machine = branchWithMachine ? findAvailableMachine(branchWithMachine) : null;
      if (!branchWithMachine || !machine) {
        return null;
      }

      return {
        qrData: `roboss://${branchWithMachine.id}/${machine.id}`,
        branch: branchWithMachine,
        machine,
      };
    }

    return null;
  }, []);

  const applyResolvedBranchSelection = useCallback((resolved: { branch: Branch; machine: { id: string } }) => {
    setSelectedBranch(resolved.branch);
    setSelectedMachineId(resolved.machine.id);
    setCurrentBranch(mapBranchToBranchContext(resolved.branch));
  }, [setCurrentBranch]);

  // Simulate QR scan — pick a random branch
  const handleSimulateScan = useCallback(() => {
    setScanPulse(true);
    setTimeout(async () => {
      try {
        const resolved = await resolvePreferredBranch(currentBranch.id || undefined);
        if (!resolved) throw new Error('No branch available');
        applyResolvedBranchSelection(resolved);
        setScanPulse(false);
        goToStep('select');
      } catch {
        setScanPulse(false);
      }
    }, 1500);
  }, [applyResolvedBranchSelection, currentBranch.id, goToStep, resolvePreferredBranch]);

  useEffect(() => {
    const intent = consumeWashFlowIntent();
    if (!intent) {
      return;
    }

    setSelectedCoupon(intent.coupon ?? null);
    setSelectedPromotion(intent.promotion ?? null);

    const preferredBranchId = intent.branchId || currentBranch.id || undefined;
    let isCancelled = false;

    void (async () => {
      try {
        const resolved = await resolvePreferredBranch(preferredBranchId);
        if (!resolved || isCancelled) {
          return;
        }

        applyResolvedBranchSelection(resolved);
        goToStep('select');
      } catch {
        // Keep the default scan step if branch resolution fails.
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [applyResolvedBranchSelection, currentBranch.id, goToStep, resolvePreferredBranch]);

  // Handle payment confirmation — create session then show warning (do NOT start wash yet)
  const handlePreparePayment = useCallback(async () => {
    if (!selectedBranch || !selectedPackage) return;

    setIsPreparingPayment(true);
    if (HAS_API_BASE_URL) {
      try {
        if (session && ['pending_payment', 'ready_to_wash'].includes(session.status)) {
          await api.cancelSession(session.id);
          setSession(null);
        }
        const apiSession = normalizeSession(await api.createSession({
          branchId: selectedBranch.id,
          machineId: selectedMachineId,
          packageId: selectedPackage.id,
          carSize,
          addons: addVacuum && vacuumPackage ? [vacuumPackage.id] : [],
          totalPrice: subtotalPrice,
          couponId: discountAmount > 0 ? selectedCoupon?.id : undefined,
        }));
        const paymentSession = normalizeSession(await api.createPayment(apiSession.id));
        setSession(paymentSession);
        goToStep('payment');
        return;
      } catch {
        if (!ALLOW_DEV_API_FAILURE_FALLBACK) {
          return;
        }
      } finally {
        setIsPreparingPayment(false);
      }
    }

    if (!USE_LOCAL_DEV_FALLBACK && !ALLOW_DEV_API_FAILURE_FALLBACK) {
      setIsPreparingPayment(false);
      return;
    }

    setIsPreparingPayment(false);
    goToStep('payment');
  }, [selectedBranch, selectedPackage, selectedMachineId, carSize, addVacuum, vacuumPackage, session, goToStep, selectedCoupon, discountAmount, subtotalPrice]);

  // Called when user taps "ตรวจสอบเรียบร้อยแล้ว" on the warning page
  const handleConfirmPayment = useCallback(async () => {
    if (!selectedBranch || !selectedPackage) return;

    setIsConfirmingPayment(true);
    if (HAS_API_BASE_URL && session?.payment?.id) {
      try {
        const updatedSession = normalizeSession(await api.confirmPaymentByPaymentId(session.payment.id));
        setSession(updatedSession);
        goToStep('warning');
        return;
      } catch {
        if (!ALLOW_DEV_API_FAILURE_FALLBACK) {
          return;
        }
      } finally {
        setIsConfirmingPayment(false);
      }
    }

    if (!USE_LOCAL_DEV_FALLBACK && !ALLOW_DEV_API_FAILURE_FALLBACK) {
      setIsConfirmingPayment(false);
      return;
    }

    const newSession = createSession({
      branchId: selectedBranch.id,
      machineId: selectedMachineId,
      userId: 'line_user_001',
      vehicleType: selectedBranch.type === 'bike' ? 'motorcycle' : 'car',
      packageId: selectedPackage.id,
      carSize,
      addons: addVacuum ? ['vacuum'] : [],
      totalPrice,
    });
    setSession(normalizeSession(newSession as unknown as WashSession));
    goToStep('warning');
    setIsConfirmingPayment(false);
  }, [selectedBranch, selectedPackage, selectedMachineId, carSize, addVacuum, totalPrice, session, goToStep, selectedCoupon, discountAmount, subtotalPrice, vacuumPackage]);

  const handleStartWash = useCallback(async () => {
    if (!session || !selectedBranch || !selectedPackage) return;

    setIsStartingWash(true);
    if (HAS_API_BASE_URL) {
      try {
        const startedSession = normalizeSession(await api.startWash(session.id));
        setSession(startedSession);
        goToStep('working');
        return;
      } catch {
        if (!ALLOW_DEV_API_FAILURE_FALLBACK) {
          return;
        }
      } finally {
        setIsStartingWash(false);
      }
    }

    if (!USE_LOCAL_DEV_FALLBACK && !ALLOW_DEV_API_FAILURE_FALLBACK) {
      setIsStartingWash(false);
      return;
    }

    confirmPayment(session.id);
    listenToSession(session.id, (updated) => {
      setSession(normalizeSession(updated as unknown as WashSession));
      if (getSessionWashStage(updated as unknown as WashSession) === 'completed') {
        addPoints(updated.pointsEarned, `${selectedPackage.name} ไซส์ ${carSize} — ${selectedBranch.name}`, updated.id);
        setTimeout(() => {
          goToStep('complete');
          setTimeout(() => {
            setShowPointsAnimation(true);
            animatePointsCounter(updated.pointsEarned);
          }, 800);
        }, 600);
      }
    });
    goToStep('working');
    setIsStartingWash(false);
  }, [session, selectedBranch, selectedPackage, carSize, goToStep]);

  // Animate points counter
  const animatePointsCounter = (target: number) => {
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setAnimatedPoints(target);
        clearInterval(timer);
      } else {
        setAnimatedPoints(current);
      }
    }, 30);
  };

  const handleBackToSelectFromPayment = useCallback(async () => {
    if (HAS_API_BASE_URL && session && ['pending_payment', 'ready_to_wash'].includes(session.status)) {
      try {
        await api.cancelSession(session.id);
      } catch {
        // Ignore cancellation errors and still let the user go back.
      }
      setSession(null);
    }
    goToStep('select');
  }, [session, goToStep]);

  // Payment countdown
  useEffect(() => {
    if (currentStep === 'payment') {
      const initialCountdown = session?.payment?.expiresAt
        ? Math.max(0, Math.floor((new Date(session.payment.expiresAt).getTime() - Date.now()) / 1000))
        : 300;
      setPaymentCountdown(initialCountdown);
      const timer = setInterval(() => {
        setPaymentCountdown(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, session?.payment?.expiresAt]);

  // Rating handler
  const handleRate = async (stars: number) => {
    setRating(stars);
    if (!session) return;

    if (HAS_API_BASE_URL) {
      try {
        const updatedSession = normalizeSession(await api.rateSession(session.id, stars));
        setSession(updatedSession);
        return;
      } catch {
        if (!ALLOW_DEV_API_FAILURE_FALLBACK) {
          return;
        }
      }
    }

    if (USE_LOCAL_DEV_FALLBACK || ALLOW_DEV_API_FAILURE_FALLBACK) {
      rateSession(session.id, stars);
    }
  };

  const displayedTotalPoints = HAS_API_BASE_URL
    ? (pointsBalanceQuery.data?.balance ?? authUser?.totalPoints ?? 0)
    : getUserPoints();

  const stepIndex = ['scan', 'select', 'payment', 'warning', 'working', 'complete'].indexOf(currentStep);

  // ============= RENDER HELPERS =============

  const stepLabels = ['สแกน', 'เลือก', 'ชำระ', 'ล้าง', 'เสร็จ'];

  const renderHeader = (title: string, showBack = true, onBackFn?: () => void) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-app-black/95 sticky top-0 z-50 backdrop-blur-md">
      {showBack ? (
        <button
          onClick={onBackFn || onBack}
          className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <I8Icon name="back" size={20} />
        </button>
      ) : (
        <div className="w-10" />
      )}
      <h1 className="text-white font-bold text-base">{title}</h1>
      <div className="w-10" />
    </div>
  );

  const renderProgressBar = () => (
    <div className="flex items-center gap-1 px-4 py-2.5 bg-app-black">
      {['scan', 'select', 'payment', 'working', 'complete'].map((s, i) => {
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <React.Fragment key={s}>
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-[3px] rounded-full overflow-hidden bg-white/8">
                <motion.div
                  className={`h-full rounded-full ${isDone || isActive ? 'bg-app-red' : 'bg-transparent'}`}
                  initial={{ width: '0%' }}
                  animate={{ width: isDone || isActive ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className={`text-[8px] ${isActive ? 'text-app-red font-bold' : isDone ? 'text-white/40' : 'text-white/15'}`}>
                {stepLabels[i]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  // ============= STEP: SCAN =============
  const renderScan = () => (
    <motion.div
      key="scan"
      className="absolute inset-0 flex flex-col bg-app-black"
      variants={slideVariants}
      initial="enter" animate="center" exit="exit"
      custom={direction}
      transition={{ duration: 0.3 }}>

      {renderHeader('สแกนตู้ล้างรถ')}
      {renderProgressBar()}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6">
          <h2 className="text-lg font-bold text-white mb-1">
            สแกน QR Code ที่เครื่อง
          </h2>
          <p className="text-white/30 text-xs">
            หันกล้องไปที่ QR Code บนตู้ล้างรถอัตโนมัติ
          </p>
        </motion.div>

        {/* Scanner Viewfinder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="relative w-56 h-56 mb-6"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-3 rounded-3xl bg-app-red/5 border border-app-red/10" />

          {/* Corner markers */}
          {[
            'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl',
            'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl',
            'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl',
            'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl',
          ].map((pos, i) => (
            <motion.div
              key={i}
              animate={scanPulse ? { borderColor: '#22C55E' } : { borderColor: '#DC2626' }}
              className={`absolute w-12 h-12 ${pos} transition-colors`}
            />
          ))}

          {/* Scanning line */}
          {!scanPulse && (
            <motion.div
              className="absolute left-3 right-3 h-[2px] rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #DC2626, #DC2626, transparent)', boxShadow: '0 0 16px rgba(220,38,38,0.6)' }}
              animate={{ top: ['8%', '92%', '8%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Center QR area */}
          {!scanPulse ? (
            <div className="absolute inset-5 bg-white/[0.02] rounded-xl flex flex-col items-center justify-center gap-3 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center">
                <I8Icon name="qrCode" size={24} />
              </div>
              <span className="text-white/15 text-[10px]">วาง QR ตรงนี้</span>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-green-500/20 border-2 border-green-500 shadow-[0_0_24px_rgba(34,197,94,0.3)]">
                <I8Icon name="checkmark" size={32} />
              </motion.div>
            </motion.div>
          )}
        </motion.div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full grid grid-cols-3 gap-2 mb-6"
        >
          {[
            { icon: 7911, label: 'สแกน QR', sub: 'ที่ตู้ล้างรถ' },
            { icon: 25107, label: 'เลือกบริการ', sub: 'แพ็กเกจ+ไซส์' },
            { icon: 11695, label: 'ชำระเงิน', sub: 'PromptPay' },
          ].map((item, i) => (
            <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${i === 0 ? 'bg-app-red/10 border-app-red/20' : 'bg-white/[0.02] border-white/5'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-app-red/20' : 'bg-black border border-white/10'}`}>
                <img
                  src={`${getIconUrl('qrCode', 32).replace(/id=\d+/, `id=${item.icon}`)}`}
                  width={16} height={16} alt=""
                  className="inline-block"
                  style={{ filter: 'invert(1) brightness(1.1)' }}
                />
              </div>
              <span className={`text-[10px] font-bold ${i === 0 ? 'text-app-red' : 'text-white/40'}`}>{item.label}</span>
              <span className="text-[8px] text-white/20">{item.sub}</span>
            </div>
          ))}
        </motion.div>

        {/* Scan Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSimulateScan}
          disabled={scanPulse}
          className="w-full bg-app-red hover:bg-red-600 disabled:bg-white/10 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_4px_24px_rgba(220,38,38,0.25)] flex items-center justify-center gap-2.5 text-sm">
          {scanPulse ? (
            <>
              <I8Icon name="refresh" size={18} className="animate-spin" />
              กำลังระบุตู้ล้างรถ...
            </>
          ) : (
            <>
              <I8Icon name="qrCode" size={18} />
              จำลองการสแกน QR
            </>
          )}
        </motion.button>

        <p className="text-white/15 text-[10px] mt-3 text-center">
          * ในโหมด Production จะเปิดกล้องสแกน QR จริง
        </p>
      </div>
    </motion.div>
  );

  // ============= STEP: SELECT PACKAGE =============
  const renderSelectPackage = () => (
    <motion.div
      key="select"
      className="absolute inset-0 flex flex-col bg-app-black overflow-y-auto no-scrollbar"
      variants={slideVariants}
      initial="enter" animate="center" exit="exit"
      custom={direction}
      transition={{ duration: 0.3 }}>

      {renderHeader('เลือกบริการ', true, () => goToStep('scan'))}
      {renderProgressBar()}

      {/* Branch Info Banner */}
      {selectedBranch && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 bg-gradient-to-r from-app-red/20 to-red-900/20 rounded-2xl p-4 border border-app-red/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-app-red/30 rounded-xl flex items-center justify-center">
              <I8Icon name="mapPin" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{selectedBranch.name}</p>
              <p className="text-gray-400 text-xs">
                ตู้: {selectedMachine?.name || '-'} •
                <span className={`ml-1 ${selectedMachine?.status === 'idle' ? 'text-green-400' : 'text-yellow-400'}`}>
                  ● {selectedMachine?.status === 'idle' ? 'ว่าง' : 'ไม่ว่าง'}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex-1 flex flex-col gap-4 pb-4">
        {/* Package Cards */}
        <div className="pt-4">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 px-4">
            <span className="w-1.5 h-4 bg-app-red rounded-full" />
            เลือกแพ็กเกจ
          </h3>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 px-4 pb-4">
              {mainPackages.map((pkg, idx) => {
                const isSelected = selectedPackageIndex === idx;
                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, scale: 0.85, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 250, damping: 22 }}
                    onTap={() => setSelectedPackageIndex(idx)}
                    className="shrink-0 relative rounded-2xl overflow-visible"
                    style={{ width: 240 }}>
                    <motion.div
                      animate={isSelected ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0.55 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="relative z-10 rounded-2xl overflow-hidden">
                      <img
                        src={pkg.image || '/freepik_0001.png'}
                        alt={pkg.name}
                        className="w-full h-auto object-cover pointer-events-none"
                        draggable={false}
                      />
                    </motion.div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="absolute -top-1 -right-1 z-20 w-8 h-8 bg-app-red rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 border-2 border-app-black">
                        <I8Icon name="checkmark" size={16} />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-1">
            {mainPackages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPackageIndex(idx)}
                className={`rounded-full transition-all duration-300 ${selectedPackageIndex === idx ? 'w-6 h-2 bg-app-red' : 'w-2 h-2 bg-gray-600 hover:bg-gray-500'}`}
              />
            ))}
          </div>

          {selectedPackage && (
            <motion.div
              key={selectedPackage.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-3 px-4">
              <p className="text-white font-bold text-lg">{selectedPackage.name}</p>
              <p className="text-gray-500 text-xs mt-1">
                {selectedPackage.steps.length} ขั้นตอน • ~{Math.round(selectedPackage.steps.length * 5)} นาที
              </p>
            </motion.div>
          )}
        </div>

        <div className="px-4 flex flex-col gap-4">
          {/* Car Size Selector */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-app-red rounded-full" />
              เลือกขนาดรถ
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {carSizes.map((size, idx) => (
                <motion.button
                  key={size.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCarSize(size.id)}
                  className={`relative py-3 px-2 rounded-xl border-2 text-center transition-all duration-300 ${
                    carSize === size.id
                      ? 'border-app-red bg-app-red/10 shadow-[0_0_20px_rgba(220,38,38,0.15)]'
                      : 'border-white/5 bg-app-dark hover:border-white/15'
                  }`}>
                  <div className="block mb-0.5 flex justify-center"><I8Icon name={size.iconName} size={24} className={carSize === size.id ? 'opacity-90' : 'opacity-50'} /></div>
                  <span className={`text-xl font-black block ${carSize === size.id ? 'text-app-red' : 'text-white'} transition-colors`}>
                    {size.label}
                  </span>
                  <span className="text-[11px] text-gray-400 block">{size.desc}</span>
                  {selectedPackage && (
                    <motion.span
                      key={`${selectedPackage.id}-${size.id}`}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className={`text-xs font-bold block mt-1 ${carSize === size.id ? 'text-app-red' : 'text-gray-500'}`}>
                      {selectedPackage.prices[size.id]}฿
                    </motion.span>
                  )}
                  {carSize === size.id && (
                    <motion.div
                      layoutId="sizeIndicator"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-app-red rounded-full flex items-center justify-center"
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
                      <I8Icon name="checkmark" size={12} />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Vacuum Add-on */}
          {vacuumPackage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}>
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-app-red rounded-full" />
                บริการเสริม
              </h3>
              <button
                onClick={() => setAddVacuum(!addVacuum)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${
                  addVacuum ? 'border-app-red bg-app-red/10' : 'border-white/5 bg-app-dark'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${addVacuum ? 'bg-app-red' : 'bg-app-black'}`}>
                    <I8Icon name="wind" size={18} className={addVacuum ? 'opacity-100' : 'opacity-40'} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">ดูดฝุ่นภายใน</p>
                    <p className="text-[11px] text-gray-500">ทำความสะอาดภายในรถ</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.span
                    key={vacuumPackage.prices[carSize]}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`font-bold ${addVacuum ? 'text-app-red' : 'text-gray-400'}`}>
                    +{vacuumPackage.prices[carSize]}฿
                  </motion.span>
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    addVacuum ? 'bg-app-red border-app-red' : 'border-gray-600'
                  }`}>
                    {addVacuum && <I8Icon name="checkmark" size={14} />}
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Points Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-3 border border-yellow-500/20 flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <I8Icon name="lightning" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-yellow-400 text-xs font-bold">พ้อยท์ที่จะได้รับ</p>
              <motion.p
                key={totalPrice}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-yellow-300 font-black text-lg">
                +{formatPoints(calculatePoints(totalPrice))} <span className="text-xs font-normal text-yellow-500">พ้อยท์</span>
              </motion.p>
            </div>
            <p className="text-gray-500 text-[10px] text-right">1฿ = {calculatePoints(1)} pts</p>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="pb-4">
            {/* Summary */}
            <div className="bg-app-dark rounded-xl p-4 mb-4 border border-white/5">
              <div className="space-y-2 mb-3">
                {selectedPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{selectedPackage.name} (ไซส์ {carSize})</span>
                    <span className="text-white">{selectedPackage.prices[carSize]}฿</span>
                  </div>
                )}
                {addVacuum && vacuumPackage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ดูดฝุ่นภายใน (ไซส์ {carSize})</span>
                    <span className="text-white">{vacuumPackage.prices[carSize]}฿</span>
                  </div>
                )}
                {discountAmount > 0 && selectedCoupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{selectedCoupon.title}</span>
                    <span className="text-green-400">-{discountAmount}เธฟ</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                  <span className="text-gray-400 font-medium">ยอดชำระสุทธิ</span>
                  <motion.span
                    key={totalPrice}
                    initial={{ scale: 1.3, color: '#DC2626' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    className="text-2xl font-black">
                    {totalPrice}
                    <span className="text-sm font-normal text-gray-400 ml-1">บาท</span>
                  </motion.span>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePreparePayment}
              disabled={isPreparingPayment}
              className="w-full bg-app-red hover:bg-red-600 disabled:bg-white/10 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 text-lg">
              ดำเนินการชำระเงิน
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  // ============= STEP: PAYMENT (PromptPay QR) =============
  const renderPayment = () => {
    const minutes = Math.floor(paymentCountdown / 60);
    const seconds = paymentCountdown % 60;

    return (
      <motion.div
        key="payment"
        className="absolute inset-0 flex flex-col bg-app-black overflow-y-auto no-scrollbar"
        variants={slideVariants}
        initial="enter" animate="center" exit="exit"
        custom={direction}
        transition={{ duration: 0.3 }}>

        {renderHeader('ชำระเงิน', true, handleBackToSelectFromPayment)}
        {renderProgressBar()}

        <div className="flex-1 flex flex-col items-center p-6">
          {/* Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
              paymentCountdown < 60 ? 'bg-red-500/20 border border-red-500/30' : 'bg-app-dark border border-white/10'
            }`}>
            <I8Icon name="timer" size={16} className={paymentCountdown < 60 ? 'opacity-80' : 'opacity-50'} />
            <span className={`font-mono font-bold ${paymentCountdown < 60 ? 'text-red-400' : 'text-white'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </motion.div>

          {/* PromptPay QR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 mb-6 shadow-2xl">
            <div className="text-center mb-4">
              <p className="text-gray-600 text-sm font-medium">โอนเงินผ่าน</p>
              <p className="text-blue-700 font-bold text-lg">PromptPay พร้อมเพย์</p>
            </div>

            {/* QR Placeholder with PromptPay styling */}
            <div className="relative w-full aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-blue-100 mb-4 overflow-hidden">
              {/* Fake QR pattern */}
              <div className="absolute inset-4 grid grid-cols-12 gap-px opacity-60">
                {Array.from({ length: 144 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${
                      Math.random() > 0.45 ? 'bg-gray-900' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              {/* Center logo */}
              <div className="relative z-10 w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-100">
                <img src="/Roboss_logo.png" alt="ROBOSS" className="w-12 h-12 object-contain" />
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-3">
              <p className="text-gray-500 text-sm">จำนวนเงิน</p>
              <p className="text-3xl font-black text-gray-900">{session?.payment?.amount ?? totalPrice}.00 <span className="text-base font-normal text-gray-500">บาท</span></p>
            </div>

            {/* Payee info */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">ชื่อบัญชี</span>
                <span className="text-gray-800 font-medium">{selectedBranch?.promptPayName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">เบอร์พร้อมเพย์</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-800 font-mono font-medium">{selectedBranch?.promptPayId}</span>
                  <button className="text-blue-500 hover:text-blue-600">
                    <img src={getIconUrl('copy', 28)} alt="copy" width={14} height={14} style={{ filter: 'invert(0.4) sepia(1) saturate(5) hue-rotate(190deg)' }} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Confirm Button (manual confirm) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-sm space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmPayment}
              disabled={isConfirmingPayment || (HAS_API_BASE_URL && !session?.payment)}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-white/20 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-green-900/30 flex items-center justify-center gap-2 text-lg">
              <I8Icon name="checkmark" size={22} />
              {isConfirmingPayment ? 'กำลังยืนยันการชำระเงิน...' : 'ฉันจ่ายเงินแล้ว'}
            </motion.button>
            <p className="text-gray-600 text-xs text-center">
              * กดปุ่มนี้หลังจากโอนเงินเรียบร้อยแล้ว
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // ============= STEP: WORKING =============
  const renderWorking = () => {
    const pkg = selectedPackage;
    const steps = pkg?.steps || [];
    const currentSubStep = session?.currentStep || 0;
    const progress = session?.progress || 0;
    const matchingStepIcon = stepIcons.find(s => s.name === steps[currentSubStep]) || stepIcons[0];

    return (
      <motion.div
        key="working"
        className="absolute inset-0 flex flex-col bg-app-black"
        variants={slideVariants}
        initial="enter" animate="center" exit="exit"
        custom={direction}
        transition={{ duration: 0.3 }}>

        {/* Background video */}
        <div className="absolute inset-0 z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover">
            <source
              src="/freepik_cute-robot-mascot-roboss-washing-a-red-car-gentle-repeating-scrubbing-motion-on-the-car-door-seamless-loop-stable-side-view-fixed-camera-consistent-composition-small-natural-water-splashe_0001%20(1).mp4"
              type="video/mp4"
            />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/85" />
        </div>

        <div className="relative z-10">
          {renderHeader('ระบบกำลังทำงาน', false)}
          {renderProgressBar()}
        </div>

        <div className="flex-1 flex flex-col items-center justify-between p-6 relative z-10">
          {/* Current step name */}
          <motion.div
            key={currentSubStep}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 mt-4 text-center">
            <div className="w-12 h-12 mx-auto mb-1 rounded-full flex items-center justify-center" style={{ background: `${matchingStepIcon.color}20` }}>
              <I8Icon name={matchingStepIcon.iconName} size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">{steps[currentSubStep] || 'กำลังดำเนินการ'}</h2>
            <p className="text-gray-400 text-sm mt-1">ขั้นตอนที่ {currentSubStep + 1} จาก {steps.length}</p>
          </motion.div>

          <div className="flex-1" />

          {/* Bottom Progress Panel */}
          <div className="w-full max-w-sm bg-[#1A1A1A]/95 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl mb-4">
            {/* Progress percentage */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">กรุณารอสักครู่</h3>
              <motion.span
                key={progress}
                className="text-app-red font-black text-xl">
                {Math.round(progress)}%
              </motion.span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden relative mb-6">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-app-red to-red-400 rounded-full"
                style={{ width: `${progress}%` }}
              />
              <motion.div
                className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ left: ['-20%', '120%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>

            {/* Timeline */}
            <div className="flex justify-between relative">
              <div className="absolute top-5 left-6 right-6 h-0.5 bg-gray-800 -z-10" />
              <motion.div
                className="absolute top-5 left-6 h-0.5 bg-app-red -z-10"
                animate={{ width: `${steps.length > 1 ? (currentSubStep / (steps.length - 1)) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
              {steps.map((step, idx) => {
                const sIcon = stepIcons.find(s => s.name === step) || stepIcons[0];
                const isCompleted = currentSubStep > idx;
                const isActive = currentSubStep === idx;
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 relative">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? 'bg-app-red text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]'
                          : isActive
                          ? 'bg-[#1A1A1A] text-app-red border-2 border-app-red shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                          : 'bg-[#1A1A1A] text-gray-600 border-2 border-gray-800'
                      }`}>
                      {isCompleted ? <I8Icon name="checkmark" size={18} /> : <I8Icon name={sIcon.iconName} size={18} className={isActive ? '' : 'opacity-40'} />}
                    </motion.div>
                    <span className={`text-[10px] font-bold text-center w-16 leading-tight ${
                      isCompleted ? 'text-white' : isActive ? 'text-app-red' : 'text-gray-600'
                    }`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ============= STEP: COMPLETE =============
  const renderComplete = () => (
    <motion.div
      key="complete"
      className="absolute inset-0 flex flex-col bg-app-black overflow-y-auto no-scrollbar"
      variants={slideVariants}
      initial="enter" animate="center" exit="exit"
      custom={direction}
      transition={{ duration: 0.3 }}>

      {renderHeader('เสร็จสิ้น', false)}
      {renderProgressBar()}

      <div className="flex-1 flex flex-col items-center p-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
          className="relative w-24 h-24 mb-4">
          <div className="w-full h-full bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500">
            <I8Icon name="checkmark" size={48} className="brightness-110" />
          </div>
          {/* Sparkle particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos(i * 60 * Math.PI / 180) * 50,
                y: Math.sin(i * 60 * Math.PI / 180) * 50,
              }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 bg-green-400 rounded-full -translate-x-1/2 -translate-y-1/2"
            />
          ))}
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-black text-white mb-1">
          ล้างรถเสร็จสิ้น!
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 mb-6">
          ขอบคุณที่ใช้บริการ ROBOSS
        </motion.p>

        {/* Points Earned */}
        {showPointsAnimation && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="w-full max-w-sm bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-red-500/10 rounded-2xl p-5 border border-yellow-500/30 mb-6 text-center">
            <p className="text-yellow-400 text-sm font-medium mb-1">พ้อยท์ที่ได้รับ</p>
            <motion.p className="text-4xl font-black text-yellow-300 tabular-nums">
              +{formatPoints(animatedPoints)}
            </motion.p>
            <p className="text-gray-500 text-xs mt-1">
              ยอดสะสมรวม: {formatPoints(displayedTotalPoints)} พ้อยท์
            </p>
          </motion.div>
        )}

        {/* Receipt Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-sm bg-app-dark rounded-2xl p-5 border border-white/5 mb-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <I8Icon name="receipt" size={14} /> สรุปรายการ
          </h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">สาขา</span>
              <span className="text-white font-medium text-right text-xs max-w-[200px] truncate">{selectedBranch?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">บริการ</span>
              <span className="text-white font-medium">{selectedPackage?.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">ขนาดรถ</span>
              <span className="text-white font-medium">ไซส์ {carSize}</span>
            </div>
            {addVacuum && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">บริการเสริม</span>
                <span className="text-white font-medium">ดูดฝุ่นภายใน</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">ชำระผ่าน</span>
              <span className="text-white font-medium">PromptPay พร้อมเพย์</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between items-center">
              <span className="text-gray-400 font-medium">ยอดชำระสุทธิ</span>
              <span className="text-app-red font-bold text-xl">{session?.totalPrice ?? totalPrice} ฿</span>
            </div>
          </div>
        </motion.div>

        {/* Rating */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-sm bg-app-dark rounded-2xl p-5 border border-white/5 mb-6 text-center">
          <p className="text-white font-bold mb-3">ให้คะแนนบริการ</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <motion.button
                key={star}
                whileTap={{ scale: 0.8 }}
                onClick={() => handleRate(star)}
                className="p-1">
                <img
                  src={getIconUrl('starFilled', 64)}
                  alt={`${star} star`}
                  width={32}
                  height={32}
                  className={`transition-all ${star <= rating ? 'opacity-100' : 'opacity-20'}`}
                  style={{ filter: star <= rating ? 'invert(0.85) sepia(1) saturate(5) hue-rotate(10deg) brightness(1.1)' : 'invert(0.5)' }}
                />
              </motion.button>
            ))}
          </div>
          {rating > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-400 text-sm mt-2">
              {rating >= 4 ? 'ขอบคุณมากครับ!' : rating >= 3 ? 'ขอบคุณครับ!' : 'เราจะปรับปรุงให้ดีขึ้น'}
            </motion.p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="w-full max-w-sm space-y-3 pb-6">
          <button className="w-full flex items-center justify-center gap-2 bg-app-dark hover:bg-white/10 text-white font-medium py-3 rounded-xl border border-white/5 transition-colors">
            <I8Icon name="share" size={18} />
            แชร์ใบเสร็จ
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full bg-app-red hover:bg-red-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-red-900/30">
            กลับหน้าหลัก
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );

  // ============= WARNING STEP =============
  const renderWarning = () => (
    <motion.div
      key="warning"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col bg-white overflow-hidden min-h-0"
    >
      <div className="flex-1 flex flex-col items-center justify-between px-6 pb-8 pt-6">

        {/* Top label */}
        <div className="w-full text-center">
          <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span className="text-red-600 text-[11px] font-bold tracking-wide">คำเตือนก่อนล้างรถ</span>
          </div>
        </div>

        {/* Car Lottie animation */}
        <div className="flex-1 flex items-center justify-center w-full">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-xs"
          >
            <Lottie animationData={carAnimation} loop className="w-full" />
          </motion.div>
        </div>

        {/* Warning text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full text-center space-y-3 mb-6"
        >
          <h2 className="text-gray-900 font-black text-2xl leading-tight">
            กรุณาตรวจสอบ<br />รถของท่าน
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            ก่อนทำการล้าง
          </p>

          {/* Checklist */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 mt-3 space-y-2.5 text-left">
            {[
              'ปิดหน้าต่างและประตูรถให้สนิท',
              'พับกระจกมองข้างเข้า',
              'ถอดเสาอากาศออก (ถ้ามี)',
              'ตรวจสอบว่าไม่มีสิ่งของห้อยอยู่ภายนอก',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <p className="text-gray-700 text-[13px] leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Confirm button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleStartWash}
              disabled={isStartingWash || (HAS_API_BASE_URL && session?.status !== 'ready_to_wash')}
          className="w-full bg-red-600 disabled:bg-gray-300 text-white font-black text-base py-4 rounded-2xl shadow-lg shadow-red-200 active:bg-red-700 transition-colors"
        >
          {isStartingWash ? 'กำลังเริ่มล้างรถ...' : 'ตรวจสอบเรียบร้อยแล้ว เริ่มล้างรถ'}
        </motion.button>
      </div>
    </motion.div>
  );

  // ============= MAIN RENDER =============
  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 'scan' && renderScan()}
        {currentStep === 'select' && renderSelectPackage()}
        {currentStep === 'payment' && renderPayment()}
        {currentStep === 'warning' && renderWarning()}
        {currentStep === 'working' && renderWorking()}
        {currentStep === 'complete' && renderComplete()}
      </AnimatePresence>
    </div>
  );
}
