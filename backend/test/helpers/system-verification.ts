import 'dotenv/config';

type StepResult = {
  name: string;
  passed: boolean;
  detail: string;
};

export type SystemVerificationResult = {
  ok: boolean;
  goNoGo: 'go' | 'no-go';
  criteria: Array<{ name: string; passed: boolean }>;
  blockers: string[];
  steps: StepResult[];
  artifacts: {
    userId: string | null;
    sessionId: string | null;
    paymentId: string | null;
    branchId: string;
    machineId: string;
    packageId: string;
  };
};

type AppLike = {
  request: (input: string, init?: RequestInit) => Promise<Response>;
};

function applyVerificationEnv() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.AUTH_ALLOW_DEV_LOGIN = 'true';
  process.env.ALLOW_SIMULATED_WASH = 'true';
  process.env.PAYMENT_ALLOW_MANUAL_CONFIRM = 'true';
  process.env.PAYMENT_PROVIDER_NAME = process.env.PAYMENT_PROVIDER_NAME || 'mock_promptpay';
  process.env.MACHINE_EVENT_SECRET =
    process.env.MACHINE_EVENT_SECRET || 'change-me-before-staging';
}

async function requestJson<T>(
  app: AppLike,
  path: string,
  init: RequestInit = {},
  token?: string,
  extraHeaders: Record<string, string> = {}
) {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));

  const response = await app.request(`http://localhost${path}`, {
    ...init,
    headers,
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : {};
  return { response, body: body as T };
}

function pushStep(steps: StepResult[], name: string, passed: boolean, detail: string) {
  steps.push({ name, passed, detail });
}

function summarizeSet(values: string[]) {
  return values.slice().sort().join(', ');
}

export async function runSystemVerification(): Promise<SystemVerificationResult> {
  applyVerificationEnv();

  const steps: StepResult[] = [];
  const artifacts = {
    userId: null as string | null,
    sessionId: null as string | null,
    paymentId: null as string | null,
    branchId: 'branch_c01',
    machineId: 'branch_c01_car_01',
    packageId: 'pkg_quick',
  };

  const cleanupTasks: Array<() => Promise<void>> = [];

  const { createApp } = await import('../../src/app.js');
  const { prisma } = await import('../../src/lib/prisma.js');

  const app = createApp();

  try {
    const candidateMachine = await prisma.machine.findFirst({
      where: {
        branchId: { in: ['branch_c01', 'branch_c02'] },
        type: 'car',
        isEnabled: true,
        sessions: {
          none: {
            status: {
              in: ['pending_payment', 'ready_to_wash', 'in_progress'],
            },
          },
        },
      },
      orderBy: [{ branchId: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        branchId: true,
        status: true,
      },
    });

    if (!candidateMachine) {
      throw new Error('No rama branch machine is available for system verification');
    }

    artifacts.branchId = candidateMachine.branchId;
    artifacts.machineId = candidateMachine.id;

    const originalConfig = await prisma.branchPackageConfig.findUniqueOrThrow({
      where: {
        branchId_packageId: {
          branchId: artifacts.branchId,
          packageId: artifacts.packageId,
        },
      },
    });

    if (!['idle', 'reserved'].includes(candidateMachine.status)) {
      await requestJson(
        app,
        '/api/machines/heartbeat',
        {
          method: 'POST',
          body: JSON.stringify({
            machineId: artifacts.machineId,
            branchId: artifacts.branchId,
          }),
        },
        undefined,
        { 'x-machine-event-secret': process.env.MACHINE_EVENT_SECRET! }
      );
    }

    cleanupTasks.push(async () => {
      await prisma.branchPackageConfig.update({
        where: {
          branchId_packageId: {
            branchId: artifacts.branchId,
            packageId: artifacts.packageId,
          },
        },
        data: {
          isActive: originalConfig.isActive,
          isVisible: originalConfig.isVisible,
          displayName: originalConfig.displayName,
          descriptionOverride: originalConfig.descriptionOverride,
          priceOverrideS: originalConfig.priceOverrideS,
          priceOverrideM: originalConfig.priceOverrideM,
          priceOverrideL: originalConfig.priceOverrideL,
        },
      });
    });

    const authConfig = await requestJson<{ data: { devLoginEnabled: boolean } }>(
      app,
      '/api/auth/config'
    );
    pushStep(
      steps,
      'customer auth bootstrap',
      authConfig.response.ok && authConfig.body.data?.devLoginEnabled === true,
      `dev login enabled=${String(authConfig.body.data?.devLoginEnabled)}`
    );

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lineUserId = `e2e_${uniqueSuffix}`;
    const login = await requestJson<{
      data: {
        user: { id: string; lineUserId: string };
        tokens: { accessToken: string; refreshToken: string };
      };
    }>(app, '/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ lineUserId }),
    });

    const accessToken = login.body.data?.tokens?.accessToken;
    const refreshToken = login.body.data?.tokens?.refreshToken;
    artifacts.userId = login.body.data?.user?.id ?? null;

    pushStep(
      steps,
      'customer login',
      login.response.status === 200 && Boolean(accessToken) && Boolean(refreshToken),
      `user=${artifacts.userId ?? 'missing'} lineUserId=${login.body.data?.user?.lineUserId ?? 'missing'}`
    );

    if (!artifacts.userId || !accessToken || !refreshToken) {
      throw new Error('Customer login did not return expected tokens/user');
    }

    cleanupTasks.push(async () => {
      await prisma.couponRedemption.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.userCoupon.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.notification.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.feedback.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.vehicle.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.pointsTransaction.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.washSession.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.stamp.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.pointWallet.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.piggyBank.deleteMany({ where: { userId: artifacts.userId! } });
      await prisma.user.delete({ where: { id: artifacts.userId! } });
    });

    const me = await requestJson<{ data: { id: string } }>(app, '/api/auth/me', {}, accessToken);
    const refresh = await requestJson<{
      data: { tokens: { accessToken: string }; user: { id: string } };
    }>(app, '/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    const logout = await requestJson<{ data: { message: string } }>(
      app,
      '/api/auth/logout',
      { method: 'POST' },
      accessToken
    );

    pushStep(
      steps,
      'customer me/refresh/logout',
      me.response.ok &&
        refresh.response.ok &&
        refresh.body.data?.user?.id === artifacts.userId &&
        logout.response.ok,
      `me=${me.response.status} refresh=${refresh.response.status} logout=${logout.response.status}`
    );

    const activeAccessToken = refresh.body.data?.tokens?.accessToken || accessToken;

    const hqLogin = await requestJson<{
      data: {
        admin: { id: string; role: string; branchIds: string[] };
        tokens: { accessToken: string };
      };
    }>(app, '/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@roboss.co.th',
        password: 'admin123',
      }),
    });
    const ramaLogin = await requestJson<{
      data: {
        admin: { id: string; role: string; branchIds: string[] };
        tokens: { accessToken: string };
      };
    }>(app, '/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'rama.manager@roboss.co.th',
        password: 'manager123',
      }),
    });
    const eastLogin = await requestJson<{
      data: {
        admin: { id: string; role: string; branchIds: string[] };
        tokens: { accessToken: string };
      };
    }>(app, '/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'east.manager@roboss.co.th',
        password: 'branch123',
      }),
    });

    const hqToken = hqLogin.body.data?.tokens?.accessToken;
    const ramaToken = ramaLogin.body.data?.tokens?.accessToken;
    const eastToken = eastLogin.body.data?.tokens?.accessToken;
    if (!hqToken || !ramaToken || !eastToken) {
      throw new Error('Admin login did not return expected tokens');
    }

    const ramaMeta = await requestJson<{
      data: { branches: Array<{ id: string }>; admin: { branchIds: string[] } };
    }>(app, '/api/admin/meta', {}, ramaToken);
    const hqMeta = await requestJson<{
      data: { branches: Array<{ id: string }>; admin: { branchIds: string[] } };
    }>(app, '/api/admin/meta', {}, hqToken);

    const ramaBranchIds = ramaMeta.body.data?.branches?.map((branch) => branch.id) ?? [];
    const hqBranchIds = hqMeta.body.data?.branches?.map((branch) => branch.id) ?? [];
    pushStep(
      steps,
      'admin scope visibility bootstrap',
      ramaMeta.response.ok &&
        hqMeta.response.ok &&
        summarizeSet(ramaBranchIds) === summarizeSet(['branch_c01', 'branch_c02']) &&
        hqBranchIds.includes('branch_c01') &&
        hqBranchIds.includes('branch_c04'),
      `rama=${summarizeSet(ramaBranchIds)} hqCount=${hqBranchIds.length}`
    );

    const overridePrice = 177;
    const overrideDisplayName = `E2E QUICK ${uniqueSuffix}`;
    const packageOverride = await requestJson<{
      data: {
        package: {
          branchConfigs: Array<{
            branchId: string;
            effectivePrices: { S: number };
            displayName: string | null;
          }>;
        };
      };
    }>(
      app,
      `/api/admin/packages/${artifacts.packageId}/branches/${artifacts.branchId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          priceOverrideS: overridePrice,
          displayName: overrideDisplayName,
        }),
      },
      hqToken
    );

    const branchAfterOverride = await requestJson<{
      data: {
        packages: Array<{ id: string; name: string; prices: { S: number } }>;
        machines: Array<{ id: string; type: string; status: string; isEnabled: boolean }>;
      };
    }>(app, `/api/branches/${artifacts.branchId}`);
    const packageFromBranch = branchAfterOverride.body.data?.packages?.find(
      (pkg) => pkg.id === artifacts.packageId
    );
    pushStep(
      steps,
      'package override reflected to customer flow',
      packageOverride.response.ok &&
        packageFromBranch?.prices?.S === overridePrice &&
        packageFromBranch?.name === overrideDisplayName,
      `price=${packageFromBranch?.prices?.S ?? 'missing'} name=${packageFromBranch?.name ?? 'missing'} machine=${artifacts.machineId}`
    );

    const scan = await requestJson<{
      data: {
        branch: {
          id: string;
          packages: Array<{ id: string; prices: { S: number } }>;
        };
        machine: { id: string; status: string };
      };
    }>(app, '/api/branches/resolve-scan', {
      method: 'POST',
      body: JSON.stringify({
        qrData: `roboss://${artifacts.branchId}/${artifacts.machineId}`,
      }),
    });

    pushStep(
      steps,
      'scan/resolve branch + machine',
      scan.response.ok &&
        scan.body.data?.branch?.id === artifacts.branchId &&
        scan.body.data?.machine?.id === artifacts.machineId,
      `machineStatus=${scan.body.data?.machine?.status ?? 'missing'}`
    );

    const pointsBefore = await requestJson<{
      data: { balance: number; lifetimeEarned: number; lifetimeRedeemed: number };
    }>(app, '/api/points/balance', {}, activeAccessToken);
    const stampBefore = await requestJson<{
      data: { currentCount: number; targetCount: number };
    }>(app, '/api/stamps', {}, activeAccessToken);

    const createSession = await requestJson<{
      data: {
        id: string;
        status: string;
        totalPrice: number;
        payment: null;
        machine: { status: string };
      };
    }>(app, '/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        branchId: artifacts.branchId,
        machineId: artifacts.machineId,
        packageId: artifacts.packageId,
        carSize: 'S',
        addons: [],
      }),
    }, activeAccessToken);

    artifacts.sessionId = createSession.body.data?.id ?? null;
    pushStep(
      steps,
      'create session',
      createSession.response.status === 201 &&
        createSession.body.data?.status === 'pending_payment' &&
        createSession.body.data?.totalPrice === overridePrice,
      `session=${artifacts.sessionId ?? 'missing'} price=${createSession.body.data?.totalPrice ?? 'missing'}`
    );

    if (!artifacts.sessionId) {
      throw new Error('Session was not created');
    }

    const dbMachineReserved = await prisma.machine.findUniqueOrThrow({
      where: { id: artifacts.machineId },
      select: { status: true },
    });
    pushStep(
      steps,
      'machine reserved after session create',
      dbMachineReserved.status === 'reserved',
      `machineStatus=${dbMachineReserved.status}`
    );

    const createPayment = await requestJson<{
      data: {
        id: string;
        payment: { id: string; status: string; qrPayload: string | null; attempts: Array<{ action: string | null }> };
      };
    }>(app, '/api/payments', {
      method: 'POST',
      body: JSON.stringify({ sessionId: artifacts.sessionId }),
    }, activeAccessToken);

    artifacts.paymentId = createPayment.body.data?.payment?.id ?? null;
    pushStep(
      steps,
      'create payment',
      createPayment.response.status === 201 &&
        createPayment.body.data?.payment?.status === 'pending' &&
        Boolean(createPayment.body.data?.payment?.qrPayload),
      `payment=${artifacts.paymentId ?? 'missing'}`
    );

    if (!artifacts.paymentId) {
      throw new Error('Payment was not created');
    }

    const adminVerify = await requestJson<{ data: { payment: { status: string; attempts: Array<{ action: string | null }> } } }>(
      app,
      `/api/admin/payments/${artifacts.paymentId}/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ note: 'E2E verify pending payment' }),
      },
      hqToken
    );
    const paymentListAfterVerify = await requestJson<{
      data: Array<{
        id: string;
        status: string;
        reconciliationAttempts: number;
        attempts: Array<{ action: string | null }>;
      }>;
    }>(app, `/api/admin/payments?branchId=${artifacts.branchId}`, {}, hqToken);
    const verifiedPayment = paymentListAfterVerify.body.data?.find(
      (payment) => payment.id === artifacts.paymentId
    );

    pushStep(
      steps,
      'payment verify path',
      adminVerify.response.ok &&
        verifiedPayment?.status === 'pending' &&
        (verifiedPayment?.reconciliationAttempts ?? 0) >= 1 &&
        (verifiedPayment?.attempts ?? []).some((attempt) => attempt.action === 'verify_unavailable'),
      `status=${verifiedPayment?.status ?? 'missing'} reconcile=${verifiedPayment?.reconciliationAttempts ?? 0}`
    );

    const confirmPayment = await requestJson<{
      data: { status: string; payment: { id: string; status: string } };
    }>(
      app,
      `/api/payments/${artifacts.paymentId}/confirm`,
      { method: 'POST' },
      activeAccessToken
    );
    pushStep(
      steps,
      'confirm payment',
      confirmPayment.response.ok &&
        confirmPayment.body.data?.status === 'ready_to_wash' &&
        confirmPayment.body.data?.payment?.status === 'confirmed',
      `sessionStatus=${confirmPayment.body.data?.status ?? 'missing'}`
    );

    const startWash = await requestJson<{ data: { status: string; machine: { status: string } } }>(
      app,
      `/api/sessions/${artifacts.sessionId}/start`,
      { method: 'POST' },
      activeAccessToken
    );
    pushStep(
      steps,
      'start wash',
      startWash.response.ok &&
        startWash.body.data?.status === 'in_progress' &&
        startWash.body.data?.machine?.status === 'washing',
      `sessionStatus=${startWash.body.data?.status ?? 'missing'} machine=${startWash.body.data?.machine?.status ?? 'missing'}`
    );

    const machineSecret = process.env.MACHINE_EVENT_SECRET!;
    const progressEvent = await requestJson<{
      data: { session: { id: string; progress: number; status: string; currentStep: number } };
    }>(
      app,
      '/api/machines/events',
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'progress_updated',
          machineId: artifacts.machineId,
          branchId: artifacts.branchId,
          sessionId: artifacts.sessionId,
          progress: 55,
          currentStep: 1,
        }),
      },
      undefined,
      { 'x-machine-event-secret': machineSecret }
    );

    pushStep(
      steps,
      'progress update via machine event',
      progressEvent.response.ok &&
        progressEvent.body.data?.session?.progress === 55 &&
        progressEvent.body.data?.session?.status === 'in_progress',
      `progress=${progressEvent.body.data?.session?.progress ?? 'missing'}`
    );

    const completeEvent = await requestJson<{
      data: { session: { id: string; status: string; progress: number; pointsEarned: number }; machine: { status: string } };
    }>(
      app,
      '/api/machines/events',
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'completed',
          machineId: artifacts.machineId,
          branchId: artifacts.branchId,
          sessionId: artifacts.sessionId,
          progress: 100,
          currentStep: 3,
        }),
      },
      undefined,
      { 'x-machine-event-secret': machineSecret }
    );

    pushStep(
      steps,
      'complete wash',
      completeEvent.response.ok &&
        completeEvent.body.data?.session?.status === 'completed' &&
        completeEvent.body.data?.machine?.status === 'idle',
      `sessionStatus=${completeEvent.body.data?.session?.status ?? 'missing'} machine=${completeEvent.body.data?.machine?.status ?? 'missing'}`
    );

    const sessionHistory = await requestJson<{
      data: Array<{ id: string; status: string; payment: { status: string } | null }>;
    }>(app, '/api/sessions/history?limit=10', {}, activeAccessToken);
    const sessionDetail = await requestJson<{
      data: { id: string; status: string; payment: { status: string } | null; pointsEarned: number };
    }>(app, `/api/sessions/${artifacts.sessionId}`, {}, activeAccessToken);
    const historyEntry = sessionHistory.body.data?.find((session) => session.id === artifacts.sessionId);

    pushStep(
      steps,
      'session history visibility',
      sessionHistory.response.ok &&
        sessionDetail.response.ok &&
        historyEntry?.status === 'completed' &&
        sessionDetail.body.data?.payment?.status === 'confirmed',
      `historyStatus=${historyEntry?.status ?? 'missing'}`
    );

    const pointsAfter = await requestJson<{
      data: { balance: number; lifetimeEarned: number };
    }>(app, '/api/points/balance', {}, activeAccessToken);
    const stampAfter = await requestJson<{
      data: { currentCount: number; targetCount: number };
    }>(app, '/api/stamps', {}, activeAccessToken);
    const pointHistory = await requestJson<{
      data: Array<{ sessionId: string | null; amount: number; type: string }>;
    }>(app, '/api/points/history?limit=10', {}, activeAccessToken);
    const earnedEntry = pointHistory.body.data?.find(
      (entry) => entry.sessionId === artifacts.sessionId && entry.type === 'earn'
    );

    const expectedPointsEarned = overridePrice * 10;
    pushStep(
      steps,
      'points/stamps update',
      pointsAfter.response.ok &&
        stampAfter.response.ok &&
        pointsAfter.body.data.balance === pointsBefore.body.data.balance + expectedPointsEarned &&
        stampAfter.body.data.currentCount === stampBefore.body.data.currentCount + 1 &&
        earnedEntry?.amount === expectedPointsEarned,
      `pointsDelta=${pointsAfter.body.data.balance - pointsBefore.body.data.balance} stampsDelta=${stampAfter.body.data.currentCount - stampBefore.body.data.currentCount}`
    );

    const ramaSessions = await requestJson<{ data: Array<{ id: string }> }>(
      app,
      `/api/admin/sessions?branchId=${artifacts.branchId}&limit=20`,
      {},
      ramaToken
    );
    const ramaCustomers = await requestJson<{ data: Array<{ id: string }> }>(
      app,
      `/api/admin/customers?branchId=${artifacts.branchId}&limit=20`,
      {},
      ramaToken
    );
    const eastForbidden = await requestJson<{ message: string }>(
      app,
      `/api/admin/sessions?branchId=${artifacts.branchId}&limit=20`,
      {},
      eastToken
    );

    pushStep(
      steps,
      'admin branch scope visibility',
      ramaSessions.response.ok &&
        ramaCustomers.response.ok &&
        ramaSessions.body.data.some((session) => session.id === artifacts.sessionId) &&
        ramaCustomers.body.data.some((customer) => customer.id === artifacts.userId) &&
        eastForbidden.response.status === 403,
      `ramaSessions=${ramaSessions.body.data.length} eastStatus=${eastForbidden.response.status}`
    );

    const hqSessions = await requestJson<{ data: Array<{ id: string }> }>(
      app,
      `/api/admin/sessions?branchId=${artifacts.branchId}&limit=20`,
      {},
      hqToken
    );
    const hqPayments = await requestJson<{ data: Array<{ id: string; status: string }> }>(
      app,
      `/api/admin/payments?branchId=${artifacts.branchId}&limit=20`,
      {},
      hqToken
    );
    const hqPackages = await requestJson<{
      data: Array<{
        id: string;
        branchConfigs: Array<{ branchId: string; effectivePrices: { S: number } }>;
      }>;
    }>(app, `/api/admin/packages?branchId=${artifacts.branchId}`, {}, hqToken);
    const hqPackage = hqPackages.body.data.find((pkg) => pkg.id === artifacts.packageId);

    pushStep(
      steps,
      'HQ visibility',
      hqSessions.response.ok &&
        hqPayments.response.ok &&
        hqSessions.body.data.some((session) => session.id === artifacts.sessionId) &&
        hqPayments.body.data.some((payment) => payment.id === artifacts.paymentId && payment.status === 'confirmed') &&
        (hqPackage?.branchConfigs ?? []).some(
          (config) => config.branchId === artifacts.branchId && config.effectivePrices.S === overridePrice
        ),
      `hqSessions=${hqSessions.body.data.length} hqPayments=${hqPayments.body.data.length}`
    );
  } finally {
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop();
      if (!task) continue;
      await task().catch((error) => {
        pushStep(
          steps,
          'cleanup',
          false,
          error instanceof Error ? error.message : 'unknown cleanup error'
        );
      });
    }

    await prisma.$disconnect();
  }

  const criteria = [
    {
      name: 'customer auth bootstrap/login/logout',
      stepNames: ['customer auth bootstrap', 'customer login', 'customer me/refresh/logout'],
    },
    { name: 'scan/resolve branch + machine', stepNames: ['scan/resolve branch + machine'] },
    { name: 'create session', stepNames: ['create session'] },
    { name: 'create payment', stepNames: ['create payment'] },
    { name: 'payment verify path', stepNames: ['payment verify path'] },
    { name: 'confirm payment', stepNames: ['confirm payment'] },
    { name: 'start wash', stepNames: ['start wash'] },
    { name: 'progress update via machine event', stepNames: ['progress update via machine event'] },
    { name: 'complete wash', stepNames: ['complete wash'] },
    { name: 'points/stamps update', stepNames: ['points/stamps update'] },
    { name: 'session history visibility', stepNames: ['session history visibility'] },
    { name: 'admin branch scope visibility', stepNames: ['admin branch scope visibility'] },
    { name: 'HQ visibility', stepNames: ['HQ visibility'] },
    {
      name: 'package override reflected to customer flow',
      stepNames: ['package override reflected to customer flow'],
    },
  ].map((criterion) => ({
    name: criterion.name,
    passed: criterion.stepNames.every((stepName) =>
      steps.some((step) => step.name === stepName && step.passed)
    ),
  }));

  const blockers: string[] = [];
  if ((process.env.PAYMENT_PROVIDER_NAME || 'mock_promptpay') === 'mock_promptpay') {
    blockers.push('Production payment provider adapter is still mock_promptpay.');
  }
  if (process.env.AUTH_ALLOW_DEV_LOGIN !== 'false') {
    blockers.push('AUTH_ALLOW_DEV_LOGIN must be disabled before production.');
  }
  if (process.env.ALLOW_SIMULATED_WASH !== 'false') {
    blockers.push('ALLOW_SIMULATED_WASH must be disabled outside local development.');
  }
  if (process.env.PAYMENT_ALLOW_MANUAL_CONFIRM !== 'false') {
    blockers.push('PAYMENT_ALLOW_MANUAL_CONFIRM must be disabled before production.');
  }
  if (
    !process.env.LINE_CHANNEL_ID ||
    process.env.LINE_CHANNEL_ID.includes('your-line-channel-id') ||
    !process.env.LINE_CHANNEL_SECRET ||
    process.env.LINE_CHANNEL_SECRET.includes('your-line-channel-secret')
  ) {
    blockers.push('Real LINE production credentials are not configured in the current environment.');
  }

  const ok = criteria.every((criterion) => criterion.passed);
  return {
    ok,
    goNoGo: ok && blockers.length === 0 ? 'go' : 'no-go',
    criteria,
    blockers,
    steps,
    artifacts,
  };
}
