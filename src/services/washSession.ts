// Wash Session Service — Mock ESP32 simulation
import { WashSession, branches, POINTS_RATE, type Branch, type BranchPackage } from './mockData';

let sessions: Map<string, WashSession> = new Map();
let sessionListeners: Map<string, ((session: WashSession) => void)[]> = new Map();

function generateId(): string {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export function getBranch(branchId: string): Branch | undefined {
  return branches.find(b => b.id === branchId);
}

export function getMachineInfo(branchId: string, machineId: string) {
  const branch = getBranch(branchId);
  if (!branch) return null;
  const machine = branch.machines.find(m => m.id === machineId);
  if (!machine) return null;
  return { branch, machine };
}

// Parse QR code data — format: "roboss://branch_001/branch_001_car_01"
export function parseQRCode(qrData: string): { branchId: string; machineId: string } | null {
  try {
    const match = qrData.match(/roboss:\/\/(.+?)\/(.+)/);
    if (match) {
      return { branchId: match[1], machineId: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function createSession(params: {
  branchId: string;
  machineId: string;
  userId: string;
  vehicleType: 'car' | 'motorcycle';
  packageId: string;
  carSize: 'S' | 'M' | 'L';
  addons: string[];
  totalPrice: number;
}): WashSession {
  const session: WashSession = {
    id: generateId(),
    ...params,
    status: 'pending_payment',
    paymentStatus: 'pending',
    washStatus: 'waiting',
    currentStep: 0,
    totalSteps: 0,
    progress: 0,
    pointsEarned: 0,
    rating: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
  };
  sessions.set(session.id, session);
  return session;
}

export function confirmPayment(sessionId: string): WashSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  session.status = 'in_progress';
  session.paymentStatus = 'confirmed';
  session.washStatus = 'in_progress';
  session.startedAt = new Date();
  notifyListeners(sessionId, session);
  
  // Start ESP32 simulation
  simulateWash(sessionId);
  
  return session;
}

export function listenToSession(sessionId: string, callback: (session: WashSession) => void): () => void {
  if (!sessionListeners.has(sessionId)) {
    sessionListeners.set(sessionId, []);
  }
  sessionListeners.get(sessionId)!.push(callback);
  
  // Send initial state
  const session = sessions.get(sessionId);
  if (session) callback(session);
  
  // Return unsubscribe function
  return () => {
    const listeners = sessionListeners.get(sessionId);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  };
}

function notifyListeners(sessionId: string, session: WashSession) {
  const listeners = sessionListeners.get(sessionId);
  if (listeners) {
    listeners.forEach(cb => cb({ ...session }));
  }
}

// Simulate ESP32 wash process
function simulateWash(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const branch = getBranch(session.branchId);
  if (!branch) return;
  
  const pkg = branch.packages.find(p => p.id === session.packageId);
  if (!pkg) return;
  
  const totalSteps = pkg.steps.length;
  session.totalSteps = totalSteps;
  // Use 3 seconds per step for demo (normally 5 min)
  const stepDuration = 3000; // ms
  const updateInterval = 100; // ms
  const updatesPerStep = stepDuration / updateInterval;
  
  let currentStep = 0;
  let stepProgress = 0;
  
  const timer = setInterval(() => {
    stepProgress++;
    
    const stepFraction = stepProgress / updatesPerStep;
    const overallProgress = ((currentStep + stepFraction) / totalSteps) * 100;
    
    session.currentStep = currentStep;
    session.progress = Math.min(Math.round(overallProgress), 100);
    
    if (stepProgress >= updatesPerStep) {
      currentStep++;
      stepProgress = 0;
      
      if (currentStep >= totalSteps) {
        clearInterval(timer);
        session.currentStep = totalSteps - 1;
        session.progress = 100;
        session.status = 'completed';
        session.washStatus = 'completed';
        session.completedAt = new Date();
        session.pointsEarned = session.totalPrice * POINTS_RATE;
        notifyListeners(sessionId, session);
        return;
      }
    }
    
    notifyListeners(sessionId, session);
  }, updateInterval);
}

export function rateSession(sessionId: string, rating: number, reviewText?: string): WashSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.rating = rating;
  session.reviewText = reviewText;
  notifyListeners(sessionId, session);
  return session;
}

export function getSession(sessionId: string): WashSession | null {
  return sessions.get(sessionId) || null;
}
