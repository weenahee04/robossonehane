# ROBOSS Go-Live Checklist

## Pre-deploy

- `backend/.env` is based on [backend/.env.example](/C:/Users/PC/Downloads/roboare/robossoneman/backend/.env.example)
- Production env starts from [backend/.env.production.example](/C:/Users/PC/Downloads/roboare/robossoneman/backend/.env.production.example)
- `AUTH_ALLOW_DEV_LOGIN=false` outside local development
- `ALLOW_SIMULATED_WASH=false` outside local development
- `PAYMENT_ALLOW_MANUAL_CONFIRM=false` outside local development
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are unique strong secrets
- `MACHINE_EVENT_SECRET` and `PAYMENT_PROVIDER_WEBHOOK_SECRET` are set and shared securely
- `LINE_CHANNEL_ID` and `LINE_CHANNEL_SECRET` point to the correct environment
- `CORS_ORIGIN` includes only the intended frontend/admin origins and does not contain `localhost`, `127.0.0.1`, or `*`
- Real payment provider URLs are configured before production payment go-live
- `PAYMENT_PROVIDER_NAME` points to a real provider-specific adapter, not `mock_promptpay` or `generic_rest`
- `MQTT_TOPIC_PREFIX` is confirmed with the machine firmware / broker routing setup if a custom prefix is used
- Seeded/default admin passwords are rotated

## Verification

- `cd backend && npm run verify:env`
- `cd backend && npm run verify:production`
- `cd backend && npm test`
- `cd backend && npm run verify:system`
- `cd backend && npm run build`
- `cd backend && npm run smoke`
- `cd admin-dashboard && npm run build`
- `cd C:\Users\PC\Downloads\roboare\robossoneman && npm run build`
- `/health` returns `ok: true`
- `/ready` returns `ok: true`
- Admin login works with a rotated account
- One end-to-end wash on staging completes with real DB writes
- Payment webhook and manual reconcile path are verified on staging
- `cd backend && npm run smoke:payment-provider` reports the intended provider config
- Machine heartbeat/event ingestion is verified with the production secret
- WebSocket updates reach both customer session view and admin monitoring view

## Operational readiness

- Error logs are reachable from the hosting platform
- Database backups / restore process are configured
- A rollback plan exists for backend and frontend deploys
- Support/on-call owner knows how to cancel or reconcile a stuck payment
- Support/on-call owner knows how to put a machine into maintenance mode
- The team has the real provider contract inputs listed in [payment-provider-integration.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/payment-provider-integration.md)

## Follow-up After Go-Live

- Move auth/payment rate limiting to shared infrastructure such as Redis or WAF
- Add DB-backed refresh token revocation / session management
- Add automated end-to-end tests that run against staging
- Add provider-specific payment adapter before production payment activation
