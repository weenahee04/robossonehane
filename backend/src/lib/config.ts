type RuntimeEnv = Record<string, string | undefined>;

export interface RuntimeValidationIssue {
  level: 'error' | 'warning';
  key: string;
  message: string;
}

export interface RuntimeConfig {
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  customerAuthMode: 'legacy' | 'clerk';
  corsOrigins: string[];
  enableDevLogin: boolean;
  allowSimulatedWash: boolean;
  allowManualConfirm: boolean;
  authRateLimitWindowMs: number;
  authRateLimitMax: number;
}

const DEFAULT_LOCAL_ORIGINS = ['http://localhost:5173'];
const PLACEHOLDER_PATTERNS = [
  'change-me',
  'replace-with-',
  'your-',
  'example',
  'placeholder',
  'localhost',
];

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return value === 'true';
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isWeakSecret(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.toLowerCase();
  return (
    value.length < 32 ||
    normalized.includes('change-me') ||
    normalized.includes('dev-secret') ||
    normalized.includes('your-super-secret') ||
    normalized.includes('your-refresh-secret')
  );
}

function isPlaceholderValue(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function hasUnsafeProductionOrigin(origins: string[]) {
  return origins.some((origin) => {
    const normalized = origin.trim().toLowerCase();
    return (
      !normalized ||
      normalized === '*' ||
      normalized.includes('localhost') ||
      normalized.includes('127.0.0.1')
    );
  });
}

function isVercelPreviewOrigin(origin: string) {
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin.trim());
}

function isScaffoldPaymentProvider(providerName: string) {
  return providerName === 'mock_promptpay' || providerName === 'generic_rest';
}

export function resolveManualConfirmEnabled(env: RuntimeEnv) {
  const explicit = env.PAYMENT_ALLOW_MANUAL_CONFIRM;
  if (explicit === 'true') {
    return env.NODE_ENV !== 'production';
  }
  if (explicit === 'false') {
    return false;
  }

  return env.NODE_ENV === 'development';
}

export function validateRuntimeEnv(env: RuntimeEnv) {
  const issues: RuntimeValidationIssue[] = [];
  const isProduction = env.NODE_ENV === 'production';
  const providerName = env.PAYMENT_PROVIDER_NAME || 'mock_promptpay';
  const customerAuthMode = env.CLERK_AUTH_MODE === 'clerk' ? 'clerk' : 'legacy';
  const corsOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const requireInAll = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  requireInAll.forEach((key) => {
    if (!env[key]?.trim()) {
      issues.push({ level: 'error', key, message: `${key} is required` });
    }
  });

  if (customerAuthMode === 'clerk') {
    ['CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY'].forEach((key) => {
      if (!env[key]?.trim()) {
        issues.push({
          level: isProduction ? 'error' : 'warning',
          key,
          message: `${key} is required when CLERK_AUTH_MODE=clerk`,
        });
      }
    });
  }

  if (isWeakSecret(env.JWT_SECRET)) {
    issues.push({
      level: isProduction ? 'error' : 'warning',
      key: 'JWT_SECRET',
      message: 'JWT_SECRET should be a strong non-default secret with at least 32 characters',
    });
  }

  if (isWeakSecret(env.JWT_REFRESH_SECRET)) {
    issues.push({
      level: isProduction ? 'error' : 'warning',
      key: 'JWT_REFRESH_SECRET',
      message: 'JWT_REFRESH_SECRET should be a strong non-default secret with at least 32 characters',
    });
  }

  if (!env.CORS_ORIGIN?.trim()) {
    issues.push({
      level: isProduction ? 'error' : 'warning',
      key: 'CORS_ORIGIN',
      message: 'CORS_ORIGIN should list allowed frontend origins',
    });
  } else if (isProduction && hasUnsafeProductionOrigin(corsOrigins)) {
    issues.push({
      level: 'error',
      key: 'CORS_ORIGIN',
      message: 'CORS_ORIGIN must not contain localhost, 127.0.0.1, or wildcard entries in production',
    });
  }

  if (isProduction) {
    if (!env.LINE_CHANNEL_ID?.trim() || !env.LINE_CHANNEL_SECRET?.trim()) {
      issues.push({
        level: 'error',
        key: 'LINE_CHANNEL_ID/LINE_CHANNEL_SECRET',
        message: 'LINE login credentials are required in production',
      });
    } else {
      if (isPlaceholderValue(env.LINE_CHANNEL_ID)) {
        issues.push({
          level: 'error',
          key: 'LINE_CHANNEL_ID',
          message: 'LINE_CHANNEL_ID must be the real environment-specific value in production',
        });
      }

      if (isPlaceholderValue(env.LINE_CHANNEL_SECRET)) {
        issues.push({
          level: 'error',
          key: 'LINE_CHANNEL_SECRET',
          message: 'LINE_CHANNEL_SECRET must be the real environment-specific value in production',
        });
      }
    }

    if (!env.MACHINE_EVENT_SECRET?.trim()) {
      issues.push({
        level: 'error',
        key: 'MACHINE_EVENT_SECRET',
        message: 'MACHINE_EVENT_SECRET is required in production',
      });
    } else if (isWeakSecret(env.MACHINE_EVENT_SECRET)) {
      issues.push({
        level: 'error',
        key: 'MACHINE_EVENT_SECRET',
        message: 'MACHINE_EVENT_SECRET must be a strong non-default secret with at least 32 characters',
      });
    }

    if (!env.MQTT_BROKER_URL?.trim()) {
      issues.push({
        level: 'error',
        key: 'MQTT_BROKER_URL',
        message: 'MQTT_BROKER_URL is required in production for machine command delivery',
      });
    }

    if (parseBoolean(env.AUTH_ALLOW_DEV_LOGIN, false)) {
      issues.push({
        level: 'error',
        key: 'AUTH_ALLOW_DEV_LOGIN',
        message: 'AUTH_ALLOW_DEV_LOGIN must be disabled in production',
      });
    }

    if (parseBoolean(env.ALLOW_SIMULATED_WASH, false)) {
      issues.push({
        level: 'error',
        key: 'ALLOW_SIMULATED_WASH',
        message: 'ALLOW_SIMULATED_WASH must be disabled in production',
      });
    }

    if (env.PAYMENT_ALLOW_MANUAL_CONFIRM === 'true') {
      issues.push({
        level: 'error',
        key: 'PAYMENT_ALLOW_MANUAL_CONFIRM',
        message: 'PAYMENT_ALLOW_MANUAL_CONFIRM must stay disabled in production',
      });
    }

    if (!env.PAYMENT_PROVIDER_WEBHOOK_SECRET?.trim()) {
      issues.push({
        level: 'error',
        key: 'PAYMENT_PROVIDER_WEBHOOK_SECRET',
        message: 'PAYMENT_PROVIDER_WEBHOOK_SECRET is required in production',
      });
    } else if (isWeakSecret(env.PAYMENT_PROVIDER_WEBHOOK_SECRET)) {
      issues.push({
        level: 'error',
        key: 'PAYMENT_PROVIDER_WEBHOOK_SECRET',
        message:
          'PAYMENT_PROVIDER_WEBHOOK_SECRET must be a strong non-default secret with at least 32 characters',
      });
    }

    if (isScaffoldPaymentProvider(providerName)) {
      issues.push({
        level: 'error',
        key: 'PAYMENT_PROVIDER_NAME',
        message:
          'Production payment requires an exact-match provider-specific adapter; mock_promptpay and generic_rest are not safe for go-live',
      });
    }
  }

  if (providerName !== 'mock_promptpay' && !env.PAYMENT_PROVIDER_CREATE_URL?.trim()) {
    issues.push({
      level: 'error',
      key: 'PAYMENT_PROVIDER_CREATE_URL',
      message: 'Live payment provider requires PAYMENT_PROVIDER_CREATE_URL',
    });
  }

  if (providerName !== 'mock_promptpay' && isPlaceholderValue(env.PAYMENT_PROVIDER_CREATE_URL)) {
    issues.push({
      level: 'error',
      key: 'PAYMENT_PROVIDER_CREATE_URL',
      message: 'PAYMENT_PROVIDER_CREATE_URL must point to the real provider endpoint',
    });
  }

  if (
    providerName !== 'mock_promptpay' &&
    env.PAYMENT_PROVIDER_VERIFY_URL?.trim() &&
    isPlaceholderValue(env.PAYMENT_PROVIDER_VERIFY_URL)
  ) {
    issues.push({
      level: 'error',
      key: 'PAYMENT_PROVIDER_VERIFY_URL',
      message: 'PAYMENT_PROVIDER_VERIFY_URL must point to the real provider endpoint',
    });
  }

  return issues;
}

export function getRuntimeConfig(env: RuntimeEnv = process.env): RuntimeConfig {
  const issues = validateRuntimeEnv(env);
  const errors = issues.filter((issue) => issue.level === 'error');

  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.key}: ${issue.message}`).join('\n'));
  }

  const nodeEnv = env.NODE_ENV || 'development';
  const customerAuthMode = env.CLERK_AUTH_MODE === 'clerk' ? 'clerk' : 'legacy';
  const corsOrigins = (env.CORS_ORIGIN || DEFAULT_LOCAL_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowPreviewOrigins = nodeEnv !== 'production';
  const resolvedCorsOrigins = allowPreviewOrigins
    ? Array.from(new Set([...corsOrigins, 'https://*.vercel.app']))
    : corsOrigins;

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    customerAuthMode,
    corsOrigins: resolvedCorsOrigins.length > 0 ? resolvedCorsOrigins : DEFAULT_LOCAL_ORIGINS,
    enableDevLogin: nodeEnv !== 'production' && parseBoolean(env.AUTH_ALLOW_DEV_LOGIN, true),
    allowSimulatedWash: nodeEnv !== 'production' && parseBoolean(env.ALLOW_SIMULATED_WASH, true),
    allowManualConfirm: resolveManualConfirmEnabled(env),
    authRateLimitWindowMs: parsePositiveInt(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authRateLimitMax: parsePositiveInt(env.AUTH_RATE_LIMIT_MAX, 10),
  };
}
