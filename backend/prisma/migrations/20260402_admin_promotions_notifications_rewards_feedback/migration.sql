ALTER TABLE "feedback"
ADD COLUMN "branch_id" TEXT,
ADD COLUMN "session_id" TEXT,
ADD COLUMN "admin_notes" TEXT,
ADD COLUMN "resolved_at" TIMESTAMP(3);

CREATE TABLE "reward_catalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points_cost" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "tag" TEXT,
    "icon" TEXT NOT NULL,
    "icon_bg" TEXT,
    "stock" INTEGER,
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reward_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reward_catalog_code_key" ON "reward_catalog"("code");

CREATE TABLE "notification_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL DEFAULT 'system',
    "scope" TEXT NOT NULL,
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_user_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);
