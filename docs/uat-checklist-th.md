# ROBOSS UAT Checklist (TH)

เอกสารนี้ใช้สำหรับทดสอบระบบก่อนขึ้น `staging` หรือ `production` โดยเน้นให้เช็กครบทั้ง
- ฝั่งลูกค้า
- ฝั่ง Branch Admin
- ฝั่ง HQ Admin
- backend/data flow จริง

## 1. เตรียมระบบก่อนทดสอบ

- เปิด backend ให้ทำงานได้
- เปิด customer web ที่ `http://localhost:5173`
- เปิด admin dashboard ที่ `http://localhost:5180`
- ตรวจว่า database ที่ใช้งานเป็นฐานข้อมูลที่ seed พร้อมแล้ว
- ตรวจว่า MQTT/broker พร้อมถ้าจะทดสอบ machine event

## 2. บัญชีที่ใช้ทดสอบ

### HQ Admin
- `admin@roboss.co.th / admin123`

### Branch Admin
- `rama.manager@roboss.co.th / manager123`
- `east.manager@roboss.co.th / branch123`

## 3. UAT ฝั่งลูกค้า

### 3.1 Login / Auth
- เปิดหน้าเว็บลูกค้า
- ตรวจว่าถ้าไม่มี session จะเข้าสู่ auth gate
- login ให้สำเร็จ
- reload หน้าแล้ว session ยังอยู่
- logout แล้วกลับสู่ unauthenticated state

### 3.2 หน้าแรก / Navigation
- กดเมนู `ล้างรถ`
- กดเมนู `คูปอง`
- กดเมนู `สาขาใกล้ฉัน`
- กดเมนู `บัตรสมาชิก`
- กดเมนู `โปรโมชัน`
- กดเมนู `ประวัติ`
- กดเมนู `โปรไฟล์`
- ตรวจว่าไม่มีปุ่ม dead button

### 3.3 Nearby Branches
- เปิดหน้า `สาขาใกล้ฉัน`
- ตรวจว่าแต่ละสาขามี `isOpen`, `machinesFree`, `machinesTotal`
- กด `เริ่มล้างรถที่สาขานี้`
- ตรวจว่าเข้า flow ล้างรถพร้อม branch context ถูกต้อง

### 3.4 Car Wash Flow
- เข้า flow ล้างรถ
- ตรวจว่า scan/resolve branch + machine ได้
- เลือก package
- เลือกขนาดรถ
- ไปหน้าชำระเงิน
- confirm payment ใน flow ทดสอบ
- start wash ได้
- progress เปลี่ยนตาม session จริง
- complete wash ได้
- rate/review ได้

### 3.5 Coupons
- เปิดหน้าคูปอง
- ตรวจว่าเห็นคูปองตาม branch ที่เลือก
- เลือกคูปองแล้วเข้า wash flow
- ตรวจว่า discount preview แสดงถูก
- สร้าง session แล้ว coupon ถูก apply จริง

### 3.6 Promotions
- เปิดหน้าโปรโมชัน
- ตรวจว่าเห็น promotion ที่ active จริงจาก backend
- กด CTA ของ promotion
- ตรวจว่าเข้า wash flow พร้อม branch/promo context

### 3.7 Member / Points / Stamps
- เปิดหน้าบัตรสมาชิก
- ตรวจยอด points
- ตรวจจำนวน stamps
- ตรวจประวัติการล้างที่แสดงในหน้า member
- เปิดหน้า points shop
- redeem reward ที่มีอยู่ได้
- เปิดหน้า stamp
- claim stamp reward ได้เมื่อครบเงื่อนไข

### 3.8 Notifications
- เปิดหน้าแจ้งเตือน
- ตรวจ unread badge ว่าไม่ใช่ค่าคงที่
- กด notification แต่ละประเภท
- ตรวจว่า deeplink ไปหน้าที่เกี่ยวข้องได้
- mark read / mark all read ทำงาน

### 3.9 History / Receipt
- เปิดหน้าประวัติ
- ตรวจว่าเห็น session history จริง
- กดดูรายละเอียด/ใบเสร็จ
- ตรวจข้อมูล branch/package/payment/ราคา/เวลา

### 3.10 Profile / Settings / Vehicles
- เปิดหน้า profile
- edit profile และ save ได้จริง
- เพิ่มรถใหม่ได้
- ตรวจว่ารถใหม่แสดงใน profile
- เปิด settings
- เปลี่ยน notification settings แล้ว reload ยังอยู่
- เปิด privacy / terms / help links ได้
- deactivate/delete account flow เปิดได้ถูกต้อง

### 3.11 Feedback
- เปิดหน้า feedback
- ส่ง feedback ได้สำเร็จ
- ตรวจว่า feedback ผูก branch/session ล่าสุดได้

## 4. UAT ฝั่ง Branch Admin

### 4.1 Login / Scope
- login ด้วย branch admin
- ตรวจว่าเห็นเฉพาะ branch ใน scope
- ลองเข้าดูข้อมูล branch นอก scope ต้องถูกปฏิเสธ

### 4.2 Dashboard
- ตรวจ overview ของสาขา
- ตรวจ machine summary
- ตรวจ recent sessions
- ตรวจรายได้

### 4.3 Machines / Sessions
- เปิดหน้า machines
- ตรวจ status realtime
- ส่ง machine command ได้ถ้าสิทธิ์อนุญาต
- เปิดหน้า sessions
- ตรวจ session status / payment status / progress

### 4.4 Revenue / Customers
- เปิดหน้า revenue
- ตรวจ daily trend / totals / package breakdown
- เปิดหน้า customers
- ตรวจข้อมูลลูกค้าและ vehicle support view

### 4.5 Branch Operations
- เปิดหน้า coupons
- สร้าง/แก้ไข/activate coupon ใน branch scope
- เปิดหน้า promotions
- สร้าง/แก้ไข promotion ใน branch scope
- เปิดหน้า notifications
- สร้าง notification/campaign ใน branch scope ถ้าสิทธิ์อนุญาต
- เปิดหน้า feedback
- เปลี่ยนสถานะ feedback / ใส่ admin note ได้

### 4.6 Payments
- เปิดหน้า payments
- filter ตาม status/provider ได้
- search ตาม reference/providerRef/session ได้
- เปิด detail ได้
- กด verify / reconcile ได้

## 5. UAT ฝั่ง HQ Admin

### 5.1 Dashboard / Visibility
- login ด้วย HQ
- ตรวจว่าเห็นทุก branch
- ดู dashboard รวมทั้งระบบได้

### 5.2 Branch Management
- สร้าง branch ใหม่
- แก้ไข branch profile/settings
- ตรวจว่าข้อมูล branch แสดงในระบบ

### 5.3 Admin User Management
- สร้าง admin ใหม่
- กำหนด role
- assign branch scope
- ปรับ active state ได้

### 5.4 Packages / Pricing
- สร้าง package ใหม่
- edit package ได้
- activate/deactivate package ได้
- ตั้ง branch pricing override ได้
- ตรวจว่าฝั่งลูกค้าเห็น package/pricing ที่แก้จริง

### 5.5 Coupons / Promotions / Rewards / Notifications
- HQ สร้าง coupon แบบ global หรือ selected branches ได้
- HQ สร้าง/แก้ไข promotion ได้
- HQ สร้าง/แก้ไข rewards catalog ได้
- HQ สร้าง notification campaign ได้

### 5.6 Feedback / Payments
- เปิด feedback inbox ได้
- update status/admin note ได้
- เปิด payments ได้ทุก branch
- verify/reconcile ได้

## 6. Data Consistency Checks

- ลูกค้าใช้ coupon แล้วหลังบ้านเห็น usage count เปลี่ยน
- ลูกค้าล้างรถเสร็จแล้ว points/stamps เพิ่มจริง
- HQ/Branch เห็น session เดียวกับที่ลูกค้าสร้าง
- notification ที่สร้างจากหลังบ้านไปโผล่ฝั่งลูกค้า
- reward ที่ HQ activate แล้ว points shop ฝั่งลูกค้าเห็น

## 7. Known Pre-Production Blockers

- ยังไม่มี payment provider ตัวจริง
- ยังไม่มี LINE credentials ตัวจริง
- ยังต้องเปลี่ยน JWT secrets เป็นค่าจริง
- ยังต้องตั้ง MQTT/machine command production จริง
- seeded admin credentials ต้องเปลี่ยนก่อนใช้งานจริง

## 8. Go / No-Go เบื้องต้น

### Go สำหรับ UAT / Staging
- customer flow หลักผ่าน
- branch admin flow หลักผ่าน
- HQ admin flow หลักผ่าน
- data sync ข้าม customer/admin/backend ผ่าน

### No-Go สำหรับ Production ถ้ายังไม่ครบ
- payment provider จริงยังไม่ผูก
- secrets จริงยังไม่ใส่
- LINE login จริงยังไม่พร้อม
- MQTT/machine command จริงยังไม่พร้อม
