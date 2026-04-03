# ROBOSS Prisma Baseline / Resolve Runbook

ใช้เอกสารนี้กับ environment ที่มีข้อมูลอยู่แล้ว เช่น staging หรือ production ที่ยังไม่มี Prisma migration history ครบ แต่ schema บางส่วนหรือทั้งหมดถูกสร้างไว้ก่อนหน้าแล้วจาก `db push`, manual SQL, หรือ hotfix

เอกสารนี้ตั้งใจให้ใช้ซ้ำได้กับทุก environment โดยแยก 2 กรณีชัดเจน:

1. baseline ครั้งแรกบน non-empty DB
2. deploy migration รอบถัดไปหลัง baseline เสร็จแล้ว

## Scope ของ migration ปัจจุบัน

รายการ migration ใน repo ตอนนี้:

1. `20260401_sprint1_franchise_foundation`
2. `20260402_admin_promotions_notifications_rewards_feedback`
3. `20260402_customer_profile_settings_fix`
4. `20260402_sprint3_payment_webhooks`

ความหมายเชิงปฏิบัติ:

- `20260401_sprint1_franchise_foundation` คือ baseline schema ก้อนใหญ่ของระบบ ROBOSS
- `20260402_admin_promotions_notifications_rewards_feedback` เพิ่ม `reward_catalog`, `notification_campaigns` และขยาย `feedback`
- `20260402_customer_profile_settings_fix` เพิ่ม field ใน `users`, สร้าง `user_settings`, และ backfill `user_settings` สำหรับ user เดิม
- `20260402_sprint3_payment_webhooks` เพิ่ม column/index สำหรับ payment provider webhook และ reconciliation

## ควร baseline / resolve ตัวไหนบ้าง

สำหรับ non-empty DB ห้าม assume ว่าต้อง `migrate deploy` ตรง ๆ เพราะ Prisma จะพยายาม apply migration ที่อาจถูกทำไปแล้วบางส่วนและ fail กลางทางได้

ใช้หลักนี้:

- ถ้า environment นั้นมี schema/functionality ของ migration ก้อนนั้นอยู่แล้วจาก manual apply, `db push`, หรือ hotfix ให้ใช้ `prisma migrate resolve --applied`
- ถ้า migration ก้อนนั้นยังไม่เคยถูก apply จริง ให้ปล่อยให้ `prisma migrate deploy` เป็นคน apply
- ห้าม mark `--applied` โดยไม่ตรวจ schema ก่อน

โดยทั่วไปสำหรับ ROBOSS:

- environment ที่ถูกทำ schema จนตรงกับ local DB ปัจจุบันแล้ว มักต้อง baseline/resolve ครบทั้ง 4 migrations
- environment ที่มีเฉพาะ foundation แต่ยังไม่มี `user_settings` หรือ payment webhook columns อาจ resolve เฉพาะ migration แรก แล้วปล่อย 3 migration หลังให้ `migrate deploy`
- environment ที่มี hotfix เพิ่ม column/table บางส่วนไปแล้ว ต้อง resolve เป็นราย migration หลังจากตรวจ object ที่เกี่ยวข้องครบ

## ก่อนเริ่มจริง

รันจากโฟลเดอร์ backend:

```bash
cd backend
```

เตรียมสิ่งต่อไปนี้ก่อนเสมอ:

1. backup DB ทั้งก้อน
2. maintenance window หรือช่วงที่ไม่มี schema change อื่นชนกัน
3. connection string ของ target environment
4. คนรับผิดชอบยืนยันว่าไม่มี manual DDL อื่นกำลังรันอยู่

ตัวอย่างการชี้ env:

```bash
set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
```

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
```

## Step 1: ตรวจสถานะ migration และ schema ปัจจุบัน

### 1.1 ตรวจ Prisma migration status

```bash
npx prisma migrate status --schema prisma/schema.prisma
```

สิ่งที่ต้องดู:

- มี migration ใน repo ทั้ง 4 ก้อน
- DB target ขึ้นว่า schema drift หรือไม่
- DB target มี `_prisma_migrations` อยู่หรือยัง

### 1.2 ตรวจว่า DB ไม่ว่างจริง

ตัวอย่าง SQL:

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

ถ้า DB มีตาราง business หลักอยู่แล้ว แปลว่าไม่ควรใช้ `prisma migrate reset`

### 1.3 ตรวจ history เดิมใน `_prisma_migrations`

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY finished_at NULLS FIRST, migration_name;
```

ตีความ:

- ถ้า table นี้ยังไม่มี หรือว่างเปล่า = ต้องทำ baseline ครั้งแรก
- ถ้ามีบาง migration แล้ว = resolve/additional apply เฉพาะส่วนที่ขาด

### 1.4 ตรวจความต่างระหว่าง DB ปัจจุบันกับ schema ใน repo

```bash
npx prisma migrate diff ^
  --from-url "%DATABASE_URL%" ^
  --to-schema-datamodel prisma/schema.prisma ^
  --script
```

PowerShell:

```powershell
npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script
```

ผลลัพธ์ที่คาดหวัง:

- ถ้า diff ว่างหรือเหลือน้อยมาก และ object ของ migration มีอยู่ครบแล้ว สามารถ baseline/resolve ได้
- ถ้า diff แสดง object ใหญ่จำนวนมาก เช่น create table หลักเกือบทั้งหมด ห้าม resolve แบบเหมารวม ต้องวางแผน apply จริงก่อน

## Step 2: ตรวจเป็นราย migration ว่า “apply แล้ว” หรือ “ยัง”

ใช้ตารางนี้เป็นตัวช่วยตัดสินใจ

### `20260401_sprint1_franchise_foundation`

ถือว่า apply แล้ว เมื่อ DB มี object หลักครบเป็นส่วนใหญ่ เช่น:

- enums หลัก เช่น `UserTier`, `PaymentStatus`, `AdminRole`
- tables หลัก เช่น `users`, `branches`, `machines`, `wash_packages`, `wash_sessions`, `payments`, `admin_users`
- indexes/foreign keys สำคัญของ foundation

ถ้า DB นี้ถูกสร้างมาจนตรงกับ schema foundation ด้วย manual SQL หรือ `db push` มาก่อน ให้ resolve migration นี้เป็น applied

### `20260402_admin_promotions_notifications_rewards_feedback`

ถือว่า apply แล้ว เมื่อมีอย่างน้อย:

- columns `feedback.branch_id`, `feedback.session_id`, `feedback.admin_notes`, `feedback.resolved_at`
- table `reward_catalog`
- table `notification_campaigns`

### `20260402_customer_profile_settings_fix`

ถือว่า apply แล้ว เมื่อมี:

- columns `users.email`, `users.is_active`, `users.deactivated_at`, `users.deleted_at`
- table `user_settings`
- unique index `user_settings_user_id_key`
- data backfill ของ `user_settings` สำหรับ user เดิมเสร็จแล้วหรือมีวิธี equivalent ที่ยืนยันได้

migration นี้มี data migration ด้วย จึงห้าม resolve ถ้ายังเพิ่ม table/column ไปไม่ครบหรือยังไม่ได้ backfill

### `20260402_sprint3_payment_webhooks`

ถือว่า apply แล้ว เมื่อมี:

- columns ใหม่ใน `payments` เช่น `provider`, `provider_ref`, `provider_status`, `last_webhook_at`, `last_reconciled_at`, `reconciliation_attempts`
- columns ใหม่ใน `payment_attempts` เช่น `source`, `action`, `provider_status`, `event_id`, `note`
- indexes `payments_provider_provider_ref_idx` และ `payment_attempts_event_id_idx`

## Step 3: Baseline migration history สำหรับ non-empty DB

ใช้ step นี้เฉพาะ environment ที่ object มีอยู่แล้ว แต่ migration history ยังไม่ถูกบันทึก

### 3.1 ทำ backup ก่อน

ตัวอย่าง:

```bash
pg_dump --clean --if-exists --no-owner --no-privileges "%DATABASE_URL%" > roboss-pre-baseline.sql
```

ถ้า platform ใช้ snapshot ของ managed DB ให้สร้าง snapshot ก่อนแทนได้ แต่ต้องทำก่อน resolve เสมอ

### 3.2 resolve migration ที่มีอยู่แล้วให้เป็น applied

ตัวอย่างกรณี schema มีครบทั้ง 4 migration แล้ว:

```bash
npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_admin_promotions_notifications_rewards_feedback --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_customer_profile_settings_fix --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_sprint3_payment_webhooks --schema prisma/schema.prisma
```

ถ้า target DB มีเพียงบาง migration:

- resolve เฉพาะ migration ที่ตรวจแล้วว่ามีอยู่จริง
- migration ที่ยังไม่ถูก apply อย่า resolve

### 3.3 ตรวจ history หลัง resolve

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM _prisma_migrations
ORDER BY migration_name;
```

ผลลัพธ์ที่ต้องการ:

- migration ที่ resolve แล้วต้องมี record
- `rolled_back_at` ต้องเป็น `NULL`

## Step 4: Resolve migration ที่เคย hotfix/manual ไปแล้ว

กรณีพบว่า production/staging เคยมี manual SQL บางก้อนมาก่อน เช่น เพิ่ม `user_settings` หรือ payment columns ไปแล้ว ให้ใช้ pattern นี้

1. ตรวจ object และ data ของ migration นั้นให้ครบ
2. ตรวจว่า script ใน migration นั้นไม่มีส่วนที่ยังไม่ถูกทำจริง
3. ค่อย mark migration นั้นเป็น applied

ตัวอย่าง:

```bash
npx prisma migrate resolve --applied 20260402_customer_profile_settings_fix --schema prisma/schema.prisma
```

ห้าม resolve ถ้ายังติดข้อใดข้อหนึ่ง:

- column/table มีไม่ครบ
- index/constraint ยังไม่ตรง
- data backfill สำคัญยังไม่เกิด
- ทีมไม่แน่ใจว่า manual SQL ที่เคยรันตรงกับไฟล์ migration ปัจจุบันหรือไม่

ถ้าไม่แน่ใจ ให้เลือกปลอดภัยกว่า:

- ทำ backup
- เขียน/รัน SQL ให้ schema ตรงก่อน
- แล้วค่อย resolve

## Step 5: Apply migration ใหม่

เมื่อ baseline/resolve เสร็จแล้ว ให้ใช้ flow ปกติของ Prisma:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

ใช้ command นี้ทั้ง staging และ production หลังจาก baseline history เรียบร้อย

สิ่งที่ไม่ควรใช้บน non-empty shared DB:

- `npx prisma migrate dev`
- `npx prisma db push`
- `npx prisma migrate reset`

## Step 6: Verify schema หลัง migrate

### 6.1 ตรวจ status ซ้ำ

```bash
npx prisma migrate status --schema prisma/schema.prisma
```

คาดหวัง:

- `Database schema is up to date!`

### 6.2 ตรวจ diff ซ้ำ

```bash
npx prisma migrate diff ^
  --from-url "%DATABASE_URL%" ^
  --to-schema-datamodel prisma/schema.prisma ^
  --script
```

ถ้าไม่มี output สำคัญ แปลว่า schema ตรงกับ repo แล้ว

### 6.3 ตรวจ object สำคัญด้วย SQL

ตัวอย่าง:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'user_settings'
ORDER BY column_name;

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
```

### 6.4 ตรวจ data backfill สำคัญ

สำหรับ `20260402_customer_profile_settings_fix`:

```sql
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS user_settings_count FROM user_settings;
```

ถ้า `user_settings_count` น้อยกว่าจำนวน user ที่ active อยู่ ควรตรวจซ้ำว่ามี user ใดหลุดจาก backfill

## Step 7: Seed / update data ที่จำเป็น

repo นี้มี `prisma/seed.ts` ซึ่งเป็นลักษณะ upsert-heavy และเหมาะกับ dev/local มากกว่า production data จริง

ใช้หลักนี้:

- staging: รัน seed ได้ถ้าตั้งใจให้มี demo/test data
- production: อย่ารัน seed ทั้งก้อนโดยอัตโนมัติ เว้นแต่ทีมยืนยันว่าข้อมูลใน script เป็นข้อมูลที่ต้องการจริง

คำสั่ง:

```bash
npm run db:seed
```

คำแนะนำสำหรับ production:

- ใช้เฉพาะ targeted data update ที่จำเป็น
- ถ้าต้องมี post-migrate backfill ให้ทำเป็น SQL/script แยกและ review ก่อน
- เพราะ `seed.ts` นี้มี branch, package, coupon, promotion, reward, admin และ demo user data

## Reusable flow สำหรับ environment ใหม่ที่มีข้อมูลอยู่แล้ว

### Path A: schema ใน DB ตรงกับ repo อยู่แล้ว

1. backup DB
2. `prisma migrate status`
3. `prisma migrate diff --from-url ... --to-schema-datamodel ... --script`
4. resolve ทุก migration ที่ตรวจแล้วว่ามี object/data ครบ
5. `prisma migrate deploy`
6. verify status + diff
7. รัน smoke/health checks

### Path B: schema ใน DB ตรงเพียงบางส่วน

1. backup DB
2. ตรวจเป็นราย migration ว่าก้อนไหนทำไปแล้ว
3. resolve เฉพาะก้อนที่ทำไปแล้วจริง
4. `prisma migrate deploy` เพื่อ apply ก้อนที่ยังขาด
5. verify schema/data
6. รัน smoke/health checks

## Deploy checklist สำหรับ staging / production

### ก่อน deploy

- backup DB หรือ snapshot พร้อม restore plan
- ยืนยัน `DATABASE_URL` ชี้ target ถูกตัว
- ยืนยันว่าไม่มี manual schema change อื่นกำลังชน
- รัน `npx prisma migrate status --schema prisma/schema.prisma`
- รัน `npx prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script`
- ตัดสินใจให้ชัดว่า migration ไหนจะ `resolve --applied` และ migration ไหนจะ `deploy`

### ระหว่าง deploy

- resolve เฉพาะ migration ที่ตรวจครบแล้ว
- รัน `npx prisma migrate deploy --schema prisma/schema.prisma`
- หยุดทันทีถ้ามี error เรื่อง table/column/index already exists หรือ drift ที่อธิบายไม่ได้

### หลัง deploy

- รัน `npx prisma migrate status --schema prisma/schema.prisma`
- ตรวจ SQL verification ของ table/column สำคัญ
- ตรวจ data backfill สำคัญ โดยเฉพาะ `user_settings`
- รัน `npm run verify:env`
- รัน `npm run verify:production`
- รัน `npm test`
- รัน `npm run smoke`

## Rollback notes

`prisma migrate resolve` ไม่ rollback schema ให้ และ `prisma migrate deploy` ไม่ใช่ down migration system

แนวทาง rollback ที่ปลอดภัย:

1. restore จาก DB backup/snapshot ถ้า migration ทำ schema/data พัง
2. ถ้าปัญหาเล็กและรู้จุด ให้ทำ forward-fix migration ใหม่แทนการแก้ย้อนหลัง
3. ถ้า mark `resolve --applied` ผิด ต้องตรวจ `_prisma_migrations` อย่างระวังมากก่อนแก้ เพราะ history จะไม่ตรงกับ schema

ข้อสำคัญ:

- อย่าลบ record จาก `_prisma_migrations` สด ๆ บน production โดยไม่มี backup และ review
- อย่าใช้ `db push` เพื่อแก้ production drift หลังเริ่มใช้ migrate history แล้ว

## คำสั่งชุดแนะนำสำหรับ baseline ครั้งแรก

ตัวอย่างเมื่อ schema target มีครบทั้ง 4 migration อยู่แล้ว:

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend

$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"

npx prisma migrate status --schema prisma/schema.prisma

npx prisma migrate diff `
  --from-url $env:DATABASE_URL `
  --to-schema-datamodel prisma/schema.prisma `
  --script

npx prisma migrate resolve --applied 20260401_sprint1_franchise_foundation --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_admin_promotions_notifications_rewards_feedback --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_customer_profile_settings_fix --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260402_sprint3_payment_webhooks --schema prisma/schema.prisma

npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

## คำสั่งชุดแนะนำสำหรับ deploy ปกติหลัง baseline เสร็จแล้ว

```powershell
cd C:\Users\PC\Downloads\roboare\robossoneman\backend
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"

npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
npm run verify:env
npm run verify:production
npm run smoke
```

## Known blockers / สิ่งที่ต้องยืนยันก่อน production จริง

1. ยังไม่มี inventory ของ schema จริงในแต่ละ target environment แนบอยู่ใน repo ดังนั้นรายชื่อ migration ที่ต้อง resolve ต่อ environment ยังต้องยืนยันจาก `migrate diff` และ SQL inspection ตอนใช้งานจริง
2. `20260402_customer_profile_settings_fix` มี data backfill อยู่ใน migration ถ้า environment ไหนมี table/column แล้วแต่ยังไม่มี `user_settings` ครบทุก user ห้าม resolve migration นี้ข้าม
3. `prisma/seed.ts` มี demo/admin seed จำนวนมาก จึงไม่ควรรันบน production แบบเหมารวมจนกว่าจะคัดเฉพาะข้อมูลที่ต้องใช้จริง
4. เอกสาร deploy เดิมใน repo ยังใช้ `prisma db push` อยู่ ซึ่งไม่เหมาะกับ shared environment หลังเริ่มใช้ migration history แล้ว
