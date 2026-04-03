import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveManualConfirmEnabled,
  validateRuntimeEnv,
} from '../src/lib/config.js';

test('production env rejects unsafe go-live flags', () => {
  const issues = validateRuntimeEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://db',
    JWT_SECRET: 'dev-secret-change-me',
    JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
    CORS_ORIGIN: 'https://app.roboss.co.th',
    PAYMENT_PROVIDER_NAME: 'generic_rest',
    AUTH_ALLOW_DEV_LOGIN: 'true',
    ALLOW_SIMULATED_WASH: 'true',
    PAYMENT_ALLOW_MANUAL_CONFIRM: 'true',
  });

  const keys = issues.filter((issue) => issue.level === 'error').map((issue) => issue.key);
  assert.ok(keys.includes('AUTH_ALLOW_DEV_LOGIN'));
  assert.ok(keys.includes('ALLOW_SIMULATED_WASH'));
  assert.ok(keys.includes('PAYMENT_ALLOW_MANUAL_CONFIRM'));
  assert.ok(keys.includes('MACHINE_EVENT_SECRET'));
  assert.ok(keys.includes('PAYMENT_PROVIDER_NAME'));
});

test('production env rejects placeholder line credentials and localhost origins', () => {
  const issues = validateRuntimeEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://db',
    JWT_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    CORS_ORIGIN: 'https://app.roboss.co.th,http://localhost:5173',
    LINE_CHANNEL_ID: 'your-line-channel-id',
    LINE_CHANNEL_SECRET: 'your-line-channel-secret',
    MACHINE_EVENT_SECRET: 'c'.repeat(40),
    MQTT_BROKER_URL: 'mqtts://broker.roboss.co.th:8883',
    PAYMENT_PROVIDER_NAME: 'provider_x',
    PAYMENT_PROVIDER_CREATE_URL: 'https://payments.roboss.co.th/v1/payments',
    PAYMENT_PROVIDER_WEBHOOK_SECRET: 'd'.repeat(40),
    AUTH_ALLOW_DEV_LOGIN: 'false',
    ALLOW_SIMULATED_WASH: 'false',
    PAYMENT_ALLOW_MANUAL_CONFIRM: 'false',
  });

  const keys = issues.filter((issue) => issue.level === 'error').map((issue) => issue.key);
  assert.ok(keys.includes('CORS_ORIGIN'));
  assert.ok(keys.includes('LINE_CHANNEL_ID'));
  assert.ok(keys.includes('LINE_CHANNEL_SECRET'));
});

test('development manual confirm defaults to enabled', () => {
  assert.equal(resolveManualConfirmEnabled({ NODE_ENV: 'development' }), true);
});

test('staging-like env manual confirm stays disabled unless explicitly enabled', () => {
  assert.equal(resolveManualConfirmEnabled({ NODE_ENV: 'staging' }), false);
  assert.equal(
    resolveManualConfirmEnabled({
      NODE_ENV: 'staging',
      PAYMENT_ALLOW_MANUAL_CONFIRM: 'true',
    }),
    true
  );
});
