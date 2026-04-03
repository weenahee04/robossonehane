const ICONS8_BASE = 'https://img.icons8.com/?format=png&size=';

const adminIconIds: Record<string, string | number> = {
  layoutDashboard: 11487,
  building: 9166,
  processor: 1938,
  activityHistory: 58761,
  gear: 53375,
  chevronLeft: 12561,
  chevronRight: 12561,
  chevronDown: 40026,
  water: 1946,
  notification: 11642,
  logout: 24338,
  search: 131,
  dollarBag: 484,
  carService: 24548,
  star: 104,
  starFilled: 39070,
  graph: 25047,
  eye: 113881,
  mapPin: 41445,
  clock: 423,
  plus: 37787,
  power: 'nNCoRuPq80hY',
  wifi: 172,
  wifiOff: 'wo7f3jFSsno5',
  wrench: 24551,
  refresh: 11675,
  download: 366,
  shield: 'YqMviGkCsvoB',
  more: 12579,
  warning: 876,
  info: 17077,
};

type AdminIconName = keyof typeof adminIconIds;

export function getAdminIconUrl(name: AdminIconName, size: number = 24): string {
  const id = adminIconIds[name];
  return `${ICONS8_BASE}${size}&id=${id}`;
}

interface I8Props {
  name: AdminIconName;
  size?: number;
  className?: string;
}

export function I8({name, size = 18, className = ''}: I8Props) {
  const url = getAdminIconUrl(name, size * 2);
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      className={`inline-block flex-shrink-0 ${className}`}
      style={{filter: 'brightness(0)'}}
      loading="lazy"
    />
  );
}

export type { AdminIconName };
