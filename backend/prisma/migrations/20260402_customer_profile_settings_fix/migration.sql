ALTER TABLE "users"
ADD COLUMN "email" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deactivated_at" TIMESTAMP(3),
ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_general" BOOLEAN NOT NULL DEFAULT true,
    "notification_wash" BOOLEAN NOT NULL DEFAULT true,
    "notification_coupon" BOOLEAN NOT NULL DEFAULT true,
    "notification_points" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'th',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_settings" (
    "id",
    "user_id",
    "notification_general",
    "notification_wash",
    "notification_coupon",
    "notification_points",
    "locale",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    "id",
    true,
    true,
    true,
    false,
    'th',
    NOW(),
    NOW()
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
