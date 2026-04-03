import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getIconUrl, type IconName } from '../services/icons';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useBranch } from '../services/branchContext';
import { setWashFlowIntent } from '@/services/washFlowIntent';

const USE_API = !!import.meta.env.VITE_API_URL;

function I8Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <img src={getIconUrl(name, size * 2)} alt={name} width={size} height={size}
      className={`inline-block ${className}`} style={{ filter: 'invert(1) brightness(1.1)' }} />
  );
}

const DEFAULT_LOCATION: [number, number] = [13.7563, 100.5018];

type BranchType = 'car' | 'bike';

interface Branch {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  hours: string;
  services: ('wash' | 'coating' | 'vacuum')[];
  machinesFree: number;
  machinesTotal: number;
  image: string;
  rating: number;
  mapsUrl?: string;
  type: BranchType;
}

const MOCK_BRANCHES: Branch[] = [
  // ===== ล้างรถยนต์ =====
  { id: 'c1', name: 'ROBOSS ล้างรถ สาขารามอินทรา 109', address: 'รามอินทรา 109 แขวงพระยาสุเรนทร์ เขตคลองสามวา กรุงเทพฯ', lat: 13.8303, lng: 100.7102, isOpen: true, hours: '24 ชม.', services: ['wash', 'coating', 'vacuum'], machinesFree: 2, machinesTotal: 3, image: '/roboss_car_icon.png', rating: 4.8, mapsUrl: 'https://maps.app.goo.gl/ut1MVhuveKSvmiS27', type: 'car' },
  { id: 'c2', name: 'ROBOSS ล้างรถ สาขาพระราม 9', address: '204 ซ.โรงพยาบาลพระราม 9 แขวงห้วยขวาง กรุงเทพฯ 10310', lat: 13.7571, lng: 100.5690, isOpen: true, hours: '24 ชม.', services: ['wash', 'vacuum'], machinesFree: 1, machinesTotal: 2, image: '/roboss_car_icon.png', rating: 4.7, mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7', type: 'car' },
  { id: 'c3', name: 'ROBOSS ล้างรถ สาขาท่าพระ', address: '182/1 ซ.เทอดไท 33 แขวงดาวคะนอง เขตธนบุรี กรุงเทพฯ 10600', lat: 13.7159, lng: 100.4762, isOpen: true, hours: '24 ชม.', services: ['wash', 'vacuum'], machinesFree: 2, machinesTotal: 3, image: '/roboss_car_icon.png', rating: 4.5, mapsUrl: 'https://maps.app.goo.gl/SC7SsTxuR1bpcpnq9', type: 'car' },
  { id: 'c4', name: 'ROBOSS ล้างรถ สาขาชลบุรี', address: 'หมู่ 11 ต.นาป่า อ.เมืองชลบุรี จ.ชลบุรี 20000', lat: 13.4011, lng: 101.0049, isOpen: true, hours: '24 ชม.', services: ['wash', 'coating', 'vacuum'], machinesFree: 3, machinesTotal: 3, image: '/roboss_car_icon.png', rating: 4.9, mapsUrl: 'https://maps.app.goo.gl/H1xqWbL8BETheHpc6', type: 'car' },
  { id: 'c5', name: 'ROBOSS ล้างรถ สาขาสตูล', address: '406 ต.ฉลุง อ.เมืองสตูล จ.สตูล 91140', lat: 6.7254, lng: 100.0669, isOpen: true, hours: '07:00-22:00', services: ['wash', 'coating'], machinesFree: 1, machinesTotal: 2, image: '/roboss_car_icon.png', rating: 4.6, mapsUrl: 'https://maps.app.goo.gl/tQLW2vdJ1bHygoBF7', type: 'car' },
  { id: 'c6', name: 'ROBOSS ล้างรถ สาขานครศรีธรรมราช', address: '384 ต.ปากพูน อ.เมืองนครศรีฯ จ.นครศรีธรรมราช 80000', lat: 8.5191, lng: 99.9750, isOpen: true, hours: '07:00-22:00', services: ['wash', 'vacuum'], machinesFree: 2, machinesTotal: 2, image: '/roboss_car_icon.png', rating: 4.4, mapsUrl: 'https://maps.app.goo.gl/qdMDCMGr6LfagE2N8', type: 'car' },
  { id: 'c7', name: 'ROBOSS ล้างรถ สาขาอุทัยธานี', address: 'ต.หนองฉาง อ.หนองฉาง จ.อุทัยธานี 61110', lat: 15.3906, lng: 99.8406, isOpen: true, hours: '07:00-21:00', services: ['wash', 'coating', 'vacuum'], machinesFree: 1, machinesTotal: 2, image: '/roboss_car_icon.png', rating: 4.3, mapsUrl: 'https://maps.app.goo.gl/8dn8U7UiKFwY3dST7', type: 'car' },
  // ===== ล้างมอเตอร์ไซค์ =====
  { id: 'b1', name: 'ROBOSS ล้างมอไซค์ สาขาพระราม 9', address: '204 ซ.โรงพยาบาลพระราม 9 แขวงห้วยขวาง กรุงเทพฯ 10310', lat: 13.7571, lng: 100.5690, isOpen: true, hours: '24 ชม.', services: ['wash'], machinesFree: 2, machinesTotal: 2, image: '/roboss_bike_icon.png', rating: 4.7, mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7', type: 'bike' },
  { id: 'b2', name: 'ROBOSS ล้างมอไซค์ สาขาพระราม 4', address: 'ปตท. พระราม 4 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110', lat: 13.7160, lng: 100.5746, isOpen: true, hours: '24 ชม.', services: ['wash'], machinesFree: 1, machinesTotal: 2, image: '/roboss_bike_icon.png', rating: 4.5, mapsUrl: 'https://maps.app.goo.gl/WhtiRPuwrRzrwgHF7', type: 'bike' },
  { id: 'b3', name: 'ROBOSS ล้างมอไซค์ สาขาท่าพระ', address: '182/1 ซ.เทอดไท 33 แขวงดาวคะนอง เขตธนบุรี กรุงเทพฯ 10600', lat: 13.7159, lng: 100.4762, isOpen: true, hours: '24 ชม.', services: ['wash'], machinesFree: 1, machinesTotal: 2, image: '/roboss_bike_icon.png', rating: 4.6, mapsUrl: 'https://maps.app.goo.gl/F5GfLG99U1SDzy28A', type: 'bike' },
  { id: 'b4', name: 'ROBOSS ล้างมอไซค์ สาขาชลบุรี', address: 'ต.นาป่า อ.เมืองชลบุรี จ.ชลบุรี 20000', lat: 13.3046, lng: 100.9024, isOpen: true, hours: '24 ชม.', services: ['wash'], machinesFree: 2, machinesTotal: 2, image: '/roboss_bike_icon.png', rating: 4.8, mapsUrl: 'https://maps.app.goo.gl/6FdX7LG31ozszmc29', type: 'bike' },
  { id: 'b5', name: 'ROBOSS ล้างมอไซค์ สาขาภูเก็ต', address: '78/162 ต.สามกอง อ.เมืองภูเก็ต จ.ภูเก็ต 83000', lat: 7.8992, lng: 98.3761, isOpen: true, hours: '08:00-22:00', services: ['wash'], machinesFree: 1, machinesTotal: 2, image: '/roboss_bike_icon.png', rating: 4.5, mapsUrl: 'https://maps.app.goo.gl/oazz3WiRR5ghx8SAA', type: 'bike' },
  { id: 'b6', name: 'ROBOSS ล้างมอไซค์ สาขาแม่สอด', address: 'ปั๊มบางจาก ต.แม่ปะ อ.แม่สอด จ.ตาก 63110', lat: 16.7511, lng: 98.5721, isOpen: true, hours: '07:00-21:00', services: ['wash'], machinesFree: 1, machinesTotal: 1, image: '/roboss_bike_icon.png', rating: 4.3, mapsUrl: 'https://maps.app.goo.gl/BbHegYXa99rbBCGC9', type: 'bike' },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pulsing blue dot for user
const userIcon = new L.DivIcon({
  className: '',
  html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:40px;height:40px;background:rgba(59,130,246,0.2);border-radius:50%;animation:userPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;width:24px;height:24px;background:rgba(59,130,246,0.15);border-radius:50%;animation:userPulse 2s ease-out infinite 0.5s;"></div>
    <div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5);position:relative;z-index:2;"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const carSvg = (s: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const bikeSvg = (s: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;

const createBranchIcon = (isSelected: boolean, isOpen: boolean, machinesFree: number, branchType: BranchType = 'car') => {
  const pinColor = !isOpen ? '#4B5563' : branchType === 'bike' ? '#F97316' : '#DC2626';
  const borderColor = !isOpen ? '#374151' : branchType === 'bike' ? '#C2410C' : '#991B1B';
  const border = isSelected ? '4px solid #FFFFFF' : `3px solid ${borderColor}`;
  const size = isSelected ? 42 : 34;
  const innerSize = isSelected ? 36 : 28;
  const iconSize = isSelected ? 18 : 14;
  const badge = isOpen && machinesFree > 0
    ? `<div style="position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;background:#22C55E;border-radius:8px;font-size:9px;font-weight:800;color:white;display:flex;align-items:center;justify-content:center;border:2px solid #0A0A0A;padding:0 3px;">${machinesFree}</div>`
    : '';
  const icon = branchType === 'bike' ? bikeSvg(iconSize) : carSvg(iconSize);
  const shadow = isSelected
    ? branchType === 'bike' ? 'filter:drop-shadow(0 4px 12px rgba(249,115,22,0.4));' : 'filter:drop-shadow(0 4px 12px rgba(220,38,38,0.4));'
    : '';

  return new L.DivIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transition:transform 0.3s;${isSelected ? `transform:scale(1.15);${shadow}` : ''}">
      <div style="position:relative;width:${innerSize}px;height:${innerSize}px;background:${pinColor};border-radius:50%;display:flex;align-items:center;justify-content:center;border:${border};">
        ${badge}${icon}
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${pinColor};margin-top:-2px;"></div>
    </div>`,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
  });
};

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

// Filter chips
type FilterType = 'all' | 'car' | 'bike' | 'open' | 'nearby' | 'available';
const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'car', label: 'ล้างรถยนต์' },
  { key: 'bike', label: 'ล้างมอไซค์' },
  { key: 'open', label: 'เปิดอยู่' },
  { key: 'nearby', label: 'ใกล้ 5 กม.' },
  { key: 'available', label: 'ว่างตอนนี้' },
];

interface NearbyBranchesProps { onBack: () => void; }

export function NearbyBranches({ onBack }: NearbyBranchesProps) {
  const navigate = useNavigate();
  const { allBranches, setBranch } = useBranch();
  const [userLocation, setUserLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [selectedBranch, setSelectedBranch] = useState<(Branch & { distance: number }) | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_LOCATION);
  const [mapZoom, setMapZoom] = useState(12);
  const [filter, setFilter] = useState<FilterType>('all');

  const sourceBranches: Branch[] = useMemo(() => {
    if (!USE_API || allBranches.length === 0) return MOCK_BRANCHES;
    return allBranches
      .filter((b) => b.lat != null && b.lng != null)
      .map((b) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        lat: b.lat!,
        lng: b.lng!,
        isOpen: b.isOpen,
        hours: b.hours,
        services: b.type === 'bike'
          ? (['wash'] as ('wash' | 'coating' | 'vacuum')[])
          : (['wash', 'coating', 'vacuum'] as ('wash' | 'coating' | 'vacuum')[]),
        machinesFree: b.machinesFree,
        machinesTotal: b.machinesTotal,
        image: b.type === 'bike' ? '/roboss_bike_icon.png' : '/roboss_car_icon.png',
        rating: 0,
        mapsUrl: b.mapsUrl,
        type: b.type,
      }));
  }, [allBranches]);

  // Geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const branchesWithDistance = useMemo(() => {
    return sourceBranches.map((branch) => ({
      ...branch,
      distance: calculateDistance(userLocation[0], userLocation[1], branch.lat, branch.lng)
    })).sort((a, b) => a.distance - b.distance);
  }, [userLocation, sourceBranches]);

  const filteredBranches = useMemo(() => {
    switch (filter) {
      case 'car': return branchesWithDistance.filter(b => b.type === 'car');
      case 'bike': return branchesWithDistance.filter(b => b.type === 'bike');
      case 'open': return branchesWithDistance.filter(b => b.isOpen);
      case 'nearby': return branchesWithDistance.filter(b => b.distance <= 5);
      case 'available': return branchesWithDistance.filter(b => b.isOpen && b.machinesFree > 0);
      default: return branchesWithDistance;
    }
  }, [branchesWithDistance, filter]);

  const handleBranchSelect = (branch: Branch & { distance: number }) => {
    setSelectedBranch(branch);
    setMapCenter([branch.lat, branch.lng]);
    setMapZoom(15);
  };

  const handleLocate = () => {
    setMapCenter(userLocation);
    setMapZoom(13);
    setSelectedBranch(null);
  };

  const handleStartWashAtBranch = () => {
    if (!selectedBranch) {
      return;
    }

    const mappedBranch = allBranches.find(
      (branchInfo) =>
        branchInfo.id === selectedBranch.id ||
        branchInfo.name === selectedBranch.name ||
        branchInfo.shortName === selectedBranch.name.replace('ROBOSS ', '')
    );

    if (mappedBranch) {
      setBranch(mappedBranch);
    }

    setWashFlowIntent({
      source: 'branch',
      branchId: mappedBranch?.id ?? selectedBranch.id,
      branchName: mappedBranch?.name ?? selectedBranch.name,
      branchType: selectedBranch.type,
    });
    navigate('/carwash');
  };

  const serviceMap: Record<string, { icon: IconName; name: string }> = {
    wash: { icon: 'car', name: 'ล้างรถ' },
    coating: { icon: 'shine', name: 'เคลือบ' },
    vacuum: { icon: 'wind', name: 'ดูดฝุ่น' },
  };

  return (
    <div className="flex-1 flex flex-col bg-app-black overflow-hidden relative">
      {/* ============ HEADER — floating on map ============ */}
      <div className="absolute top-0 left-0 right-0 z-[1000] safe-top">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-app-dark/80 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 shadow-lg shrink-0 active:scale-95 transition-transform"
          >
            <I8Icon name="back" size={16} />
          </button>
          <div className="flex-1 bg-app-dark/80 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 shadow-lg flex items-center gap-2">
            <I8Icon name="mapPin" size={14} className="opacity-60" />
            <span className="text-white text-xs font-medium">สาขาใกล้คุณ</span>
            <span className="text-gray-500 text-[10px] ml-auto">{filteredBranches.length} สาขา</span>
          </div>
        </div>

        {/* Filter chips — horizontal scroll */}
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border shadow-sm
                ${filter === f.key
                  ? f.key === 'bike' ? 'bg-orange-500 text-white border-orange-500' : 'bg-app-red text-white border-app-red'
                  : 'bg-app-dark/80 backdrop-blur-md text-gray-300 border-white/10 active:scale-95'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ MAP — takes ~55% of screen ============ */}
      <div className="relative w-full" style={{ height: '55%', minHeight: '280px' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* User position */}
          <Marker position={userLocation} icon={userIcon}>
            <Popup className="custom-popup">
              <div style={{ textAlign: 'center', padding: '4px', color: 'white', fontSize: '13px', fontWeight: 600 }}>
                ตำแหน่งของคุณ
              </div>
            </Popup>
          </Marker>

          {/* User radius */}
          <Circle
            center={userLocation}
            radius={3000}
            pathOptions={{ color: 'rgba(59,130,246,0.25)', fillColor: 'rgba(59,130,246,0.05)', fillOpacity: 0.4, weight: 1 }}
          />

          {/* Branch pins */}
          {filteredBranches.map((branch) => (
            <Marker
              key={branch.id}
              position={[branch.lat, branch.lng]}
              icon={createBranchIcon(selectedBranch?.id === branch.id, branch.isOpen, branch.machinesFree, branch.type)}
              eventHandlers={{ click: () => handleBranchSelect(branch) }}
            />
          ))}
        </MapContainer>

        {/* Locate me button */}
        <button
          onClick={handleLocate}
          className="absolute bottom-4 right-3 z-[1000] w-10 h-10 bg-app-dark/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 shadow-lg active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
          </svg>
        </button>

        {/* Gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-app-black to-transparent z-[400] pointer-events-none" />
      </div>

      {/* ============ BOTTOM SHEET — Store cards ============ */}
      <div className="flex-1 bg-app-black rounded-t-2xl -mt-4 z-10 relative flex flex-col border-t border-white/10 overflow-hidden">
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1.5">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Store card list */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4 space-y-2.5">
          {filteredBranches.map((branch, index) => {
            const isSelected = selectedBranch?.id === branch.id;
            return (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                onClick={() => handleBranchSelect(branch)}
              >
                <div className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98]
                  ${isSelected
                    ? branch.type === 'bike'
                      ? 'bg-orange-500/10 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                      : 'bg-app-red/10 border border-app-red/30 shadow-[0_0_20px_rgba(220,38,38,0.1)]'
                    : 'bg-app-dark/50 border border-white/5 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Branch image */}
                  <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${branch.type === 'bike' ? 'bg-orange-950/40 border-orange-500/10' : 'bg-app-dark border-white/5'}`}>
                    <img
                      src={branch.image}
                      alt={branch.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className={`text-sm font-bold truncate ${isSelected ? (branch.type === 'bike' ? 'text-orange-400' : 'text-app-red') : 'text-white'}`}>
                        {branch.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                        <I8Icon name="mapPin" size={10} className="opacity-60 shrink-0" />
                        {branch.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <Badge
                        variant={branch.isOpen ? 'success' : 'destructive'}
                        className="text-[9px] h-[18px] px-1.5"
                      >
                        {branch.isOpen ? 'เปิด' : 'ปิด'}
                      </Badge>
                      {branch.isOpen && branch.machinesFree > 0 && (
                        <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 text-green-400 border-green-500/30">
                          ว่าง {branch.machinesFree} ตู้
                        </Badge>
                      )}
                      <span className="text-[10px] text-gray-500">{branch.hours}</span>
                    </div>
                  </div>

                  {/* Distance & rating */}
                  <div className="flex flex-col items-end justify-between py-0.5 shrink-0">
                    <div className="text-right">
                      <p className="text-base font-black text-white leading-tight">{branch.distance.toFixed(1)}</p>
                      <p className="text-[9px] text-gray-500">กม.</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="text-yellow-400 text-[10px]">★</span>
                      <span className="text-gray-400 text-[10px] font-medium">{branch.rating}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filteredBranches.length === 0 && (
            <div className="text-center py-12">
              <I8Icon name="mapPin" size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-gray-500 text-sm">ไม่พบสาขาที่ตรงกับตัวกรอง</p>
            </div>
          )}
          <div className="h-2" />
        </div>
      </div>

      {/* ============ Selected Branch Action Bar ============ */}
      <AnimatePresence>
        {selectedBranch && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-app-black via-app-black/95 to-transparent pt-8"
          >
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-10 border-white/10"
                onClick={() => {
                  window.open(selectedBranch.mapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.lat},${selectedBranch.lng}`, '_blank');
                }}
              >
                <I8Icon name="mapPin" size={14} /> นำทาง
              </Button>
              <Button size="sm" className="flex-1 text-xs h-10" onClick={handleStartWashAtBranch}>
                <I8Icon name="car" size={14} /> เริ่มล้างรถที่สาขานี้
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
