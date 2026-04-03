// Icons8 iOS 17 Outlined icons — monochrome white/gray theme
// All icons from Icons8 MCP server, platform: ios7 (iOS 17 Outlined)

const ICONS8_BASE = 'https://img.icons8.com/?format=png';

// Icon ID mapping (ios7 platform — monochrome outlined)
const iconIds = {
  // Navigation
  back: 1806,        // Back chevron
  home: 73,          // Home

  // Scan & QR
  qrCode: 7911,      // QR Code
  
  // Wash steps
  water: 1946,        // Water droplet
  soap: 8243,         // Soap bubble
  refresh: 11675,     // Refresh/rotate
  wind: 31842,        // Wind
  shine: 38532,       // Metallic paint/shine
  
  // Status
  checkmark: 11695,   // Checkmark circle
  
  // UI elements
  star: 39070,        // Star
  starFilled: 39070,  // Star filled (rating)
  mapPin: 41445,      // Map pin (location)
  timer: 1112,        // Timer/clock
  share: 3447,        // Share
  copy: 30,           // Copy/clipboard
  lightning: 6703,    // Lightning bolt (points/zap)
  receipt: 4720,      // Receipt
  carService: 24548,  // Car service
  sedan: 16553,       // Sedan (small car)
  car: 12666,         // Car (medium)
  suv: 16551,         // SUV (large)
  gift: 7694,         // Gift
  trending: 26028,    // Trending up
  lock: 15094,        // Lock
  tag: 2983,          // Tag/label

  // New — Profile & Settings
  user: 7345,         // User/person
  settings: 15117,    // Settings gear
  bell: 9041,         // Bell/notification
  history: 2294,      // Clock history
  shop: 9218,         // Shopping bag
  chat: 12002,        // Chat/message
  people: 7348,       // People/group
  question: 11715,    // Question mark circle
  edit: 49,          // Edit/pencil
  phone: 687,         // Phone
  mail: 12549,        // Email
  logout: 12555,      // Logout/exit
  camera: 7808,       // Camera
  trash: 12259,       // Delete/trash
  search: 131,        // Search/magnifier
  filter: 15086,      // Filter
  link: 3471,         // Link
  info: 11716,        // Info circle
  shield: 15118,      // Shield/security
  globe: 5524,        // Globe/language
} as const;

type IconName = keyof typeof iconIds;

export function getIconUrl(name: IconName, size: number = 32): string {
  const id = iconIds[name];
  return `${ICONS8_BASE}&id=${id}&size=${size}`;
}

export function getAvailableIcons(): IconName[] {
  return Object.keys(iconIds) as IconName[];
}

export const ICONS8_ATTRIBUTION = 'Icons by Icons8';

export type { IconName };
export { iconIds };
