import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { HAS_API_BASE_URL, USE_LOCAL_DEV_FALLBACK } from '@/lib/runtime';
import api from '@/services/api';
import type { Branch } from '@/types';

export interface BranchInfo {
  id: string;
  name: string;
  shortName: string;
  address: string;
  type: 'car' | 'bike';
  isOpen: boolean;
  hours: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
  promptPayId?: string;
  promptPayName?: string;
  machinesFree: number;
  machinesTotal: number;
}

const FALLBACK_BRANCHES: BranchInfo[] = ([
  { id: 'branch_c01', name: 'ROBOSS Ramintra 109', shortName: 'Ramintra 109', address: '99/9 Ramintra Rd., Bangkok', type: 'car', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/ut1MVhuveKSvmiS27', lat: 13.8682, lng: 100.6378 },
  { id: 'branch_c02', name: 'ROBOSS Rama 9', shortName: 'Rama 9', address: 'Rama 9 Rd., Bangkok', type: 'car', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7', lat: 13.7489, lng: 100.5714 },
  { id: 'branch_c03', name: 'ROBOSS Tha Phra', shortName: 'Tha Phra', address: 'Tha Phra Rd., Bangkok', type: 'car', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/SC7SsTxuR1bpcpnq9', lat: 13.726, lng: 100.4785 },
  { id: 'branch_c04', name: 'ROBOSS Chonburi', shortName: 'Chonburi', address: 'Sukhumvit Rd., Chonburi', type: 'car', isOpen: true, hours: '07:00 - 21:00', mapsUrl: 'https://maps.app.goo.gl/H1xqWbL8BETheHpc6', lat: 13.3611, lng: 100.9847 },
  { id: 'branch_c05', name: 'ROBOSS Satun', shortName: 'Satun', address: 'Satun Thani Rd., Satun', type: 'car', isOpen: true, hours: '07:00 - 20:00', mapsUrl: 'https://maps.app.goo.gl/tQLW2vdJ1bHygoBF7', lat: 6.6238, lng: 100.0674 },
  { id: 'branch_c06', name: 'ROBOSS Nakhon Si Thammarat', shortName: 'NST', address: 'Ratchadamnoen Rd., NST', type: 'car', isOpen: true, hours: '07:00 - 21:00', mapsUrl: 'https://maps.app.goo.gl/qdMDCMGr6LfagE2N8', lat: 8.4327, lng: 99.9638 },
  { id: 'branch_c07', name: 'ROBOSS Uthai Thani', shortName: 'Uthai Thani', address: 'Si Uthai Rd., Uthai Thani', type: 'car', isOpen: true, hours: '07:00 - 20:00', mapsUrl: 'https://maps.app.goo.gl/8dn8U7UiKFwY3dST7', lat: 15.3833, lng: 100.0247 },
  { id: 'branch_b01', name: 'ROBOSS Bike Rama 9', shortName: 'Bike Rama 9', address: 'Rama 9 Rd., Bangkok', type: 'bike', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7', lat: 13.7485, lng: 100.572 },
  { id: 'branch_b02', name: 'ROBOSS Bike Rama 4', shortName: 'Bike Rama 4', address: 'Rama 4 Rd., Bangkok', type: 'bike', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/WhtiRPuwrRzrwgHF7', lat: 13.722, lng: 100.553 },
  { id: 'branch_b03', name: 'ROBOSS Bike Tha Phra', shortName: 'Bike Tha Phra', address: 'Tha Phra Rd., Bangkok', type: 'bike', isOpen: true, hours: '06:00 - 22:00', mapsUrl: 'https://maps.app.goo.gl/F5GfLG99U1SDzy28A', lat: 13.7265, lng: 100.479 },
  { id: 'branch_b04', name: 'ROBOSS Bike Chonburi', shortName: 'Bike Chonburi', address: 'Sukhumvit Rd., Chonburi', type: 'bike', isOpen: true, hours: '07:00 - 21:00', mapsUrl: 'https://maps.app.goo.gl/6FdX7LG31ozszmc29', lat: 13.3615, lng: 100.985 },
  { id: 'branch_b05', name: 'ROBOSS Bike Phuket', shortName: 'Bike Phuket', address: 'Thaweewong Rd., Phuket', type: 'bike', isOpen: true, hours: '07:00 - 21:00', mapsUrl: 'https://maps.app.goo.gl/oazz3WiRR5ghx8SAA', lat: 7.89, lng: 98.295 },
  { id: 'branch_b06', name: 'ROBOSS Bike Mae Sot', shortName: 'Bike Mae Sot', address: 'Prasat Withi Rd., Tak', type: 'bike', isOpen: true, hours: '07:00 - 20:00', mapsUrl: 'https://maps.app.goo.gl/BbHegYXa99rbBCGC9', lat: 16.713, lng: 98.573 },
 ] as const).map((branch) => ({
  ...branch,
  machinesFree: branch.type === 'bike' ? 1 : 2,
  machinesTotal: branch.type === 'bike' ? 2 : 3,
}));

function apiBranchToBranchInfo(branch: Branch): BranchInfo {
  return {
    id: branch.id,
    name: branch.name,
    shortName: branch.shortName || branch.name.replace('ROBOSS ', ''),
    address: branch.address,
    type: branch.type === 'bike' ? 'bike' : 'car',
    isOpen: branch.isOpen,
    hours: branch.hours || '06:00 - 22:00',
    mapsUrl: branch.mapsUrl,
    lat: branch.location?.lat,
    lng: branch.location?.lng,
    promptPayId: branch.promptPayId,
    promptPayName: branch.promptPayName,
    machinesFree: branch.machinesFree,
    machinesTotal: branch.machinesTotal,
  };
}

const STORAGE_KEY = 'roboss_selected_branch';
const BRANCH_CACHE_KEY = 'roboss_branch_cache';

const EMPTY_BRANCH: BranchInfo = {
  id: '',
  name: '',
  shortName: '',
  address: '',
  type: 'car',
  isOpen: false,
  hours: '',
  machinesFree: 0,
  machinesTotal: 0,
};

function readCachedBranches(): BranchInfo[] {
  try {
    const cached = localStorage.getItem(BRANCH_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed)
      ? parsed.map((branch) => ({
          machinesFree: 0,
          machinesTotal: 0,
          ...branch,
        })) as BranchInfo[]
      : [];
  } catch {
    return [];
  }
}

interface BranchContextType {
  branch: BranchInfo;
  allBranches: BranchInfo[];
  setBranch: (branch: BranchInfo) => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType>({
  branch: USE_LOCAL_DEV_FALLBACK ? FALLBACK_BRANCHES[0] : EMPTY_BRANCH,
  allBranches: USE_LOCAL_DEV_FALLBACK ? FALLBACK_BRANCHES : [],
  setBranch: () => {},
  isLoading: false,
});

export function BranchProvider({ children }: { children: ReactNode }) {
  const [allBranches, setAllBranches] = useState<BranchInfo[]>(() => {
    if (USE_LOCAL_DEV_FALLBACK) {
      return FALLBACK_BRANCHES;
    }

    const cached = readCachedBranches();
    return cached.length > 0 ? cached : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  const [branch, setBranchState] = useState<BranchInfo>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const availableBranches = USE_LOCAL_DEV_FALLBACK ? FALLBACK_BRANCHES : readCachedBranches();

    if (saved) {
      const found = availableBranches.find((branchInfo) => branchInfo.id === saved);
      if (found) return found;
    }

    return availableBranches[0] || EMPTY_BRANCH;
  });

  useEffect(() => {
    if (!HAS_API_BASE_URL) return;

    setIsLoading(true);
    api.getBranches()
      .then((branches) => {
        const mapped = branches.map(apiBranchToBranchInfo);
        if (mapped.length > 0) {
          setAllBranches(mapped);
          localStorage.setItem(BRANCH_CACHE_KEY, JSON.stringify(mapped));
          const savedId = localStorage.getItem(STORAGE_KEY);
          const found = mapped.find((branchInfo: BranchInfo) => branchInfo.id === savedId);
          setBranchState(found || mapped[0]);
        }
      })
      .catch(() => {
        if (USE_LOCAL_DEV_FALLBACK) {
          setAllBranches(FALLBACK_BRANCHES);
          const savedId = localStorage.getItem(STORAGE_KEY);
          const found = FALLBACK_BRANCHES.find((branchInfo) => branchInfo.id === savedId);
          setBranchState(found || FALLBACK_BRANCHES[0]);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setBranch = (branchInfo: BranchInfo) => {
    setBranchState(branchInfo);
    localStorage.setItem(STORAGE_KEY, branchInfo.id);
  };

  return (
    <BranchContext.Provider value={{ branch, allBranches, setBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}

export { FALLBACK_BRANCHES as ALL_BRANCHES };
