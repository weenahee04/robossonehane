import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type BranchSeed = {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  ownershipType: 'company_owned' | 'franchise';
  franchiseCode?: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  hours: string;
  promptPayId: string;
  promptPayName: string;
  ownerName?: string;
  mapsUrl: string;
  supportPhone: string;
  pointsEarnRate?: number;
};

const packages = [
  {
    id: 'pkg_quick',
    code: 'QUICK',
    name: 'QUICK & CLEAN',
    description: 'ล้างภายนอกแบบรวดเร็วสำหรับรถยนต์',
    vehicleType: 'car',
    priceS: 99,
    priceM: 109,
    priceL: 129,
    steps: ['ฉีดน้ำแรงดันสูง', 'โฟมล้างรถ', 'แปรงอัตโนมัติ', 'เป่าแห้ง'],
    stepDuration: 300,
    image: '/freepik_0001.png',
    sortOrder: 1,
  },
  {
    id: 'pkg_shine',
    code: 'SHINE',
    name: 'SHINE MODE',
    description: 'ล้างพร้อมเคลือบเงา',
    vehicleType: 'car',
    priceS: 139,
    priceM: 149,
    priceL: 169,
    steps: ['ฉีดน้ำแรงดันสูง', 'โฟมล้างรถ', 'แปรงอัตโนมัติ', 'เป่าแห้ง', 'เคลือบเงา'],
    stepDuration: 300,
    image: '/freepik_0001_(1).png',
    sortOrder: 2,
  },
  {
    id: 'pkg_special',
    code: 'SPECIAL',
    name: 'SPECIAL MODE',
    description: 'แพ็กเกจดูแลรถแบบลึกและเคลือบเงา',
    vehicleType: 'car',
    priceS: 339,
    priceM: 399,
    priceL: 469,
    steps: ['ฉีดน้ำแรงดันสูง', 'โฟมล้างรถ', 'แปรงอัตโนมัติ', 'เป่าแห้ง', 'เคลือบเงาพิเศษ'],
    stepDuration: 300,
    image: '/freepik_0001_(2).png',
    sortOrder: 3,
  },
  {
    id: 'pkg_vacuum',
    code: 'VACUUM',
    name: 'ดูดฝุ่นภายใน',
    description: 'บริการดูดฝุ่นภายในรถยนต์',
    vehicleType: 'car',
    priceS: 70,
    priceM: 90,
    priceL: 120,
    steps: ['ดูดฝุ่นภายใน'],
    stepDuration: 300,
    image: '/freepik_0001_(3).png',
    sortOrder: 4,
  },
  {
    id: 'pkg_moto_quick',
    code: 'MOTO_CLEAN',
    name: 'MOTO CLEAN',
    description: 'ล้างมอเตอร์ไซค์แบบพื้นฐาน',
    vehicleType: 'motorcycle',
    priceS: 49,
    priceM: 59,
    priceL: 69,
    steps: ['ฉีดน้ำแรงดันสูง', 'โฟมล้างรถ', 'เป่าแห้ง'],
    stepDuration: 180,
    sortOrder: 5,
  },
  {
    id: 'pkg_moto_shine',
    code: 'MOTO_SHINE',
    name: 'MOTO SHINE',
    description: 'ล้างมอเตอร์ไซค์พร้อมเคลือบเงา',
    vehicleType: 'motorcycle',
    priceS: 79,
    priceM: 89,
    priceL: 99,
    steps: ['ฉีดน้ำแรงดันสูง', 'โฟมล้างรถ', 'เป่าแห้ง', 'เคลือบเงา'],
    stepDuration: 180,
    sortOrder: 6,
  },
];

const branches: BranchSeed[] = [
  {
    id: 'branch_c01',
    code: 'RAMA109',
    name: 'ROBOSS รามอินทรา 109',
    shortName: 'รามอินทรา 109',
    type: 'car',
    ownershipType: 'company_owned',
    address: '99/9 ถ.รามอินทรา แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร',
    area: 'กรุงเทพมหานคร',
    lat: 13.8682,
    lng: 100.6378,
    hours: '06:00 - 22:00',
    promptPayId: '0891234567',
    promptPayName: 'ROBOSS รามอินทรา 109',
    ownerName: 'ROBOSS HQ',
    mapsUrl: 'https://maps.app.goo.gl/ut1MVhuveKSvmiS27',
    supportPhone: '02-000-0109',
    pointsEarnRate: 10,
  },
  {
    id: 'branch_c02',
    code: 'RAMA9',
    name: 'ROBOSS พระราม 9',
    shortName: 'พระราม 9',
    type: 'car',
    ownershipType: 'company_owned',
    address: '1 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร',
    area: 'กรุงเทพมหานคร',
    lat: 13.7489,
    lng: 100.5714,
    hours: '06:00 - 22:00',
    promptPayId: '0892345678',
    promptPayName: 'ROBOSS พระราม 9',
    ownerName: 'ROBOSS HQ',
    mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7',
    supportPhone: '02-000-0009',
    pointsEarnRate: 10,
  },
  {
    id: 'branch_c04',
    code: 'CHONBURI',
    name: 'ROBOSS ชลบุรี',
    shortName: 'ชลบุรี',
    type: 'car',
    ownershipType: 'franchise',
    franchiseCode: 'F-CHON-01',
    address: '99 ถ.สุขุมวิท ต.บ้านสวน อ.เมืองชลบุรี จ.ชลบุรี',
    area: 'ชลบุรี',
    lat: 13.3611,
    lng: 100.9847,
    hours: '07:00 - 21:00',
    promptPayId: '0894567890',
    promptPayName: 'ROBOSS ชลบุรี',
    ownerName: 'Chonburi Franchise Co., Ltd.',
    mapsUrl: 'https://maps.app.goo.gl/H1xqWbL8BETheHpc6',
    supportPhone: '038-555-010',
    pointsEarnRate: 12,
  },
  {
    id: 'branch_b01',
    code: 'MOTO_RAMA9',
    name: 'ROBOSS มอเตอร์ไซค์ พระราม 9',
    shortName: 'มอไซค์ พระราม 9',
    type: 'bike',
    ownershipType: 'franchise',
    franchiseCode: 'F-MOTO-01',
    address: '1/2 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร',
    area: 'กรุงเทพมหานคร',
    lat: 13.7485,
    lng: 100.572,
    hours: '06:00 - 22:00',
    promptPayId: '0898901234',
    promptPayName: 'ROBOSS มอเตอร์ไซค์ พระราม 9',
    ownerName: 'Moto Franchise Co., Ltd.',
    mapsUrl: 'https://maps.app.goo.gl/vAZEwXHVvJkPc7yJ7',
    supportPhone: '02-111-0009',
    pointsEarnRate: 10,
  },
];

const branchPackageOverrides: Record<string, Partial<Record<string, { S?: number; M?: number; L?: number; isVisible?: boolean }>>> = {
  branch_c01: {
    pkg_special: { S: 329, M: 389, L: 459 },
  },
  branch_c02: {
    pkg_quick: { S: 109, M: 119, L: 139 },
  },
  branch_c04: {
    pkg_shine: { S: 149, M: 159, L: 179 },
    pkg_special: { S: 359, M: 419, L: 489 },
  },
  branch_b01: {
    pkg_moto_quick: { S: 39, M: 49, L: 59 },
  },
};

const coupons = [
  {
    id: 'coupon_welcome_all',
    code: 'WELCOME50',
    title: 'สมาชิกใหม่ลด 50%',
    description: 'ใช้ได้ครั้งแรกทุกสาขา',
    scope: 'all_branches' as const,
    discountType: 'percent' as const,
    discountValue: 50,
    minSpend: 0,
    maxUses: 1000,
    maxUsesPerUser: 1,
    packageIds: [] as string[],
    branchIds: [] as string[],
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2026-12-31'),
  },
  {
    id: 'coupon_ram109_local',
    code: 'RAM109NEW',
    title: 'รามอินทรา 109 ลด 40%',
    description: 'เฉพาะสาขารามอินทรา 109',
    scope: 'branch_only' as const,
    discountType: 'percent' as const,
    discountValue: 40,
    minSpend: 150,
    maxUses: 300,
    maxUsesPerUser: 1,
    packageIds: ['pkg_quick', 'pkg_shine'],
    branchIds: ['branch_c01'],
    validFrom: new Date('2025-06-01'),
    validUntil: new Date('2026-12-31'),
  },
  {
    id: 'coupon_east_combo',
    code: 'EAST30',
    title: 'ฝั่งตะวันออกลด 30 บาท',
    description: 'ใช้ได้เฉพาะชลบุรีและสาขาที่เลือก',
    scope: 'selected_branches' as const,
    discountType: 'fixed' as const,
    discountValue: 30,
    minSpend: 99,
    maxUses: 500,
    maxUsesPerUser: 2,
    packageIds: [],
    branchIds: ['branch_c04', 'branch_b01'],
    validFrom: new Date('2025-06-01'),
    validUntil: new Date('2026-12-31'),
  },
];

const promotions = [
  {
    id: 'promo_summer',
    title: 'โปรหน้าร้อน ลด 20%',
    description: 'ล้างรถทุกสาขาลด 20%',
    branchIds: [],
    gradient: 'from-red-600 to-orange-500',
    conditions: 'จำกัด 1 ครั้งต่อคน',
    validFrom: new Date('2026-03-01'),
    validUntil: new Date('2026-06-30'),
  },
  {
    id: 'promo_rama9_open',
    title: 'เปิดสาขาพระราม 9',
    description: 'ฉลองเปิดสาขาใหม่',
    branchIds: ['branch_c02', 'branch_b01'],
    gradient: 'from-blue-600 to-cyan-500',
    conditions: 'เฉพาะ 100 สิทธิ์แรก',
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
  },
];

const rewards = [
  {
    id: 'reward_discount_30',
    code: 'DISC30',
    name: 'เธชเนเธงเธเธฅเธ” 30 เธเธฒเธ—',
    description: 'เนเธเนเนเธ”เนเธเธฑเธเธ—เธธเธเนเธเนเธเน€เธเธ',
    pointsCost: 300,
    category: 'discount',
    icon: 'tag',
    iconBg: 'bg-orange-500/20',
    sortOrder: 1,
    branchIds: [],
  },
  {
    id: 'reward_discount_50',
    code: 'DISC50',
    name: 'เธชเนเธงเธเธฅเธ” 50 เธเธฒเธ—',
    description: 'เนเธเนเนเธ”เนเธเธฑเธเธ—เธธเธเนเธเนเธเน€เธเธ',
    pointsCost: 500,
    category: 'discount',
    icon: 'tag',
    iconBg: 'bg-orange-500/20',
    sortOrder: 2,
    branchIds: [],
  },
  {
    id: 'reward_special_100',
    code: 'DISC100',
    name: 'เธชเนเธงเธเธฅเธ” 100 เธเธฒเธ—',
    description: 'เนเธเนเนเธ”เนเธเธฑเธเนเธเนเธ SPECIAL MODE',
    pointsCost: 800,
    category: 'discount',
    tag: 'HOT',
    icon: 'tag',
    iconBg: 'bg-red-500/20',
    sortOrder: 3,
    branchIds: [],
  },
  {
    id: 'reward_vacuum',
    code: 'VACFREE',
    name: 'เธ”เธนเธ”เธเธธเนเธเธเธฃเธต',
    description: 'เธเธฃเธดเธเธฒเธฃเธ”เธนเธ”เธเธธเนเธเธ เธฒเธขเนเธเธเธฃเธต 1 เธเธฃเธฑเนเธ',
    pointsCost: 500,
    category: 'service',
    icon: 'wind',
    iconBg: 'bg-blue-500/20',
    sortOrder: 4,
    branchIds: ['branch_c01', 'branch_c02', 'branch_c04'],
  },
  {
    id: 'reward_free_wash',
    code: 'FREEWASH',
    name: 'เธฅเนเธฒเธเธฃเธ–เธเธฃเธต 1 เธเธฃเธฑเนเธ',
    description: 'QUICK & CLEAN เนเธเธชเน S-M',
    pointsCost: 2000,
    category: 'service',
    tag: 'BEST',
    icon: 'car',
    iconBg: 'bg-green-500/20',
    sortOrder: 5,
    branchIds: [],
  },
];

const testUsers = [
  {
    id: 'user_demo_001',
    lineUserId: 'dev_user_001',
    displayName: 'Demo User',
    tier: 'gold' as const,
    totalPoints: 1250,
    totalWashes: 14,
    phone: '0811111111',
  },
  {
    id: 'user_demo_002',
    lineUserId: 'dev_user_002',
    displayName: 'Branch Loyal Customer',
    tier: 'silver' as const,
    totalPoints: 620,
    totalWashes: 8,
    phone: '0822222222',
  },
];

async function upsertPackages() {
  for (const pkg of packages) {
    await prisma.washPackage.upsert({
      where: { id: pkg.id },
      update: {
        code: pkg.code,
        name: pkg.name,
        description: pkg.description,
        vehicleType: pkg.vehicleType,
        priceS: pkg.priceS,
        priceM: pkg.priceM,
        priceL: pkg.priceL,
        steps: pkg.steps,
        stepDuration: pkg.stepDuration,
        image: pkg.image ?? null,
        sortOrder: pkg.sortOrder,
        isActive: true,
      },
      create: pkg,
    });
  }
}

async function upsertBranches() {
  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: {
        code: branch.code,
        name: branch.name,
        shortName: branch.shortName,
        address: branch.address,
        area: branch.area,
        type: branch.type,
        ownershipType: branch.ownershipType,
        franchiseCode: branch.franchiseCode ?? null,
        lat: branch.lat,
        lng: branch.lng,
        hours: branch.hours,
        promptPayId: branch.promptPayId,
        promptPayName: branch.promptPayName,
        ownerName: branch.ownerName ?? null,
        mapsUrl: branch.mapsUrl,
        isActive: true,
      },
      create: {
        id: branch.id,
        code: branch.code,
        name: branch.name,
        shortName: branch.shortName,
        address: branch.address,
        area: branch.area,
        type: branch.type,
        ownershipType: branch.ownershipType,
        franchiseCode: branch.franchiseCode ?? null,
        lat: branch.lat,
        lng: branch.lng,
        hours: branch.hours,
        promptPayId: branch.promptPayId,
        promptPayName: branch.promptPayName,
        ownerName: branch.ownerName ?? null,
        mapsUrl: branch.mapsUrl,
        isActive: true,
      },
    });

    await prisma.branchSettings.upsert({
      where: { branchId: branch.id },
      update: {
        supportPhone: branch.supportPhone,
        pointsEarnRate: branch.pointsEarnRate ?? 10,
        allowsPointRedemption: true,
      },
      create: {
        branchId: branch.id,
        supportPhone: branch.supportPhone,
        pointsEarnRate: branch.pointsEarnRate ?? 10,
      },
    });
  }
}

async function upsertMachines() {
  for (const branch of branches) {
    const isBikeBranch = branch.type === 'bike';
    const configs = isBikeBranch
      ? [
          { id: `${branch.id}_moto_01`, code: 'B1', name: 'ตู้ล้างมอเตอร์ไซค์ B1', type: 'motorcycle', espDeviceId: `ESP32-${branch.code}-B1`, sortOrder: 1 },
          { id: `${branch.id}_moto_02`, code: 'B2', name: 'ตู้ล้างมอเตอร์ไซค์ B2', type: 'motorcycle', espDeviceId: `ESP32-${branch.code}-B2`, sortOrder: 2 },
        ]
      : [
          { id: `${branch.id}_car_01`, code: 'A1', name: 'ตู้ล้างรถ A1', type: 'car', espDeviceId: `ESP32-${branch.code}-A1`, sortOrder: 1 },
          { id: `${branch.id}_car_02`, code: 'A2', name: 'ตู้ล้างรถ A2', type: 'car', espDeviceId: `ESP32-${branch.code}-A2`, sortOrder: 2 },
          { id: `${branch.id}_moto_01`, code: 'B1', name: 'ตู้ล้างมอเตอร์ไซค์ B1', type: 'motorcycle', espDeviceId: `ESP32-${branch.code}-B1`, sortOrder: 3 },
        ];

    for (const machine of configs) {
      await prisma.machine.upsert({
        where: { id: machine.id },
        update: {
          branchId: branch.id,
          code: machine.code,
          name: machine.name,
          type: machine.type,
          espDeviceId: machine.espDeviceId,
          status: 'idle',
          isEnabled: true,
          sortOrder: machine.sortOrder,
        },
        create: {
          ...machine,
          branchId: branch.id,
          status: 'idle',
          isEnabled: true,
        },
      });
    }
  }
}

async function upsertBranchPackageConfigs() {
  for (const branch of branches) {
    const allowedPackageIds =
      branch.type === 'bike'
        ? ['pkg_moto_quick', 'pkg_moto_shine']
        : ['pkg_quick', 'pkg_shine', 'pkg_special', 'pkg_vacuum'];

    for (const packageId of allowedPackageIds) {
      const override = branchPackageOverrides[branch.id]?.[packageId];
      await prisma.branchPackageConfig.upsert({
        where: {
          branchId_packageId: {
            branchId: branch.id,
            packageId,
          },
        },
        update: {
          isActive: true,
          isVisible: override?.isVisible ?? true,
          priceOverrideS: override?.S ?? null,
          priceOverrideM: override?.M ?? null,
          priceOverrideL: override?.L ?? null,
        },
        create: {
          branchId: branch.id,
          packageId,
          isActive: true,
          isVisible: override?.isVisible ?? true,
          priceOverrideS: override?.S ?? null,
          priceOverrideM: override?.M ?? null,
          priceOverrideL: override?.L ?? null,
        },
      });
    }
  }
}

async function upsertCoupons() {
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { id: coupon.id },
      update: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        scope: coupon.scope,
        status: 'active',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minSpend: coupon.minSpend,
        maxUses: coupon.maxUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        packageIds: coupon.packageIds,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
      },
      create: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        scope: coupon.scope,
        status: 'active',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minSpend: coupon.minSpend,
        maxUses: coupon.maxUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        packageIds: coupon.packageIds,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
      },
    });

    for (const branchId of coupon.branchIds) {
      await prisma.couponBranchLink.upsert({
        where: {
          couponId_branchId: {
            couponId: coupon.id,
            branchId,
          },
        },
        update: {},
        create: {
          couponId: coupon.id,
          branchId,
        },
      });
    }
  }
}

async function upsertPromotions() {
  for (const promotion of promotions) {
    await prisma.promotion.upsert({
      where: { id: promotion.id },
      update: promotion,
      create: promotion,
    });
  }
}

async function upsertRewards() {
  for (const reward of rewards) {
    await prisma.rewardCatalog.upsert({
      where: { id: reward.id },
      update: reward,
      create: reward,
    });
  }
}

async function upsertUsersAndWallets() {
  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        lineUserId: user.lineUserId,
        displayName: user.displayName,
        phone: user.phone,
        tier: user.tier,
        totalPoints: user.totalPoints,
        totalWashes: user.totalWashes,
      },
      create: {
        ...user,
      },
    });

    const wallet = await prisma.pointWallet.upsert({
      where: { userId: user.id },
      update: {
        balance: user.totalPoints,
        lifetimeEarned: user.totalPoints,
        lifetimeRedeemed: 0,
      },
      create: {
        userId: user.id,
        balance: user.totalPoints,
        lifetimeEarned: user.totalPoints,
        lifetimeRedeemed: 0,
      },
    });

    await prisma.pointsTransaction.upsert({
      where: { id: `pt_init_${user.id}` },
      update: {
        walletId: wallet.id,
        amount: user.totalPoints,
        balanceAfter: user.totalPoints,
        description: 'Initial seed balance',
      },
      create: {
        id: `pt_init_${user.id}`,
        walletId: wallet.id,
        userId: user.id,
        type: 'adjust',
        amount: user.totalPoints,
        balanceAfter: user.totalPoints,
        description: 'Initial seed balance',
      },
    });

    await prisma.stamp.upsert({
      where: { id: `stamp_${user.id}` },
      update: {
        userId: user.id,
        currentCount: Math.min(user.totalWashes, 10),
        targetCount: 10,
        rewardClaimed: false,
      },
      create: {
        id: `stamp_${user.id}`,
        userId: user.id,
        currentCount: Math.min(user.totalWashes, 10),
        targetCount: 10,
      },
    });

    await prisma.piggyBank.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  await prisma.userCoupon.upsert({
    where: { userId_couponId: { userId: 'user_demo_001', couponId: 'coupon_welcome_all' } },
    update: { status: 'claimed' },
    create: {
      userId: 'user_demo_001',
      couponId: 'coupon_welcome_all',
      status: 'claimed',
    },
  });

  await prisma.feedback.upsert({
    where: { id: 'feedback_seed_001' },
    update: {
      userId: 'user_demo_001',
      branchId: 'branch_c01',
      type: 'service',
      message: 'Need help checking a recent wash and points posting.',
      status: 'pending',
      adminNotes: null,
      resolvedAt: null,
    },
    create: {
      id: 'feedback_seed_001',
      userId: 'user_demo_001',
      branchId: 'branch_c01',
      type: 'service',
      message: 'Need help checking a recent wash and points posting.',
      status: 'pending',
    },
  });
}

async function upsertAdmins() {
  const hqPassword = await bcrypt.hash('admin123', 12);
  const branchPassword = await bcrypt.hash('manager123', 12);
  const eastPassword = await bcrypt.hash('branch123', 12);

  const hqAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@roboss.co.th' },
    update: {
      name: 'ROBOSS HQ Admin',
      role: 'hq_admin',
      isActive: true,
    },
    create: {
      email: 'admin@roboss.co.th',
      passwordHash: hqPassword,
      name: 'ROBOSS HQ Admin',
      role: 'hq_admin',
    },
  });

  const ramaAdmin = await prisma.adminUser.upsert({
    where: { email: 'rama.manager@roboss.co.th' },
    update: {
      name: 'Bangkok Branch Admin',
      role: 'branch_admin',
      isActive: true,
    },
    create: {
      email: 'rama.manager@roboss.co.th',
      passwordHash: branchPassword,
      name: 'Bangkok Branch Admin',
      role: 'branch_admin',
    },
  });

  const eastAdmin = await prisma.adminUser.upsert({
    where: { email: 'east.manager@roboss.co.th' },
    update: {
      name: 'East Zone Branch Admin',
      role: 'branch_admin',
      isActive: true,
    },
    create: {
      email: 'east.manager@roboss.co.th',
      passwordHash: eastPassword,
      name: 'East Zone Branch Admin',
      role: 'branch_admin',
    },
  });

  const scopes = [
    { adminUserId: ramaAdmin.id, branchId: 'branch_c01' },
    { adminUserId: ramaAdmin.id, branchId: 'branch_c02' },
    { adminUserId: eastAdmin.id, branchId: 'branch_c04' },
    { adminUserId: eastAdmin.id, branchId: 'branch_b01' },
  ];

  for (const scope of scopes) {
    await prisma.adminBranchScope.upsert({
      where: {
        adminUserId_branchId: {
          adminUserId: scope.adminUserId,
          branchId: scope.branchId,
        },
      },
      update: {
        canManageCoupons: true,
        canManageMachines: true,
        canViewRevenue: true,
      },
      create: scope,
    });
  }

  await prisma.auditLog.upsert({
    where: { id: 'audit_seed_hq_admin' },
    update: {
      actorType: 'admin',
      adminUserId: hqAdmin.id,
      action: 'seed.bootstrap',
      entityType: 'system',
      entityId: 'seed',
    },
    create: {
      id: 'audit_seed_hq_admin',
      actorType: 'admin',
      adminUserId: hqAdmin.id,
      action: 'seed.bootstrap',
      entityType: 'system',
      entityId: 'seed',
      metadata: { source: 'prisma.seed.ts' },
    },
  });
}

async function main() {
  console.log('Seeding ROBOSS Sprint 1 foundation...');

  await upsertPackages();
  await upsertBranches();
  await upsertMachines();
  await upsertBranchPackageConfigs();
  await upsertCoupons();
  await upsertPromotions();
  await upsertRewards();
  await upsertUsersAndWallets();
  await upsertAdmins();

  console.log(`Seed completed:
  branches: ${branches.length}
  packages: ${packages.length}
  coupons: ${coupons.length}
  promotions: ${promotions.length}
  rewards: ${rewards.length}
  test users: ${testUsers.length}
  admins: 3`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
