// Mock data for ROBOSS Car Wash — 22 branches

export interface BranchPackage {
  id: string;
  name: string;
  vehicleType: 'car' | 'motorcycle';
  prices: { S: number; M: number; L: number };
  steps: string[];
  stepDuration: number; // seconds per step
  isActive: boolean;
  image: string;
}

export interface Machine {
  id: string;
  name: string;
  type: 'car' | 'motorcycle';
  status: 'idle' | 'reserved' | 'washing' | 'maintenance' | 'offline';
  espDeviceId: string;
}

export interface Branch {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  promptPayId: string;
  promptPayName: string;
  isActive: boolean;
  packages: BranchPackage[];
  machines: Machine[];
}

export interface WashSession {
  id: string;
  branchId: string;
  machineId: string;
  userId: string;
  vehicleType: 'car' | 'motorcycle';
  packageId: string;
  carSize: 'S' | 'M' | 'L';
  addons: string[];
  totalPrice: number;
  status: 'pending_payment' | 'ready_to_wash' | 'in_progress' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'expired';
  washStatus: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  progress: number;
  pointsEarned: number;
  rating: number | null;
  reviewText?: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string;
  points: number;
  totalWashes: number;
  memberSince: Date;
}

const defaultCarPackages: Omit<BranchPackage, 'prices'>[] = [
  {
    id: 'quick',
    name: 'QUICK & CLEAN',
    vehicleType: 'car',
    steps: ['ฉีดน้ำแรงดันสูง', 'ล้างโฟมสลายคราบ', 'ขัดล้างอัตโนมัติ', 'เป่าแห้ง'],
    stepDuration: 300,
    isActive: true,
    image: '/freepik_0001.png',
  },
  {
    id: 'shine',
    name: 'SHINE MODE',
    vehicleType: 'car',
    steps: ['ฉีดน้ำแรงดันสูง', 'ล้างโฟมสลายคราบ', 'ขัดล้างอัตโนมัติ', 'เป่าแห้ง', 'เคลือบเงา'],
    stepDuration: 300,
    isActive: true,
    image: '/freepik_0001_(1).png',
  },
  {
    id: 'special',
    name: 'SPECIAL MODE',
    vehicleType: 'car',
    steps: ['ฉีดน้ำแรงดันสูง', 'ล้างโฟมสลายคราบ', 'ขัดล้างอัตโนมัติ', 'เป่าแห้ง', 'เคลือบเงา'],
    stepDuration: 300,
    isActive: true,
    image: '/freepik_0001_(2).png',
  },
];

const defaultAddon = {
  id: 'vacuum',
  name: 'ดูดฝุ่นภายใน',
  vehicleType: 'car' as const,
  steps: ['ดูดฝุ่น'],
  stepDuration: 300,
  isActive: true,
  image: '/freepik_0001_(3).png',
};

// Real ROBOSS branches with actual coordinates
interface RealBranch {
  id: string;
  name: string;
  address: string;
  area: string;
  location: { lat: number; lng: number };
  mapsUrl: string;
  promptPayId: string;
  promptPayName: string;
  priceMultiplier: number;
}

const realBranches: RealBranch[] = [
  {
    id: 'branch_001',
    name: 'ROBOSS รามอินทรา 109',
    address: '99/9 ถ.รามอินทรา กม.9 แขวงคันนายาว เขตคันนายาว กรุงเทพฯ',
    area: 'กรุงเทพฯ (คันนายาว)',
    location: { lat: 13.8682, lng: 100.6378 },
    mapsUrl: 'https://maps.app.goo.gl/ut1MVhuveKSvmiS27',
    promptPayId: '0891234567',
    promptPayName: 'ROBOSS รามอินทรา 109',
    priceMultiplier: 1.0,
  },
  {
    id: 'branch_002',
    name: 'ROBOSS พระราม 9',
    address: '1 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ',
    area: 'กรุงเทพฯ (ห้วยขวาง)',
    location: { lat: 13.7489, lng: 100.5714 },
    mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7',
    promptPayId: '0892345678',
    promptPayName: 'ROBOSS พระราม 9',
    priceMultiplier: 1.0,
  },
  {
    id: 'branch_003',
    name: 'ROBOSS ท่าพระ',
    address: '8/1 ถ.ท่าพระ แขวงบางยี่เรือ เขตธนบุรี กรุงเทพฯ',
    area: 'กรุงเทพฯ (ธนบุรี)',
    location: { lat: 13.7260, lng: 100.4785 },
    mapsUrl: 'https://maps.app.goo.gl/SC7SsTxuR1bpcpnq9',
    promptPayId: '0893456789',
    promptPayName: 'ROBOSS ท่าพระ',
    priceMultiplier: 1.0,
  },
  {
    id: 'branch_004',
    name: 'ROBOSS ชลบุรี',
    address: '99 ถ.สุขุมวิท ต.บ้านสวน อ.เมือง จ.ชลบุรี',
    area: 'ชลบุรี',
    location: { lat: 13.3611, lng: 100.9847 },
    mapsUrl: 'https://maps.app.goo.gl/H1xqWbL8BETheHpc6',
    promptPayId: '0894567890',
    promptPayName: 'ROBOSS ชลบุรี',
    priceMultiplier: 0.95,
  },
  {
    id: 'branch_005',
    name: 'ROBOSS สตูล',
    address: '15 ถ.สตูลธานี ต.พิมาน อ.เมือง จ.สตูล',
    area: 'สตูล',
    location: { lat: 6.6238, lng: 100.0674 },
    mapsUrl: 'https://maps.app.goo.gl/tQLW2vdJ1bHygoBF7',
    promptPayId: '0895678901',
    promptPayName: 'ROBOSS สตูล',
    priceMultiplier: 0.9,
  },
  {
    id: 'branch_006',
    name: 'ROBOSS นครศรีธรรมราช',
    address: '55 ถ.ราชดำเนิน ต.ในเมือง อ.เมือง จ.นครศรีธรรมราช',
    area: 'นครศรีธรรมราช',
    location: { lat: 8.4327, lng: 99.9638 },
    mapsUrl: 'https://maps.app.goo.gl/qdMDCMGr6LfagE2N8',
    promptPayId: '0896789012',
    promptPayName: 'ROBOSS นครศรีธรรมราช',
    priceMultiplier: 0.9,
  },
  {
    id: 'branch_007',
    name: 'ROBOSS อุทัยธานี',
    address: '123 ถ.ศรีอุทัย ต.อุทัยใหม่ อ.เมือง จ.อุทัยธานี',
    area: 'อุทัยธานี',
    location: { lat: 15.3833, lng: 100.0247 },
    mapsUrl: 'https://maps.app.goo.gl/8dn8U7UiKFwY3dST7',
    promptPayId: '0897890123',
    promptPayName: 'ROBOSS อุทัยธานี',
    priceMultiplier: 0.9,
  },
];

const basePrices = {
  quick: { S: 99, M: 109, L: 129 },
  shine: { S: 139, M: 149, L: 169 },
  special: { S: 339, M: 399, L: 469 },
  vacuum: { S: 70, M: 90, L: 120 },
};

function roundToNearest(n: number, _nearest: number = 9): number {
  return Math.round(n / 10) * 10 - 1;
}

export const branches: Branch[] = realBranches.map((rb) => ({
  id: rb.id,
  name: rb.name,
  address: rb.address,
  area: rb.area,
  location: rb.location,
  mapsUrl: rb.mapsUrl,
  promptPayId: rb.promptPayId,
  promptPayName: rb.promptPayName,
  isActive: true,
  packages: [
    ...defaultCarPackages.map(pkg => ({
      ...pkg,
      prices: {
        S: roundToNearest(basePrices[pkg.id as keyof typeof basePrices].S * rb.priceMultiplier),
        M: roundToNearest(basePrices[pkg.id as keyof typeof basePrices].M * rb.priceMultiplier),
        L: roundToNearest(basePrices[pkg.id as keyof typeof basePrices].L * rb.priceMultiplier),
      },
    })),
    {
      ...defaultAddon,
      prices: {
        S: roundToNearest(basePrices.vacuum.S * rb.priceMultiplier),
        M: roundToNearest(basePrices.vacuum.M * rb.priceMultiplier),
        L: roundToNearest(basePrices.vacuum.L * rb.priceMultiplier),
      },
    },
  ],
  machines: [
    { id: `${rb.id}_car_01`, name: 'ตู้ล้างรถ A1', type: 'car', status: 'idle', espDeviceId: `ESP32-${rb.id}-CAR01` },
    { id: `${rb.id}_car_02`, name: 'ตู้ล้างรถ A2', type: 'car', status: 'idle', espDeviceId: `ESP32-${rb.id}-CAR02` },
    { id: `${rb.id}_moto_01`, name: 'ตู้ล้างมอไซค์ B1', type: 'motorcycle', status: 'idle', espDeviceId: `ESP32-${rb.id}-MOTO01` },
  ],
}));


// Default mock user
export const mockUser: User = {
  id: 'line_user_001',
  displayName: 'W',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100',
  points: 1250,
  totalWashes: 14,
  memberSince: new Date('2025-01-15'),
};

// Points rate: 1 baht = 10 points
export const POINTS_RATE = 10;
