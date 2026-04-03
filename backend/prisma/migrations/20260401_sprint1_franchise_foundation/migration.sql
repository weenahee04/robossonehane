-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- CreateEnum
CREATE TYPE "BranchOwnershipType" AS ENUM ('company_owned', 'franchise');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('idle', 'reserved', 'washing', 'maintenance', 'offline');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('promptpay', 'cash', 'manual');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'confirmed', 'failed', 'cancelled', 'refunded', 'expired');

-- CreateEnum
CREATE TYPE "WashSessionStatus" AS ENUM ('pending_payment', 'payment_failed', 'ready_to_wash', 'in_progress', 'completed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('all_branches', 'selected_branches', 'branch_only');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('draft', 'active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "UserCouponStatus" AS ENUM ('claimed', 'redeemed', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "PointsType" AS ENUM ('earn', 'redeem', 'expire', 'bonus', 'adjust');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('wash', 'coupon', 'points', 'system');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('hq_admin', 'branch_admin');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('system', 'customer', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "tier" "UserTier" NOT NULL DEFAULT 'bronze',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "total_washes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "address" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'car',
    "ownership_type" "BranchOwnershipType" NOT NULL DEFAULT 'franchise',
    "franchise_code" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "promptpay_id" TEXT NOT NULL,
    "promptpay_name" TEXT NOT NULL,
    "owner_name" TEXT,
    "maps_url" TEXT,
    "hours" TEXT DEFAULT '06:00 - 22:00',
    "operating_hours" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_settings" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "locale" TEXT NOT NULL DEFAULT 'th-TH',
    "points_earn_rate" INTEGER NOT NULL DEFAULT 10,
    "points_min_spend" INTEGER NOT NULL DEFAULT 1,
    "allows_point_redemption" BOOLEAN NOT NULL DEFAULT true,
    "receipt_footer" TEXT,
    "support_phone" TEXT,
    "max_concurrent_sessions" INTEGER NOT NULL DEFAULT 2,
    "wash_start_grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "esp_device_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'car',
    "status" "MachineStatus" NOT NULL DEFAULT 'idle',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "maintenance_note" TEXT,
    "last_heartbeat" TIMESTAMP(3),
    "firmware_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wash_packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicle_type" TEXT NOT NULL DEFAULT 'car',
    "price_s" INTEGER NOT NULL,
    "price_m" INTEGER NOT NULL,
    "price_l" INTEGER NOT NULL,
    "steps" JSONB NOT NULL,
    "step_duration" INTEGER NOT NULL DEFAULT 300,
    "features" JSONB,
    "image" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wash_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_package_configs" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "display_name" TEXT,
    "description_override" TEXT,
    "price_override_s" INTEGER,
    "price_override_m" INTEGER,
    "price_override_l" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_package_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wash_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "branch_package_config_id" TEXT,
    "car_size" TEXT NOT NULL,
    "addons" JSONB NOT NULL DEFAULT '[]',
    "subtotal_price" INTEGER NOT NULL DEFAULT 0,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "total_price" INTEGER NOT NULL,
    "status" "WashSessionStatus" NOT NULL DEFAULT 'pending_payment',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "review_text" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'promptpay',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "qr_payload" TEXT,
    "expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "provider_ref" TEXT,
    "request_body" JSONB,
    "response_body" JSONB,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "CouponScope" NOT NULL DEFAULT 'branch_only',
    "status" "CouponStatus" NOT NULL DEFAULT 'active',
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "min_spend" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER NOT NULL DEFAULT 0,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "package_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_branch_links" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_branch_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_coupons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "status" "UserCouponStatus" NOT NULL DEFAULT 'claimed',
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMP(3),

    CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "user_coupon_id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "session_id" TEXT,
    "discount_amount" INTEGER NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetime_earned" INTEGER NOT NULL DEFAULT 0,
    "lifetime_redeemed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "session_id" TEXT,
    "type" "PointsType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stamps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "target_count" INTEGER NOT NULL DEFAULT 10,
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "last_stamp_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stamps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'system',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piggy_banks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "piggy_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gradient" TEXT,
    "conditions" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'branch_admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_branch_scopes" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "can_view_revenue" BOOLEAN NOT NULL DEFAULT true,
    "can_manage_machines" BOOLEAN NOT NULL DEFAULT true,
    "can_manage_coupons" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_branch_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "admin_user_id" TEXT,
    "user_id" TEXT,
    "branch_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_line_user_id_key" ON "users"("line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branch_settings_branch_id_key" ON "branch_settings"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "machines_esp_device_id_key" ON "machines"("esp_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "machines_branch_id_code_key" ON "machines"("branch_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "wash_packages_code_key" ON "wash_packages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branch_package_configs_branch_id_package_id_key" ON "branch_package_configs"("branch_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_session_id_key" ON "payments"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_branch_id_status_idx" ON "payments"("branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_branch_links_coupon_id_branch_id_key" ON "coupon_branch_links"("coupon_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_coupons_user_id_coupon_id_key" ON "user_coupons"("user_id", "coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_user_coupon_id_key" ON "coupon_redemptions"("user_coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_session_id_key" ON "coupon_redemptions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_wallets_user_id_key" ON "point_wallets"("user_id");

-- CreateIndex
CREATE INDEX "points_transactions_user_id_created_at_idx" ON "points_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "piggy_banks_user_id_key" ON "piggy_banks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_branch_scopes_admin_user_id_branch_id_key" ON "admin_branch_scopes"("admin_user_id", "branch_id");

-- CreateIndex
CREATE INDEX "audit_logs_branch_id_created_at_idx" ON "audit_logs"("branch_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_created_at_idx" ON "audit_logs"("actor_type", "created_at");

-- AddForeignKey
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_package_configs" ADD CONSTRAINT "branch_package_configs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_package_configs" ADD CONSTRAINT "branch_package_configs_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "wash_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "wash_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wash_sessions" ADD CONSTRAINT "wash_sessions_branch_package_config_id_fkey" FOREIGN KEY ("branch_package_config_id") REFERENCES "branch_package_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "wash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_branch_links" ADD CONSTRAINT "coupon_branch_links_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_branch_links" ADD CONSTRAINT "coupon_branch_links_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_coupons" ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_coupon_id_fkey" FOREIGN KEY ("user_coupon_id") REFERENCES "user_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "wash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_wallets" ADD CONSTRAINT "point_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "point_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "wash_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamps" ADD CONSTRAINT "stamps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piggy_banks" ADD CONSTRAINT "piggy_banks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_branch_scopes" ADD CONSTRAINT "admin_branch_scopes_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_branch_scopes" ADD CONSTRAINT "admin_branch_scopes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

