# Backend Public Deploy on Railway

This guide is for getting the ROBOSS backend onto a public staging URL quickly so the Vercel customer portal can call real APIs.

## Goal

Deploy the backend in a staging-safe mode:

- public URL from Railway
- Railway-hosted Postgres instead of local Docker Postgres
- Clerk auth enabled
- Vercel portal allowed by CORS
- machine/payment production requirements deferred until real infrastructure is ready

## Why staging mode first

The backend currently blocks strict production startup when these are missing:

- real payment provider adapter + secrets
- real MQTT broker + machine command secrets
- strong production secrets everywhere

For a first public test, use:

- `NODE_ENV=staging`
- `CLERK_AUTH_MODE=clerk`
- `AUTH_ALLOW_DEV_LOGIN=false`
- `ALLOW_SIMULATED_WASH=false`
- `PAYMENT_ALLOW_MANUAL_CONFIRM=false`

This keeps the public environment safer without forcing every production integration to exist on day one.

## Files already prepared

- `backend/Dockerfile`
- `backend/railway.json`
- `backend/.env.railway.staging.example`

Deploy from:

- `C:\Users\PC\Downloads\roboare\robossoneman\backend`

## Step 1: Login to Railway

In a terminal:

```powershell
railway login
```

This step is interactive and must be completed with the Railway account owner.

## Step 2: Initialize a Railway project from the backend directory

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend
railway init
```

Recommended project name:

- `roboss-backend-staging`

## Step 3: Add PostgreSQL in Railway

After the project is created:

```powershell
railway add
```

Choose:

- `PostgreSQL`

Then verify the project has:

- one backend service
- one PostgreSQL service

## Step 4: Set staging variables

Use the values from:

- `backend/.env.railway.staging.example`

At minimum, set these on the backend service:

- `DATABASE_URL`
- `CORS_ORIGIN=https://roboss-portal.vercel.app`
- `CLERK_AUTH_MODE=clerk`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_KEY`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `AUTH_ALLOW_DEV_LOGIN=false`
- `ALLOW_SIMULATED_WASH=false`
- `PAYMENT_ALLOW_MANUAL_CONFIRM=false`
- `PAYMENT_PROVIDER_NAME=mock_promptpay`

CLI example:

```powershell
railway variables set CORS_ORIGIN=https://roboss-portal.vercel.app
railway variables set CLERK_AUTH_MODE=clerk
```

For multiline public keys like `CLERK_JWT_KEY`, use the Railway dashboard or paste carefully in the CLI.

## Step 5: Apply database schema

Once Railway Postgres exists and `DATABASE_URL` is set, deploy once and then run:

```powershell
railway run npm run db:generate
railway run npx prisma migrate deploy --schema prisma/schema.prisma
railway run npm run db:seed
```

Important:

- `db:seed` is still bootstrap/demo seed. Review before using it on any customer-facing environment.

## Step 6: Deploy

```powershell
railway up
```

Then get the generated Railway domain:

```powershell
railway domain
```

If no public domain exists yet, generate one in the Railway dashboard or CLI.

## Step 7: Verify backend

Check:

- `https://<your-railway-backend>/health`
- `https://<your-railway-backend>/ready`

Expected:

- `/health` returns `ok: true`
- `/ready` should be healthy enough for staging, though it may still show warnings for missing production-only infrastructure

## Step 8: Point Vercel portal to Railway

After you have the public backend URL:

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman
echo https://<your-railway-backend> | vercel env add VITE_API_URL production
echo https://<your-railway-backend> | vercel env add VITE_API_URL preview
vercel --prod --yes
```

## Step 9: End-to-end test

Test this flow:

1. Open `https://roboss-portal.vercel.app/sign-in`
2. Sign in with LINE through Clerk
3. Confirm backend exchange succeeds
4. Load profile
5. Complete profile if needed
6. Load branches, coupons, promotions, notifications

## Known blockers after public staging

- payment provider is still mock/staging
- MQTT is not public yet
- machine command delivery is not verified with real hardware
- production secrets are not finalized
- custom domain is not configured yet

## Recommended next move after Railway deploy

1. get a stable Railway backend URL
2. wire `VITE_API_URL` on Vercel
3. verify Clerk + LINE on Vercel URL
4. then decide on custom domains and LINE Rich Menu entry URL
