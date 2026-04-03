# ROBOSS Sprint 1 Migration Plan

เอกสารนี้เป็น migration plan จาก schema เดิมไปสู่ schema franchise-ready ของ Sprint 1

## 1. Goals

- ย้ายจาก single-brand but partially branch-aware ไปเป็น franchise-ready foundation
- ถอด referral ออกจาก schema และ application startup
- แยก payment ออกจาก wash session
- ย้าย branch/admin/coupon scope จาก array-based data ไปเป็น normalized relational data
- เตรียม points wallet และ ledger ให้พร้อมสำหรับ Sprint 2

## 2. Recommended Migration Strategy

- ใช้ approach แบบ breaking migration สำหรับ environment dev/staging
- สำหรับ production จริง แนะนำทำแบบ 2-phase rollout

## 3. Dev / Staging Migration Steps

1. สำรองฐานข้อมูลเดิม
2. generate Prisma client จาก schema ใหม่
3. create migration ใหม่สำหรับ Sprint 1
4. reset database ใน dev/staging
5. run seed ชุดใหม่
6. smoke test routes สำคัญ

คำสั่งแนะนำ:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name sprint1_franchise_foundation
npx tsx prisma/seed.ts
```

## 4. Production Rollout Strategy

### Phase 1: Expand

- เพิ่มตารางใหม่:
- `branch_settings`
- `branch_package_configs`
- `payments`
- `payment_attempts`
- `point_wallets`
- `coupon_branch_links`
- `coupon_redemptions`
- `admin_branch_scopes`
- `audit_logs`

- เพิ่มคอลัมน์ใหม่:
- `branches.code`
- `branches.ownership_type`
- `branches.franchise_code`
- `machines.code`
- `machines.is_enabled`
- `wash_packages.code`
- `wash_sessions.status`
- `wash_sessions.subtotal_price`
- `wash_sessions.discount_amount`
- `wash_sessions.branch_package_config_id`
- `admin_users.last_login_at`

### Phase 2: Backfill

- สร้าง `branch_settings` ให้ครบทุกสาขา
- แปลง `branch_package_links` เดิมเป็น `branch_package_configs`
- สร้าง `point_wallets` ให้ครบทุก user และตั้ง `balance = users.total_points`
- backfill points ledger เริ่มต้น ถ้าต้องการ historical integrity
- สร้าง `payments` จาก `wash_sessions` เดิมโดย map `paymentStatus` เดิมเป็น payment status ใหม่
- แปลง coupon `branchIds` เป็น `coupon_branch_links`
- แปลง admin `branchIds` เป็น `admin_branch_scopes`

### Phase 3: Cutover

- deploy backend ที่อ่าน relation ใหม่เป็นหลัก
- เปลี่ยน dashboard และ reporting ให้อ่าน payment table แทน `wash_sessions.paymentStatus`
- ปิด route referrals และ remove UI references ฝั่ง admin ถ้ามี

### Phase 4: Contract

- ลบ field/table เดิมที่ไม่ใช้งาน:
- `users.referral_code`
- `users.referred_by`
- `referrals`
- `admin_users.branch_ids`
- `coupons.branch_ids`
- `wash_sessions.payment_status`
- `branch_package_links`

## 5. Data Mapping Rules

### 5.1 Referral Removal

- ไม่ migrate referral data ไปโมเดลใหม่
- เก็บ archive ไว้เฉพาะใน backup ถ้าธุรกิจยังอยากอ้างอิงย้อนหลัง

### 5.2 Points

- `users.total_points` -> `point_wallets.balance`
- `users.total_points` ยังเก็บต่อเป็น cached summary
- `points_transactions` เดิม -> เติม `wallet_id` และ `balance_after`

### 5.3 Sessions and Payments

- `wash_sessions.payment_status = pending` -> `payments.status = pending`, `wash_sessions.status = pending_payment`
- `wash_sessions.payment_status = paid` และ `wash_status = waiting` -> `payments.status = confirmed`, `wash_sessions.status = ready_to_wash`
- `wash_sessions.payment_status = paid` และ `wash_status = washing` -> `payments.status = confirmed`, `wash_sessions.status = in_progress`
- `wash_sessions.payment_status = paid` และ `wash_status = completed` -> `payments.status = confirmed`, `wash_sessions.status = completed`
- `wash_sessions.payment_status = failed` -> `payments.status = failed`, `wash_sessions.status = payment_failed`
- `wash_sessions.payment_status = refunded` -> `payments.status = refunded`, `wash_sessions.status = refunded`

### 5.4 Coupons

- `coupons.branch_ids = []` -> `scope = all_branches`
- `coupons.branch_ids.length > 0` -> `scope = selected_branches` หรือ `branch_only` ตาม business decision
- `user_coupons.is_used = false` -> `status = claimed`
- `user_coupons.is_used = true` -> `status = redeemed`

### 5.5 Admin Scope

- `role = hq` -> `role = hq_admin`
- `role = branch_manager` -> `role = branch_admin`
- `role = franchise_owner` -> ตัดทิ้งใน Sprint 1 และ re-map เป็น `branch_admin` พร้อมหลาย branch scopes
- `admin_users.branch_ids` -> `admin_branch_scopes`

## 6. Seed Expectations After Migration

- มี HQ admin อย่างน้อย 1 คน
- มี branch admin อย่างน้อย 2 ชุดที่ครอบคลุมหลายสาขา
- ทุก branch มี:
- branch settings
- machines
- branch package config
- promptpay info

- ทุก test user ควรมี:
- wallet
- stamp card
- optional claimed coupons

## 7. Validation Checklist

- `GET /api/branches` ยังคืน package และ machine ได้
- `POST /api/auth/dev-login` สร้าง user + wallet + stamp ได้
- `GET /api/points/balance` อ่านจาก wallet ได้
- `GET /api/coupons?branchId=...` filter ตาม branch relation ได้
- `POST /api/sessions` สร้าง session พร้อม payment record ได้
- `GET /api/admin/dashboard` แยก HQ กับ Branch scope ได้

## 8. Risks

- migration นี้เปลี่ยน relation หลายจุดพร้อมกัน
- ถ้ารันบนฐานข้อมูลที่มีข้อมูลจริง ต้องมี backup และ dry run ก่อนเสมอ
- route เก่าที่อิง array fields หรือ `paymentStatus` เดิมจะต้องถูกอัปเดตพร้อมกัน
