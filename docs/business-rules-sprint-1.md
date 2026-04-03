# ROBOSS Sprint 1 Business Rules

เอกสารนี้สรุปกติกาธุรกิจชุดแรกสำหรับใช้เป็นฐานของ Sprint 1 โดยยึดจาก `docs/implementation-plan.md` และข้อกำหนดเพิ่มเติมในแชทนี้

## 1. Product Boundaries

- คง UX/UI ฝั่งลูกค้าเดิมใน `src/` เป็นหลัก
- ตัด referral ออกจาก product scope และ data model
- ระบบต้องรองรับหลายสาขาในรูปแบบ franchise แต่ให้ประสบการณ์ลูกค้าดูเป็นแบรนด์เดียว
- Sprint 1 เน้นความพร้อมใช้งานจริงของ backend foundation, schema, seed และ admin scope

## 2. Franchise and Branch Model

- ROBOSS มี HQ กลางหนึ่งชุด และมีหลายสาขา
- แต่ละสาขาเป็นหน่วยปฏิบัติการจริง มีข้อมูลเฉพาะสาขา เช่น promptpay, เวลาเปิดปิด, เครื่อง, package config, coupon scope
- สาขาอาจเป็น `company_owned` หรือ `franchise`
- ลูกค้าเป็น shared customer base ระดับแบรนด์ ไม่ผูกบัญชีกับสาขาใดสาขาหนึ่ง
- Machine, payment, coupon redemption, reporting และ operational control ต้องอ้างอิงสาขาเสมอ

## 3. Admin Roles

- มี 2 role หลักเท่านั้น
- `hq_admin`
  รับผิดชอบภาพรวมทั้งระบบ
- `branch_admin`
  ดูแลเฉพาะสาขาที่ได้รับสิทธิ์

กติกา:

- HQ Admin มองเห็นทุกสาขา ทุก session ทุก payment และทุก customer summary
- Branch Admin มองเห็นเฉพาะข้อมูลที่อยู่ใน branch scope ของตัวเอง
- Branch Admin 1 คนอาจถูก assign ได้มากกว่า 1 สาขา
- Branch scope ต้องเก็บแบบ normalized relation ไม่เก็บเป็น string array

## 4. Customer Identity and Loyalty

- ลูกค้าหนึ่งคนมีบัญชีเดียวทั้งระบบจาก LINE login
- แต้มเป็น shared wallet ระดับลูกค้า ใช้ร่วมกันได้ทุกสาขา
- ต้องมีทั้ง wallet summary และ ledger transaction
- ฟิลด์ `users.total_points` ยังเก็บไว้เป็น cached summary เพื่อรองรับ API เดิมและ query เร็ว
- ทุกการเปลี่ยนแปลงแต้มต้องบันทึก ledger พร้อม `balance_after`

## 5. Coupon Rules

- คูปองต้องมี branch scope ชัดเจน
- รองรับ 3 รูปแบบ
- `all_branches`
  ใช้ได้ทุกสาขา
- `selected_branches`
  ใช้ได้เฉพาะสาขาที่ link ไว้
- `branch_only`
  คูปองเฉพาะสาขาเดียวหรือชุดสาขาที่ตั้งใจให้เป็น local campaign

กติกาเพิ่มเติม:

- การ claim คูปองเป็นระดับ user
- การ redeem คูปองต้องบันทึก branch ที่ใช้จริง
- coupon redemption ต้องเชื่อมกับ session ได้
- usage limit ต้องตรวจทั้งระดับคูปองรวม และระดับ user ตาม `max_uses_per_user`

## 6. Package and Pricing Rules

- `WashPackage` คือ package กลางของแบรนด์
- แต่ละสาขาสามารถ override ราคาและการแสดงผลผ่าน `BranchPackageConfig`
- ถ้าไม่มี override ให้ใช้ราคากลางจาก package
- หน้า customer ยังคงใช้ข้อมูล package แบบเดิมได้ แต่ backend ต้อง resolve ราคาตามสาขา
- package config สามารถปิดเฉพาะสาขาได้โดยไม่ต้องลบ package กลาง

## 7. Session and Payment Lifecycle

- Session ต้องเกิดก่อนการชำระเงินจริง
- Payment ต้องแยกออกจาก Wash Session
- หนึ่ง session มี payment หลักได้ 1 รายการ และมีหลาย payment attempts ได้

สถานะหลักของ session:

- `pending_payment`
- `payment_failed`
- `ready_to_wash`
- `in_progress`
- `completed`
- `cancelled`
- `refunded`

สถานะหลักของ payment:

- `pending`
- `confirmed`
- `failed`
- `cancelled`
- `refunded`
- `expired`

กติกา:

- session ต้องอ้างอิง branch, machine, package และราคา snapshot ณ ตอนสร้าง
- payment เป็น source of truth ด้านการเงิน
- session status ใช้สะท้อน operational flow
- รายได้ของ dashboard ให้นับจาก payment ที่ `confirmed`

## 8. Machine Rules

- เครื่องต้องผูกกับสาขา
- เครื่องต้องมี code ภายในสาขาและ `espDeviceId` ที่ unique ระดับระบบ
- เครื่องที่ `maintenance` หรือ `offline` ใช้งานไม่ได้
- เครื่องที่ `idle` และ `is_enabled = true` จึงจะพร้อมรับ session ใหม่

## 9. Branch Visibility and Reporting

- Dashboard ระดับ HQ ต้องรวมผลทุกสาขา
- Dashboard ระดับ Branch ต้อง filter ตาม scope เสมอ
- Revenue, machine operations, coupon usage และ session monitoring ต้อง branch-aware ทั้งหมด

## 10. Legacy Compatibility Decisions in Sprint 1

- คง field summary บางตัวใน `users` เช่น `total_points`, `total_washes` เพื่อไม่ทำให้ frontend/customer API เดิมเสียทันที
- promotions ยังใช้ `branchIds` array ได้ใน Sprint 1 เพราะยังไม่ใช่ critical payment domain
- referral routes และ schema ต้องถูกถอดออกจาก backend startup

## 11. Out of Scope for Sprint 1

- full permission matrix ระดับ action-by-action
- payment provider integration จริง
- machine heartbeat orchestration แบบ production-ready
- HQ admin frontend แยก app
- audit trail แบบสมบูรณ์ทุก endpoint

## 12. Sprint 1 Deliverables

- business rules document ฉบับนี้
- Prisma schema ใหม่ที่รองรับ franchise, branch admin scope, points wallet, coupon branch scope, payment separation
- migration plan สำหรับย้ายจาก schema เดิม
- seed data structure ใหม่ที่สะท้อน HQ + branches + scopes + wallet-ready records
