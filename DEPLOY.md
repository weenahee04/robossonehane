# ROBOSS Deployment Guide

## How to use this documentation

Use this file as the deployment overview and decision guide for ROBOSS.
It explains the architecture, environment expectations, verification flow, and production guardrails.

For actual deploy commands, use the command sheet:

- [docs/deploy-command-sheet.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/deploy-command-sheet.md)

Recommended reading order:

1. Read [docs/deploy-command-sheet.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/deploy-command-sheet.md) when you need copy-paste commands for `staging` or `production`
2. Return to [DEPLOY.md](/C:/Users/PC/Downloads/roboare/robossoneman/DEPLOY.md) when you need overview, constraints, or rationale behind the steps
3. Read [docs/customer-portal-line-clerk-deploy.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/customer-portal-line-clerk-deploy.md) when preparing the customer portal for LINE Rich Menu entry and Clerk-based customer authentication
4. Read [docs/backend-public-deploy-render.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/backend-public-deploy-render.md) when you need a free staging-safe public backend URL for the Vercel customer portal
5. Read [docs/backend-public-deploy-railway.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/backend-public-deploy-railway.md) only if you choose Railway instead of Render

## Architecture

```text
Consumer Mini-App (Netlify) -> Hono Backend (Railway) -> PostgreSQL (Neon)
Admin Dashboard (Netlify)   -> Hono Backend (Railway)
MQTT / machine events       -> ESP32 machines and realtime updates
```

## Step 1: Provision infrastructure

1. Create PostgreSQL and capture `DATABASE_URL`
2. Provision Railway (or equivalent) for the backend service
3. Prepare production frontend/admin origins for `CORS_ORIGIN`
4. Generate strong secrets for JWT, machine events, and payment webhook validation

## Step 2: Prepare backend

```bash
cd backend
npm install
npm run verify:env
npm run verify:production
```

If you are deploying to `staging` or `production` and want the ready-to-run command sequence, follow:

- [docs/deploy-command-sheet.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/deploy-command-sheet.md)
- [docs/backend-public-deploy-render.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/backend-public-deploy-render.md) for a free public staging backend on Render
- [docs/backend-public-deploy-railway.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/backend-public-deploy-railway.md) if you later switch to Railway

For non-empty staging/production databases, do not use `prisma db push`.
Use the baseline/resolve runbook first:

- [docs/prisma-baseline-resolve-runbook.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/prisma-baseline-resolve-runbook.md)

After baseline is in place, use:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npm test
npm run build
```

Run `npm run db:seed` only for environments where demo/reference data is explicitly intended.

## Step 3: Local verification

```bash
cd backend
npm run dev
```

Useful endpoints:

- `GET http://localhost:3001/`
- `GET http://localhost:3001/health`
- `GET http://localhost:3001/ready`
- `POST http://localhost:3001/api/auth/dev-login`
- `POST http://localhost:3001/api/admin/login`

Smoke check:

```bash
cd backend
npm run smoke
npm run smoke:payment-provider
```

Optional authenticated smoke:

```powershell
$env:ROBOSS_SMOKE_ADMIN_EMAIL='admin@roboss.co.th'
$env:ROBOSS_SMOKE_ADMIN_PASSWORD='admin123'
npm run smoke
```

## Step 4: Frontend and admin build

```bash
cd C:\Users\PC\Downloads\roboare\robossoneman
npm install
npm run build

cd admin-dashboard
npm install
npm run build
```

Frontend env examples:

- customer app: [.env.example](/C:/Users/PC/Downloads/roboare/robossoneman/.env.example)
- admin app: [admin-dashboard/.env.example](/C:/Users/PC/Downloads/roboare/robossoneman/admin-dashboard/.env.example)
- customer portal + Clerk + LINE Rich Menu prep: [docs/customer-portal-line-clerk-deploy.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/customer-portal-line-clerk-deploy.md)

## Step 5: Production backend env

Minimum production variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `CORS_ORIGIN`
- `PORT`
- `NODE_ENV=production`
- `MQTT_BROKER_URL`
- `MQTT_TOPIC_PREFIX` if your machines do not publish under `roboss/...`
- `MACHINE_EVENT_SECRET`
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- `AUTH_ALLOW_DEV_LOGIN=false`
- `ALLOW_SIMULATED_WASH=false`
- `PAYMENT_ALLOW_MANUAL_CONFIRM=false`

If using a live payment provider instead of `mock_promptpay`, also configure:

- a real provider-specific adapter name in `PAYMENT_PROVIDER_NAME`
- `PAYMENT_PROVIDER_CREATE_URL`
- `PAYMENT_PROVIDER_VERIFY_URL` when supported
- `PAYMENT_PROVIDER_API_KEY`
- signature-related env vars when required by the provider

`generic_rest` remains a scaffold adapter only. Do not use it to accept production money without first encoding the real provider payloads, webhook signature rules, exact status mapping, and verify/reconcile behavior.

Use [backend/.env.production.example](/C:/Users/PC/Downloads/roboare/robossoneman/backend/.env.production.example) as the baseline template for staging/production secret stores.

## Step 6: Post-deploy checks

1. Confirm `/health` returns `200`
2. Confirm `/ready` returns `200`
3. Log in to admin with a rotated password
4. Verify one staging wash flow end to end against the real DB
5. Verify payment webhook processing and admin reconcile/verify flow
6. Verify machine heartbeat/event traffic with `x-machine-event-secret`
7. Confirm WebSocket updates reach customer/admin views

## Seeded admin accounts

| Email | Password | Role |
|-------|----------|------|
| admin@roboss.co.th | admin123 | HQ Admin |
| manager@roboss.co.th | manager123 | Branch Manager |
| franchise@roboss.co.th | franchise123 | Franchise Owner |

Rotate all seeded passwords before shared staging or production use.
