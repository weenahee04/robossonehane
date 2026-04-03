# Backend Public Deploy on Render

This guide is the fastest path to get the ROBOSS backend on a public URL for free staging, so the Vercel customer portal can call a real API.

## What this setup gives you

- public backend URL on `onrender.com`
- free Render Postgres database
- Clerk auth enabled
- CORS already pointed at `https://roboss-portal.vercel.app`
- staging-safe startup settings

## Files already prepared

- `render.yaml`
- `backend/Dockerfile`
- `backend/.dockerignore`
- `backend/.env.railway.staging.example` as the staging env checklist

## Important free-tier limits

Render free services are good for public testing and staging, not for long-term production.

Notable limits from Render pricing/docs:

- free web service available
- free Postgres available
- free Postgres has a 30-day limit

Sources:

- [Render Pricing](https://render.com/pricing)
- [Render Postgres docs](https://render.com/docs/postgresql)

## Step 1: Push your latest code to GitHub

Render Blueprints work best from a connected Git repository.

Make sure this repo is pushed with:

- `render.yaml` at repo root
- `backend/Dockerfile`

## Step 2: Create a Blueprint in Render

In Render dashboard:

1. Click `New +`
2. Choose `Blueprint`
3. Connect your GitHub repo
4. Select this repository
5. Render will detect `render.yaml`

The blueprint will create:

- `roboss-backend-staging` web service
- `roboss-postgres-staging` Postgres database

## Step 3: Fill required secrets

Render will prompt for these because `sync: false` is set:

- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_KEY`
- `CLERK_WEBHOOK_SECRET`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`

Generated automatically:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`

## Step 4: Wait for the first deploy

The backend will build from:

- `backend/Dockerfile`

Health check path:

- `/ready`

## Step 5: Run Prisma migration in Render Shell

After the service and Postgres database are up:

1. Open the backend service in Render
2. Open `Shell`
3. Run:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

If you explicitly want demo/bootstrap data in staging:

```bash
npm run db:seed
```

Do not run `db:seed` on a customer-facing environment unless you want demo data there.

## Step 6: Verify the backend URL

Open:

- `https://<your-render-service>.onrender.com/health`
- `https://<your-render-service>.onrender.com/ready`

Expected:

- `/health` returns `ok: true`
- `/ready` returns healthy enough for staging

## Step 7: Point Vercel portal to Render

After you have the Render backend URL, set it on Vercel:

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman
echo https://<your-render-service>.onrender.com | vercel env add VITE_API_URL production
echo https://<your-render-service>.onrender.com | vercel env add VITE_API_URL preview
vercel --prod --yes
```

## Step 8: Test the live flow

Test this exact sequence:

1. Open `https://roboss-portal.vercel.app/sign-in`
2. Sign in with LINE
3. Confirm Clerk exchange succeeds
4. Confirm profile loads
5. Confirm branches and coupons load from the Render backend

## Remaining blockers after free staging

- payment provider is still mock/staging
- MQTT is not configured publicly
- machine command flow is not verified with real hardware
- custom domain is not configured yet
- free Postgres is temporary and should not be treated as production
