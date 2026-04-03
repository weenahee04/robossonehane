import 'dotenv/config';
import {
  getSupportedPaymentProviderNames,
} from '../src/services/payment-provider.js';

function maskValue(value: string | undefined) {
  if (!value?.trim()) {
    return '<unset>';
  }

  if (value.length <= 8) {
    return '<set>';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function main() {
  const providerName = process.env.PAYMENT_PROVIDER_NAME || 'mock_promptpay';
  const supported = getSupportedPaymentProviderNames();
  const isProduction = (process.env.NODE_ENV || 'development') === 'production';

  console.log(`Selected provider: ${providerName}`);
  console.log(`Supported adapters: ${supported.join(', ')}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PAYMENT_PROVIDER_CREATE_URL: ${process.env.PAYMENT_PROVIDER_CREATE_URL || '<unset>'}`);
  console.log(`PAYMENT_PROVIDER_VERIFY_URL: ${process.env.PAYMENT_PROVIDER_VERIFY_URL || '<unset>'}`);
  console.log(`PAYMENT_PROVIDER_CALLBACK_URL: ${process.env.PAYMENT_PROVIDER_CALLBACK_URL || '<unset>'}`);
  console.log(
    `PAYMENT_PROVIDER_WEBHOOK_SECRET: ${maskValue(process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET)}`
  );
  console.log(
    `PAYMENT_PROVIDER_SIGNATURE_SECRET: ${maskValue(process.env.PAYMENT_PROVIDER_SIGNATURE_SECRET)}`
  );

  if (!supported.includes(providerName)) {
    console.error(
      `Unsupported payment provider "${providerName}". Add a provider-specific adapter before go-live.`
    );
    process.exit(1);
  }

  if (providerName === 'mock_promptpay') {
    console.warn('mock_promptpay is local/dev only and cannot be used for production payment acceptance.');
    if (isProduction) {
      process.exit(1);
    }
    return;
  }

  if (providerName === 'generic_rest') {
    console.warn(
      'generic_rest is only a scaffold adapter. Exact provider payloads, signature rules, status mapping, and verify/reconcile behavior still need to be encoded before production.'
    );
    if (isProduction) {
      process.exit(1);
    }
  }

  if (!process.env.PAYMENT_PROVIDER_CREATE_URL) {
    console.error('PAYMENT_PROVIDER_CREATE_URL is missing.');
    process.exit(1);
  }

  if (!process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET) {
    console.error('PAYMENT_PROVIDER_WEBHOOK_SECRET is missing.');
    process.exit(1);
  }
}

main();
