# ROBOSS Operations Runbook

## Health and readiness

- `GET /health` checks process liveness
- `GET /ready` checks runtime config readiness and returns `503` when critical config is missing

## Standard verification

```bash
cd backend
npm run verify:env
npm run verify:production
npm test
npm run smoke
```

Optional admin smoke:

```bash
$env:ROBOSS_SMOKE_ADMIN_EMAIL='admin@roboss.co.th'
$env:ROBOSS_SMOKE_ADMIN_PASSWORD='admin123'
npm run smoke
```

## Payment safety notes

- Manual customer-side payment confirm is disabled automatically in production
- Admin payment verify/reconcile remains available and is audit logged
- If payment status is unclear, prefer `/api/admin/payments/:id/verify` before any manual override

## Machine safety notes

- Machine event API requires `x-machine-event-secret`
- Customer session progress/complete endpoints are blocked in production
- Simulated wash mode must stay disabled in staging/production
- If MQTT is unavailable in production, wash start is rejected instead of silently simulating

## Before opening traffic

- Rotate seeded admin passwords
- Confirm `CORS_ORIGIN` matches deployed frontend/admin origins only
- Confirm payment webhook secret and machine event secret have been rotated per environment
- Confirm `PAYMENT_PROVIDER_NAME` is not `mock_promptpay` or `generic_rest`
- Confirm `MQTT_TOPIC_PREFIX` matches the topic layout used by deployed machines
- Confirm at least one staging wash completed end-to-end with audit records and realtime updates

## Exact inputs that usually block production

- Payment provider contract: create endpoint, verify endpoint, webhook samples, signature rules, status mapping
- LINE production credentials: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`
- Strong secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MACHINE_EVENT_SECRET`, `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- MQTT details: `MQTT_BROKER_URL`, auth if required, and any non-default `MQTT_TOPIC_PREFIX`
