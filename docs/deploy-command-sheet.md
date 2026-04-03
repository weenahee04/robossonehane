# ROBOSS Deploy Command Sheet

เอกสารนี้สรุปคำสั่ง deploy แบบ copy-paste สำหรับ `staging` และ `production` โดยอิงจาก:

- [DEPLOY.md](/C:/Users/PC/Downloads/roboare/robossoneman/DEPLOY.md)
- [docs/prisma-baseline-resolve-runbook.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/prisma-baseline-resolve-runbook.md)
- [docs/go-live-checklist.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/go-live-checklist.md)
- [docs/operations-runbook.md](/C:/Users/PC/Downloads/roboare/robossoneman/docs/operations-runbook.md)

เอกสารนี้ตั้งใจให้ใช้กับ PowerShell เป็นหลัก

ถ้าต้องการภาพรวม deployment, เหตุผลของแต่ละขั้น, หรือ guardrails หลักของระบบ ให้กลับไปอ่าน [DEPLOY.md](/C:/Users/PC/Downloads/roboare/robossoneman/DEPLOY.md)

## Rules ก่อน deploy

- ใช้จากโฟลเดอร์ [backend](/C:/Users/PC/Downloads/roboare/robossoneman/backend)
- สำหรับ shared `staging` / `production` DB ที่มีข้อมูลอยู่แล้ว ห้ามใช้ `npx prisma db push`
- ห้ามใช้ `npx prisma migrate dev` หรือ `npx prisma migrate reset` บน shared DB
- ถ้า DB ไม่ว่างและ migration history ยังไม่ครบ ให้ใช้ `prisma migrate resolve --applied` ตาม runbook ก่อน
- `20260402_customer_profile_settings_fix` มี data backfill ของ `user_settings` จึงห้าม resolve ข้ามถ้า table/column/data ยังไม่ครบ
- `npm run db:seed` ใช้ได้เฉพาะ environment ที่ตั้งใจให้มี demo/reference data เท่านั้น
- production ไม่ควรรัน `npm run db:seed` แบบเหมารวม เพราะ `seed.ts` มี branch/package/coupon/promotion/reward/demo user/admin data

## Current migrations

ตอนนี้ repo มี 4 migrations:

1. `20260401_sprint1_franchise_foundation`
2. `20260402_admin_promotions_notifications_rewards_feedback`
3. `20260402_customer_profile_settings_fix`
4. `20260402_sprint3_payment_webhooks`

## Shared setup

ใช้ block นี้ก่อนเริ่มทั้ง staging และ production

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend
npm install
```

## Baseline / Resolve decision

ใช้ `baseline/resolve` เฉพาะเมื่อ target DB เป็น non-empty DB ที่มี schema อยู่แล้ว แต่ `_prisma_migrations` ยังไม่ครบหรือยังไม่ตรงกับ repo

ใช้ flow นี้:

1. รัน `prisma migrate status`
2. รัน `prisma migrate diff`
3. ตรวจ object/data จริงใน DB
4. `resolve --applied` เฉพาะ migration ที่ apply ไปแล้วจริง
5. ค่อย `prisma migrate deploy`

ถ้า DB ใหม่หรือ migration history ถูกต้องอยู่แล้ว ให้ข้าม `resolve` และไป `prisma migrate deploy` ได้เลย

## SQL helper commands

ใช้คำสั่งเหล่านี้เพื่อตรวจ DB ผ่าน Prisma CLI โดยไม่ต้องพึ่ง `psql`

### ดู table หลักใน `public`

```powershell
@'
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### ดู `_prisma_migrations`

```powershell
@'
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY finished_at NULLS FIRST, migration_name;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### ตรวจ `user_settings` backfill

```powershell
@'
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### ตรวจ payment webhook columns

```powershell
@'
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'provider',
    'provider_ref',
    'provider_status',
    'last_webhook_at',
    'last_reconciled_at',
    'reconciliation_attempts'
  )
ORDER BY column_name;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

## Staging command sheet

### 1. Set env

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend

$env:NODE_ENV="production"
$env:DATABASE_URL="postgresql://<staging-user>:<staging-password>@<staging-host>:5432/<staging-db>?schema=public"
$env:CORS_ORIGIN="https://staging-app.roboss.example,https://staging-admin.roboss.example"
$env:PORT="3001"
$env:JWT_SECRET="<staging-jwt-secret>"
$env:JWT_REFRESH_SECRET="<staging-jwt-refresh-secret>"
$env:LINE_CHANNEL_ID="<staging-line-channel-id>"
$env:LINE_CHANNEL_SECRET="<staging-line-channel-secret>"
$env:MQTT_BROKER_URL="mqtts://<staging-broker>:8883"
$env:MQTT_TOPIC_PREFIX="roboss"
$env:MACHINE_EVENT_SECRET="<staging-machine-event-secret>"
$env:PAYMENT_PROVIDER_NAME="<staging-provider-name>"
$env:PAYMENT_PROVIDER_CREATE_URL="https://<staging-payment-provider>/create"
$env:PAYMENT_PROVIDER_VERIFY_URL="https://<staging-payment-provider>/verify/:providerRef"
$env:PAYMENT_PROVIDER_API_KEY="<staging-payment-api-key>"
$env:PAYMENT_PROVIDER_WEBHOOK_SECRET="<staging-payment-webhook-secret>"
$env:AUTH_ALLOW_DEV_LOGIN="false"
$env:ALLOW_SIMULATED_WASH="false"
$env:PAYMENT_ALLOW_MANUAL_CONFIRM="false"
```

### 2. Backup / check DB

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
pg_dump --clean --if-exists --no-owner --no-privileges $env:DATABASE_URL > "roboss-staging-predeploy-$timestamp.sql"
```

```powershell
@'
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 3. Prisma migrate status

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

```powershell
npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script
```

### 4. Baseline / resolve if needed

ใช้เฉพาะเมื่อ staging DB ไม่ว่างและ schema ใน DB มี object/data ของ migration นั้นอยู่แล้วจริง

#### 4A. Resolve ครบทั้ง 4 migrations

```powershell
npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_admin_promotions_notifications_rewards_feedback --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_customer_profile_settings_fix --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_sprint3_payment_webhooks --schema prisma/schema.prisma
```

#### 4B. Resolve เฉพาะ migration ที่ apply ไปแล้วจริง

ตัวอย่างกรณี DB มีแค่ foundation อยู่แล้ว:

```powershell
npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
```

ก่อน resolve `20260402_customer_profile_settings_fix` ให้ตรวจ backfill:

```powershell
@'
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 5. Prisma migrate deploy

```powershell
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

### 6. Verify DB after migrate

```powershell
npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script
```

```powershell
@'
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

```powershell
@'
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'provider',
    'provider_ref',
    'provider_status',
    'last_webhook_at',
    'last_reconciled_at',
    'reconciliation_attempts'
  )
ORDER BY column_name;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 7. Build / start backend

```powershell
npm run verify:env
npm run verify:production
npm test
npm run build
```

ถ้า deploy แบบ manual/self-hosted:

```powershell
npm run start
```

ถ้า deploy ผ่าน Railway ให้ตั้ง build/start command ของ service เป็น:

```text
Build command: npm run build
Start command: npm run start
```

### 8. Seed / backfill

ถ้า staging ตั้งใจให้มี demo/reference data:

```powershell
npm run db:seed
```

ถ้า migration ไหนต้องมี backfill เฉพาะจุดใน staging ให้ใช้ SQL/script แยก ไม่ใช้ `db:seed` แทน business data จริงโดยอัตโนมัติ

### 9. Frontend / admin build

ถ้า release นี้รวม frontend ด้วย:

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman
npm install
npm run build

cd C:\Users\PC\Downloads\roboare\robossoneman\admin-dashboard
npm install
npm run build
```

### 10. Verify endpoints

```powershell
Invoke-WebRequest http://localhost:3001/health | Select-Object -ExpandProperty Content
Invoke-WebRequest http://localhost:3001/ready | Select-Object -ExpandProperty Content
```

หรือถ้าตรวจบน deployed staging URL:

```powershell
Invoke-WebRequest https://<staging-api-host>/health | Select-Object -ExpandProperty Content
Invoke-WebRequest https://<staging-api-host>/ready | Select-Object -ExpandProperty Content
```

### 11. Smoke checks after deploy

```powershell
$env:ROBOSS_SMOKE_BASE_URL="https://<staging-api-host>"
npm run smoke
npm run smoke:payment-provider
```

ถ้าต้องการ admin login smoke:

```powershell
$env:ROBOSS_SMOKE_BASE_URL="https://<staging-api-host>"
$env:ROBOSS_SMOKE_ADMIN_EMAIL="admin@roboss.co.th"
$env:ROBOSS_SMOKE_ADMIN_PASSWORD="<rotated-staging-admin-password>"
npm run smoke
```

## Production command sheet

### 1. Set env

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend

$env:NODE_ENV="production"
$env:DATABASE_URL="postgresql://<prod-user>:<prod-password>@<prod-host>:5432/<prod-db>?schema=public"
$env:CORS_ORIGIN="https://app.roboss.example,https://admin.roboss.example"
$env:PORT="3001"
$env:JWT_SECRET="<prod-jwt-secret>"
$env:JWT_REFRESH_SECRET="<prod-jwt-refresh-secret>"
$env:LINE_CHANNEL_ID="<prod-line-channel-id>"
$env:LINE_CHANNEL_SECRET="<prod-line-channel-secret>"
$env:MQTT_BROKER_URL="mqtts://<prod-broker>:8883"
$env:MQTT_TOPIC_PREFIX="roboss"
$env:MACHINE_EVENT_SECRET="<prod-machine-event-secret>"
$env:PAYMENT_PROVIDER_NAME="<real-provider-name>"
$env:PAYMENT_PROVIDER_CREATE_URL="https://<prod-payment-provider>/create"
$env:PAYMENT_PROVIDER_VERIFY_URL="https://<prod-payment-provider>/verify/:providerRef"
$env:PAYMENT_PROVIDER_API_KEY="<prod-payment-api-key>"
$env:PAYMENT_PROVIDER_WEBHOOK_SECRET="<prod-payment-webhook-secret>"
$env:AUTH_ALLOW_DEV_LOGIN="false"
$env:ALLOW_SIMULATED_WASH="false"
$env:PAYMENT_ALLOW_MANUAL_CONFIRM="false"
```

### 2. Backup / check DB

```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
pg_dump --clean --if-exists --no-owner --no-privileges $env:DATABASE_URL > "roboss-prod-predeploy-$timestamp.sql"
```

```powershell
@'
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 3. Prisma migrate status

```powershell
npx prisma migrate status --schema prisma/schema.prisma
```

```powershell
npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script
```

### 4. Baseline / resolve if needed

ใช้เฉพาะเมื่อ production DB ไม่ว่างและ migration history ยังไม่ครบ

#### 4A. Resolve ครบทั้ง 4 migrations

```powershell
npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_admin_promotions_notifications_rewards_feedback --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_customer_profile_settings_fix --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_sprint3_payment_webhooks --schema prisma/schema.prisma
```

#### 4B. Resolve เฉพาะ migration ที่เคย apply จริง

ตัวอย่าง:

```powershell
npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
```

ก่อน resolve `20260402_customer_profile_settings_fix` ให้ยืนยันว่า `user_settings` ถูก backfill แล้ว:

```powershell
@'
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 5. Prisma migrate deploy

```powershell
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

### 6. Verify DB after migrate

```powershell
npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script
```

```powershell
@'
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

```powershell
@'
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN (
    'provider',
    'provider_ref',
    'provider_status',
    'last_webhook_at',
    'last_reconciled_at',
    'reconciliation_attempts'
  )
ORDER BY column_name;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma
```

### 7. Build / start backend

```powershell
npm run verify:env
npm run verify:production
npm test
npm run verify:system
npm run build
```

ถ้า deploy แบบ manual/self-hosted:

```powershell
npm run start
```

ถ้า deploy ผ่าน Railway ให้ตั้ง build/start command ของ service เป็น:

```text
Build command: npm run build
Start command: npm run start
```

### 8. Seed / backfill

production default:

```text
Do not run: npm run db:seed
```

ถ้าต้องมี post-migrate data backfill ให้ใช้ SQL/script เฉพาะงานนั้น และ review ก่อนรัน

### 9. Frontend / admin build

ถ้า release นี้รวม frontend ด้วย:

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman
npm install
npm run build

cd C:\Users\PC\Downloads\roboare\robossoneman\admin-dashboard
npm install
npm run build
```

### 10. Verify endpoints

```powershell
Invoke-WebRequest https://<prod-api-host>/health | Select-Object -ExpandProperty Content
Invoke-WebRequest https://<prod-api-host>/ready | Select-Object -ExpandProperty Content
```

### 11. Smoke checks after deploy

```powershell
$env:ROBOSS_SMOKE_BASE_URL="https://<prod-api-host>"
npm run smoke
npm run smoke:payment-provider
```

ถ้าจะรัน admin login smoke ให้ใช้ account ที่ rotate password แล้ว:

```powershell
$env:ROBOSS_SMOKE_BASE_URL="https://<prod-api-host>"
$env:ROBOSS_SMOKE_ADMIN_EMAIL="<rotated-prod-admin-email>"
$env:ROBOSS_SMOKE_ADMIN_PASSWORD="<rotated-prod-admin-password>"
npm run smoke
```

## Post-deploy checklist

### Staging

- `/health` ตอบ `200`
- `/ready` ตอบ `200`
- `npm run smoke` ผ่าน
- `npm run smoke:payment-provider` ผ่าน
- admin login ผ่านด้วย account ที่ใช้จริง
- ทดสอบ 1 wash flow end-to-end กับ staging DB จริง
- ตรวจ payment webhook และ reconcile flow
- ตรวจ machine heartbeat / event ingestion ด้วย `x-machine-event-secret`
- ตรวจ websocket update ทั้ง customer และ admin
- ถ้าใช้ demo seed ให้ยืนยันว่าข้อมูล demo ไม่ชนกับข้อมูล test สำคัญ

### Production

- `/health` ตอบ `200`
- `/ready` ตอบ `200`
- `npm run smoke` ผ่าน
- `npm run smoke:payment-provider` รายงาน provider config ถูกตัว
- admin login ผ่านด้วย account ที่ rotate password แล้ว
- dev-only flags ยังเป็น `false`
- `CORS_ORIGIN` ไม่มี `localhost`, `127.0.0.1`, หรือ `*`
- payment provider ไม่ใช่ `mock_promptpay` หรือ `generic_rest`
- webhook secret / machine event secret ถูก rotate ตาม environment
- verify 1 production-safe operational flow ตาม maintenance window ที่ทีมอนุมัติ

## Cautions

- non-empty DB: ห้าม assume ว่า `migrate deploy` จะใช้ได้ทันที ต้องดู `migrate status`, `migrate diff`, และ object/data ใน DB ก่อน
- baseline/resolve: `resolve --applied` ไม่ได้เปลี่ยน schema จริง มันแค่บอก Prisma ว่า migration นั้นถูก apply ไปแล้ว
- data backfill: migration `20260402_customer_profile_settings_fix` มี backfill ของ `user_settings` จึงต้องตรวจจำนวนข้อมูลหลัง deploy
- demo seed: `npm run db:seed` มี demo branch/package/coupon/promotion/reward/admin/user data ใช้ได้เฉพาะ staging ที่ตั้งใจให้มีข้อมูลตัวอย่าง
- rollback: Prisma ไม่มี down migration flow สำหรับเคสนี้ ดังนั้น rollback ที่ปลอดภัยสุดคือ restore จาก DB backup/snapshot

## Blockers / assumptions ที่ยังเหลือ

- ยังต้องยืนยัน schema จริงของแต่ละ target environment ตอน deploy จริงด้วย `migrate diff` และ SQL inspection ก่อนตัดสินใจว่า migration ไหนควร `resolve --applied`
- เอกสารนี้สมมติว่าเครื่องที่ใช้ deploy มี `pg_dump`, Node.js, npm และ Prisma CLI ใช้งานได้
- เอกสารนี้สมมติว่าทีมรู้ host จริงของ `staging` / `production` สำหรับ API, frontend, admin, MQTT และ payment provider แล้ว
- `db:seed` ยังเป็นสคริปต์รวม ไม่ได้แยก targeted production-safe seed/backfill ออกมาต่างหาก
- ถ้า Railway/Netlify เป็นผู้ start service จริง ขั้นตอน `npm run start` ในเอกสารนี้หมายถึง start command ของ service หรือใช้ทดสอบแบบ manual เท่านั้น
