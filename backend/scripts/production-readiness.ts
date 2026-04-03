import 'dotenv/config';
import { getSupportedPaymentProviderNames } from '../src/services/payment-provider.js';
import { getMqttTopicPrefix } from '../src/services/mqtt.js';
import { validateRuntimeEnv } from '../src/lib/config.js';

type CheckStatus = 'ready' | 'blocked' | 'needs-input';

type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
  requiredInputs?: string[];
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function isUnsafePlaceholder(value: string | undefined) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes('change-me') ||
    normalized.includes('replace-with-') ||
    normalized.includes('your-') ||
    normalized.includes('example') ||
    normalized.includes('placeholder')
  );
}

function buildCheckResults() {
  const env = process.env;
  const providerName = env.PAYMENT_PROVIDER_NAME || 'mock_promptpay';
  const customerAuthMode = env.CLERK_AUTH_MODE === 'clerk' ? 'clerk' : 'legacy';
  const supportedProviders = getSupportedPaymentProviderNames();
  const issues = validateRuntimeEnv(env);
  const errorKeys = new Set(issues.filter((issue) => issue.level === 'error').map((issue) => issue.key));
  const issueKeys = new Set(issues.map((issue) => issue.key));
  const results: CheckResult[] = [];

  if (providerName === 'mock_promptpay' || providerName === 'generic_rest') {
    results.push({
      name: 'Payment provider',
      status: 'needs-input',
      detail:
        'Repo still points to a scaffold adapter. Production money acceptance needs a real provider-specific adapter and real endpoint/auth/webhook data.',
      requiredInputs: [
        'PAYMENT_PROVIDER_NAME',
        'PAYMENT_PROVIDER_CREATE_URL',
        'PAYMENT_PROVIDER_VERIFY_URL (if provider supports verify/reconcile)',
        'PAYMENT_PROVIDER_API_KEY or equivalent auth credential',
        'PAYMENT_PROVIDER_WEBHOOK_SECRET and/or signature scheme details',
        'Real webhook payload samples and provider status mapping',
      ],
    });
  } else if (errorKeys.has('PAYMENT_PROVIDER_CREATE_URL') || errorKeys.has('PAYMENT_PROVIDER_VERIFY_URL')) {
    results.push({
      name: 'Payment provider',
      status: 'blocked',
      detail: 'A live provider name is set, but endpoint configuration is still incomplete or placeholder.',
      requiredInputs: ['PAYMENT_PROVIDER_CREATE_URL', 'PAYMENT_PROVIDER_VERIFY_URL (if used)'],
    });
  } else {
    results.push({
      name: 'Payment provider',
      status: 'ready',
      detail: `Configured for adapter "${providerName}". Supported adapters in code: ${supportedProviders.join(', ')}.`,
    });
  }

  if (!hasValue(env.LINE_CHANNEL_ID) || !hasValue(env.LINE_CHANNEL_SECRET) || isUnsafePlaceholder(env.LINE_CHANNEL_ID) || isUnsafePlaceholder(env.LINE_CHANNEL_SECRET)) {
    results.push({
      name: 'LINE credentials',
      status: 'needs-input',
      detail: 'LINE Login credentials are missing or still placeholder values.',
      requiredInputs: ['LINE_CHANNEL_ID', 'LINE_CHANNEL_SECRET'],
    });
  } else {
    results.push({
      name: 'LINE credentials',
      status: 'ready',
      detail: 'LINE credentials are present.',
    });
  }

  if (customerAuthMode === 'clerk') {
    const missingClerkInputs = [
      !hasValue(env.CLERK_SECRET_KEY) || isUnsafePlaceholder(env.CLERK_SECRET_KEY)
        ? 'CLERK_SECRET_KEY'
        : null,
      !hasValue(env.CLERK_PUBLISHABLE_KEY) || isUnsafePlaceholder(env.CLERK_PUBLISHABLE_KEY)
        ? 'CLERK_PUBLISHABLE_KEY'
        : null,
      !hasValue(env.CLERK_JWT_KEY) || isUnsafePlaceholder(env.CLERK_JWT_KEY)
        ? 'CLERK_JWT_KEY'
        : null,
      !hasValue(env.CLERK_WEBHOOK_SECRET) || isUnsafePlaceholder(env.CLERK_WEBHOOK_SECRET)
        ? 'CLERK_WEBHOOK_SECRET'
        : null,
    ].filter(Boolean) as string[];

    results.push({
      name: 'Clerk customer auth',
      status: missingClerkInputs.length === 0 ? 'ready' : 'needs-input',
      detail:
        missingClerkInputs.length === 0
          ? 'Clerk mode is enabled and all required backend credentials are present.'
          : 'Clerk mode is enabled, but one or more Clerk credentials are missing or still placeholders.',
      requiredInputs: missingClerkInputs.length > 0 ? missingClerkInputs : undefined,
    });
  } else {
    results.push({
      name: 'Clerk customer auth',
      status: 'needs-input',
      detail:
        'Customer auth is still in legacy mode. Switch CLERK_AUTH_MODE=clerk only after Clerk + customer portal deploy settings are ready.',
      requiredInputs: ['CLERK_AUTH_MODE=clerk when ready', 'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'CLERK_JWT_KEY', 'CLERK_WEBHOOK_SECRET'],
    });
  }

  if (
    issueKeys.has('JWT_SECRET') ||
    issueKeys.has('JWT_REFRESH_SECRET') ||
    isUnsafePlaceholder(env.JWT_SECRET) ||
    isUnsafePlaceholder(env.JWT_REFRESH_SECRET)
  ) {
    results.push({
      name: 'JWT secrets',
      status: 'needs-input',
      detail: 'JWT secrets are missing or too weak for production.',
      requiredInputs: ['JWT_SECRET (32+ chars)', 'JWT_REFRESH_SECRET (different 32+ chars)'],
    });
  } else {
    results.push({
      name: 'JWT secrets',
      status: 'ready',
      detail: 'JWT access and refresh secrets pass runtime validation.',
    });
  }

  const unsafeFlags = [
    env.AUTH_ALLOW_DEV_LOGIN === 'true' ? 'AUTH_ALLOW_DEV_LOGIN' : null,
    env.PAYMENT_ALLOW_MANUAL_CONFIRM === 'true' ? 'PAYMENT_ALLOW_MANUAL_CONFIRM' : null,
    env.ALLOW_SIMULATED_WASH === 'true' ? 'ALLOW_SIMULATED_WASH' : null,
  ].filter(Boolean) as string[];

  results.push({
    name: 'Dev-only flags',
    status: unsafeFlags.length === 0 ? 'ready' : 'blocked',
    detail:
      unsafeFlags.length === 0
        ? 'Dev-only login/manual confirm/simulated wash flags are disabled.'
        : `Unsafe flags still enabled: ${unsafeFlags.join(', ')}`,
  });

  const mqttInputsMissing =
    !hasValue(env.MQTT_BROKER_URL) ||
    errorKeys.has('MACHINE_EVENT_SECRET') ||
    isUnsafePlaceholder(env.MACHINE_EVENT_SECRET);

  results.push({
    name: 'MQTT / machine command readiness',
    status: mqttInputsMissing ? 'needs-input' : 'ready',
    detail: mqttInputsMissing
      ? 'Machine command channel still needs real broker connectivity and/or a strong machine event secret.'
      : `Broker URL and machine secret are present. Topic prefix: ${getMqttTopicPrefix()}`,
    requiredInputs: mqttInputsMissing
      ? ['MQTT_BROKER_URL', 'MQTT_USERNAME (if required)', 'MQTT_PASSWORD (if required)', 'MACHINE_EVENT_SECRET']
      : undefined,
  });

  return { issues, results };
}

function printResults() {
  const { issues, results } = buildCheckResults();
  const blockers = results.filter((result) => result.status !== 'ready');
  const exactInputs = blockers.flatMap((result) => result.requiredInputs ?? []);

  console.log('ROBOSS production readiness');
  console.log(`Status: ${blockers.length === 0 ? 'READY_FOR_STAGING_REVIEW' : 'NOT_READY'}`);

  console.log('\nChecklist:');
  results.forEach((result) => {
    console.log(`- [${result.status === 'ready' ? 'x' : ' '}] ${result.name}: ${result.detail}`);
  });

  console.log('\nRuntime validation:');
  if (issues.length === 0) {
    console.log('- No runtime validation issues');
  } else {
    issues.forEach((issue) => {
      console.log(`- [${issue.level}] ${issue.key}: ${issue.message}`);
    });
  }

  console.log('\nExact inputs still required:');
  if (exactInputs.length === 0) {
    console.log('- None from env validation');
  } else {
    [...new Set(exactInputs)].forEach((input) => console.log(`- ${input}`));
  }

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

printResults();
