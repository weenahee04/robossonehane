# ROBOSS Customer Portal Deploy Checklist

Use this checklist when preparing the customer-facing portal for real users through a LINE Rich Menu entry point with Clerk handling customer authentication.

## Recommended target architecture

```text
LINE Rich Menu -> Customer Portal URL (portal.roboss.co.th)
Customer Portal -> Clerk (LINE social login)
Customer Portal -> ROBOSS Backend API
ROBOSS Backend -> PostgreSQL / payments / MQTT / realtime
```

Recommended rollout path:

1. Keep the admin dashboard and backend operations flow as-is.
2. Migrate customer authentication from custom backend JWT login to Clerk.
3. Use LINE Rich Menu to open the customer portal URL.
4. After Clerk login succeeds, let the frontend send Clerk session tokens to the backend.
5. Update the backend to verify Clerk tokens and map Clerk users to ROBOSS users.

## What you must prepare before deploy

### 1. Public URLs

- Customer portal production URL, e.g. `https://portal.roboss.co.th`
- Admin dashboard production URL, e.g. `https://admin.roboss.co.th`
- Backend API production URL, e.g. `https://api.roboss.co.th`
- WebSocket URL if separated from API

### 2. Clerk

- Clerk application created
- Clerk publishable key
- Clerk secret key
- Clerk JWT verification key
- Clerk webhook secret
- Clerk production instance enabled
- Custom domain in Clerk if you do not want Clerk-hosted auth pages under a Clerk domain

### 3. LINE Login

- LINE Login channel created in LINE Developers
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- Callback URL registered in LINE to match the Clerk LINE connection callback
- Allowed domains updated for the real portal URL

### 4. LINE Official Account / Rich Menu

- LINE Official Account created and connected
- Messaging API channel access token
- Rich menu artwork for all menu states
- Final customer portal entry URL for the Rich Menu
- Decision on entry behavior:
  - `URI action` to open the portal directly
  - or `LIFF` if you specifically need LINE in-app context inside the portal

For the first production release, direct portal entry by URI is the simpler option unless you already need LIFF-only features.

### 5. Backend production secrets

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MACHINE_EVENT_SECRET`
- `PAYMENT_PROVIDER_WEBHOOK_SECRET`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CLERK_JWT_KEY`
- `CORS_ORIGIN`

### 6. Payment / machine infrastructure

- Real payment provider contract and secrets
- Real MQTT broker URL and credentials
- Real machine topic prefix if not `roboss`
- Production machine event secret shared with device/event producer

## Product decisions you should lock before implementation

### Customer identity source

Choose one source of truth:

- Preferred: Clerk user ID is the customer auth identity, and ROBOSS stores a reference to it
- Alternative: Keep LINE user ID as the primary key and mirror it into Clerk metadata

Recommended:

- Store Clerk user ID as the auth identity
- Store LINE user ID in Clerk external account data or metadata
- Keep ROBOSS customer profile, points, stamps, sessions, and vehicles in your own database

### Rich Menu entry mode

Choose one:

- Portal URL directly from Rich Menu
- LIFF app that then forwards into the portal

Recommended first release:

- Rich Menu -> direct HTTPS portal URL
- Let Clerk handle LINE login inside the portal

This keeps the product simpler and avoids coupling portal auth to LIFF too early.

## Implementation tasks still required for Clerk migration

The repo has already completed part of this migration:

- customer app includes `ClerkProvider` wiring
- customer app has `/sign-in` and `/sign-up` routes using Clerk UI components
- backend exposes `/api/auth/clerk/exchange` to exchange a Clerk session token for ROBOSS customer JWTs
- backend can map a Clerk user into the ROBOSS `User` table
- frontend `.env.example` and backend `.env.example` already include Clerk and portal-related placeholders

The remaining work is mostly configuration, production secret setup, and end-to-end verification:

1. Create and configure the Clerk LINE social connection for the production instance
2. Deploy the customer portal with `VITE_CLERK_PUBLISHABLE_KEY` and the real production portal URL
3. Set backend `CLERK_AUTH_MODE=clerk` and real Clerk secrets after the portal can complete sign-in
4. Decide whether rollback to legacy `/api/auth/line*` login should remain available in non-production only
5. Add Clerk webhook handling if you want backend-side user sync on create/update/delete without waiting for first login

## Current repo status snapshot

As of April 3, 2026, the codebase is in a "migration scaffold is implemented, production wiring still pending" state:

- `npm run build` passes for both the customer portal and the backend
- `backend/npm run verify:env` only reports weak local JWT secret warnings
- `backend/npm run verify:production` is not ready yet because production secrets and providers are still placeholders
- backend default auth mode remains `CLERK_AUTH_MODE=legacy`

This means the next practical work should happen in dashboard/configuration screens rather than large code changes.

## Exact deploy handoff sequence from the current state

1. In Clerk, enable LINE as a social connection for the production instance
2. In Clerk, copy the LINE callback URL that Clerk generates
3. In LINE Developers, create or update the LINE Login channel and paste Clerk's callback URL there
4. Deploy the customer portal with:
   - `VITE_API_URL=https://<your-api-domain>`
   - `VITE_WS_URL=wss://<your-api-domain>/ws` when applicable
   - `VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>`
   - `VITE_CUSTOMER_PORTAL_URL=https://<your-portal-domain>`
   - `VITE_LINE_RICH_MENU_ENTRY_URL=https://<your-portal-domain>`
5. Set backend secrets:
   - `CLERK_AUTH_MODE=clerk`
   - `CLERK_SECRET_KEY`
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_JWT_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `LINE_CHANNEL_ID`
   - `LINE_CHANNEL_SECRET`
6. Update backend `CORS_ORIGIN` to include the real portal and admin domains
7. Point the LINE Rich Menu action to the final customer portal URL
8. Test the full flow on a real mobile device from inside LINE

## Important implementation note

The current backend still converts a verified Clerk session into ROBOSS-issued access and refresh JWTs.
That means protected ROBOSS API routes continue to use existing JWT middleware after sign-in.
This is a valid transitional architecture and reduces the number of backend route changes required for go-live.

## CLI-preparable items already added in this repo

- Root `.env.example` now includes frontend placeholders for Clerk and portal entry URLs
- `backend/.env.example` now includes backend placeholders for Clerk, LIFF, and Rich Menu IDs
- `DEPLOY.md` can reference this document as the customer portal deploy preparation guide

## Suggested deployment sequence

1. Finish Clerk migration in the customer app and backend
2. Verify login locally with Clerk dev instance
3. Deploy to staging
4. Register staging callback URLs in LINE and Clerk
5. Test customer portal from a staging Rich Menu entry
6. Switch production secrets
7. Publish production Rich Menu URL
8. Run final UAT on real mobile devices in LINE

## Go-live checks specific to this portal

- Opening from LINE Rich Menu lands on the correct portal URL
- Clerk sign-in with LINE succeeds on real mobile devices
- Returning users keep their session correctly
- Logout works and returns to the customer auth gate
- Customer data maps to the correct ROBOSS account
- Coupons, points, notifications, vehicles, and wash history still load after Clerk migration
- Backend protected routes reject invalid tokens and accept Clerk tokens
