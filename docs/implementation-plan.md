# ROBOSS Implementation Plan

แผนนี้ยึดตามขอบเขตปัจจุบัน:

- คง UX/UI ฝั่งลูกค้าเดิม
- ตัดระบบ referral ออกจาก scope
- ทำระบบให้ใช้งานจริงแบบแฟรนไชส์
- แยกสิทธิ์ระหว่าง HQ Admin และ Branch Admin
- ใช้แต้มร่วมกันทุกสาขา
- ใช้คูปองแยกตามสาขาได้

## 1. Milestones

### Milestone 1: Core Foundation
- [ ] สรุป business rules กลางของระบบให้ชัด
- [ ] ออกแบบ domain model สำหรับ franchise
- [ ] ปรับ Prisma schema ให้รองรับ branch, payments, points wallet, coupon scope, admin scope
- [ ] สร้าง migration และ seed data ชุดใหม่
- [ ] วาง role/permission matrix

### Milestone 2: Real Customer Transaction Flow
- [ ] ทำ flow scan -> create session -> payment -> start wash -> progress -> complete ให้ใช้ข้อมูลจริง
- [ ] แยก payment ออกจาก wash session
- [ ] ทำ coupon validation ตาม branch
- [ ] ทำ points wallet และ points ledger จริง
- [ ] ทำ branch-aware package pricing

### Milestone 3: Branch Operations
- [ ] ทำ branch admin ให้ใช้งานกับข้อมูลจริง
- [ ] ทำ dashboard สาขา
- [ ] ทำ machine monitoring และ machine commands
- [ ] ทำ session monitoring ของแต่ละสาขา
- [ ] ทำ revenue และ customer views ของแต่ละสาขา

### Milestone 4: HQ Franchise Control
- [ ] ทำ HQ dashboard
- [ ] ทำ branch management
- [ ] ทำ admin management
- [ ] ทำ global package / promotion / policy management
- [ ] ทำรายงานรวมทุกสาขา

### Milestone 5: Production Readiness
- [ ] ทำ audit logs
- [ ] ปรับ security และ access control
- [ ] ทำ payment reconciliation
- [ ] ทดสอบ end-to-end
- [ ] เตรียม staging / production rollout

## 2. Task Breakdown

## Phase A: Product Rules and Architecture

### A1. Business Rules
- [ ] ล็อกกติกา points ว่าคิดจากยอดสุทธิหลังหักคูปอง
- [ ] ล็อกกติกา coupon scope ว่าเป็น global / selected branches / branch-only
- [ ] ล็อกกติกา package pricing ว่าแต่ละสาขา override ราคาได้
- [ ] ล็อกกติกา admin roles และสิทธิ์ของแต่ละ role
- [ ] ล็อก wash session lifecycle
- [ ] ล็อก machine lifecycle
- [ ] ล็อก payment lifecycle

### A2. System Design
- [ ] เขียน architecture overview
- [ ] เขียน API module map
- [ ] เขียน database entity map
- [ ] เขียน permission matrix
- [ ] เขียน branch tenancy rules

## Phase B: Database and Backend Foundation

### B1. Prisma Schema Refactor
- [ ] ปรับ `Branch`
- [ ] เพิ่ม `BranchSettings`
- [ ] ปรับ `Machine`
- [ ] ปรับ `WashPackage`
- [ ] เพิ่ม `BranchPackageConfig`
- [ ] ปรับ `WashSession`
- [ ] เพิ่ม `Payment`
- [ ] เพิ่ม `PaymentAttempt`
- [ ] เพิ่ม `PointWallet`
- [ ] เพิ่ม `PointTransaction`
- [ ] ปรับ `Coupon`
- [ ] เพิ่ม `CouponBranchLink`
- [ ] เพิ่ม `CouponRedemption`
- [ ] ปรับ `AdminUser`
- [ ] เพิ่ม `AdminBranchScope`
- [ ] เพิ่ม `AuditLog`

### B2. Migration and Seed
- [ ] สร้าง migration ใหม่
- [ ] เขียน seed branches
- [ ] เขียน seed machines
- [ ] เขียน seed wash packages
- [ ] เขียน seed branch package config
- [ ] เขียน seed admin users
- [ ] เขียน seed test customers

### B3. Shared Backend Infrastructure
- [ ] แยก response helpers
- [ ] แยก error helpers
- [ ] แยก pagination helpers
- [ ] แยก auth helpers
- [ ] แยก branch scope helpers
- [ ] แยก audit logging helpers

## Phase C: Authentication and Authorization

### C1. Customer Auth
- [ ] ปรับ LINE login flow ให้พร้อม production
- [ ] ทำ dev login ให้ใช้เฉพาะ non-production
- [ ] ทำ `/auth/me`
- [ ] ทำ token refresh
- [ ] ทำ logout

### C2. Admin Auth
- [ ] แยก admin login flow
- [ ] ทำ JWT payload สำหรับ admin
- [ ] เพิ่ม role และ branch scope ใน admin token
- [ ] ปรับ middleware `requireAdmin`
- [ ] เพิ่ม middleware `requireRole`
- [ ] เพิ่ม middleware `requireBranchScope`

## Phase D: Branch and Machine Core

### D1. Branch APIs
- [ ] ปรับ `/api/branches`
- [ ] ปรับ `/api/branches/:id`
- [ ] เพิ่ม package config ต่อสาขา
- [ ] เพิ่ม machine availability ต่อสาขา
- [ ] เพิ่ม branch operational settings

### D2. Machine APIs
- [ ] เพิ่ม machine CRUD สำหรับ HQ
- [ ] เพิ่ม machine visibility สำหรับ branch admin
- [ ] เพิ่ม heartbeat endpoint
- [ ] เพิ่ม machine online/offline detection
- [ ] เพิ่ม maintenance mode
- [ ] เพิ่ม machine command endpoint
- [ ] เพิ่ม machine status history

## Phase E: Customer Wash Flow

### E1. Scan and Session Creation
- [ ] กำหนด QR payload format
- [ ] สร้าง QR resolver logic
- [ ] validate machine availability
- [ ] validate package availability
- [ ] validate branch pricing
- [ ] create wash session พร้อมสถานะ `pending_payment`

### E2. Payments
- [ ] สร้าง payment record
- [ ] generate PromptPay payload
- [ ] เก็บ payment reference
- [ ] กำหนด payment expiry
- [ ] ทำ payment confirm flow
- [ ] ทำ payment fail / cancel flow
- [ ] ผูก payment result เข้ากับ session

### E3. Wash Lifecycle
- [ ] ทำ start wash endpoint
- [ ] ส่ง machine command ตอนเริ่มล้าง
- [ ] ทำ progress update endpoint
- [ ] ส่ง websocket progress ไป frontend
- [ ] ทำ complete wash endpoint
- [ ] update machine กลับเป็น idle
- [ ] รองรับ rating/review หลังล้างเสร็จ

## Phase F: Coupon and Points Engine

### F1. Coupon Engine
- [ ] validate coupon ตาม branch
- [ ] validate coupon ตาม package
- [ ] validate coupon ตามช่วงเวลา
- [ ] validate coupon ตาม min spend
- [ ] validate coupon ตาม usage limits
- [ ] ทำ claim coupon
- [ ] ทำ redeem coupon
- [ ] บันทึก coupon redemption

### F2. Points Engine
- [ ] สร้าง wallet ต่อ user
- [ ] ทำ earn points หลัง session complete
- [ ] บันทึก ledger ทุก transaction
- [ ] ทำ wallet summary endpoint
- [ ] ทำ points history endpoint
- [ ] ทำ redeem points flow
- [ ] รองรับ manual adjustment โดย HQ
- [ ] update tier rules

## Phase G: Branch Admin

### G1. Branch Dashboard
- [ ] เชื่อม login กับ API จริง
- [ ] เชื่อม dashboard กับข้อมูลจริง
- [ ] แสดงรายรับวันนี้
- [ ] แสดงจำนวน session วันนี้
- [ ] แสดง machine status
- [ ] แสดง recent sessions

### G2. Branch Operations
- [ ] เชื่อม machines page กับ API จริง
- [ ] เชื่อม sessions page กับ API จริง
- [ ] เชื่อม customers page กับ API จริง
- [ ] เชื่อม revenue page กับ API จริง
- [ ] เชื่อม branches/settings เฉพาะสาขาที่มีสิทธิ์
- [ ] เพิ่ม coupon management ของสาขา

## Phase H: HQ Admin

### H1. HQ Control Panel
- [ ] ทำ HQ dashboard
- [ ] ทำ branch CRUD
- [ ] ทำ admin user CRUD
- [ ] ทำ role assignment
- [ ] ทำ package management
- [ ] ทำ promotion management
- [ ] ทำ global coupon management
- [ ] ทำ franchise performance reporting

## Phase I: Audit, Security, and Operations

### I1. Audit and Access Control
- [ ] log admin actions สำคัญ
- [ ] log machine commands
- [ ] log payment state changes
- [ ] log coupon and points adjustments
- [ ] ทดสอบ access control ทุก role

### I2. Production Hardening
- [ ] เพิ่ม request validation ให้ครบ
- [ ] ปรับ error handling ให้เป็นมาตรฐาน
- [ ] เพิ่ม rate limiting สำหรับ auth
- [ ] ปิด dev-only features ใน production
- [ ] แยก env configs สำหรับ dev/staging/prod

## 3. Recommended Execution Order

ลำดับลงมือจริงที่แนะนำ:

1. Phase A
2. Phase B
3. Phase C
4. Phase D
5. Phase E
6. Phase F
7. Phase G
8. Phase H
9. Phase I

## 4. Immediate Sprint Plan

งานที่ควรเริ่มทันทีใน sprint แรก:

### Sprint 1
- [ ] สรุป business rules ให้ล็อกเป็นเอกสาร
- [ ] refactor Prisma schema
- [ ] สร้าง migration
- [ ] สร้าง seed data ชุดใหม่
- [ ] ปรับ auth และ admin permissions ขั้นต้น

### Sprint 2
- [ ] ทำ branch-aware packages
- [ ] ทำ wash session + payment model จริง
- [ ] ทำ coupon validation ตาม branch
- [ ] ทำ points wallet และ transaction ledger

### Sprint 3
- [ ] เชื่อม branch admin กับ API จริง
- [ ] ทำ machine operations
- [ ] ทำ dashboard และ reporting ขั้นต้น

### Sprint 4
- [ ] ทำ HQ admin flow
- [ ] ทำ audit logs
- [ ] ทำ UAT flow สำหรับสาขาจริง

## 5. Implementation Notes for This Repo

- `src/` ถือเป็น customer web และจะไม่ปรับ UX/UI เป็นหลัก
- `admin-dashboard/` ใช้เป็นฐานของ branch admin ก่อน
- `backend/` เป็นศูนย์กลางของ business rules ทั้งหมด
- ถ้าจะมี HQ admin แยกชัดเจน แนะนำเพิ่ม app ใหม่ภายหลัง หรือแยก route/module ใน admin ปัจจุบัน
- ควรเริ่มจาก backend schema และ permissions ก่อน เพราะสองส่วนนี้เป็นฐานของทุก feature ถัดไป
