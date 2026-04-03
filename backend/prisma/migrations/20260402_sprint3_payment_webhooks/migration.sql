-- AlterTable
ALTER TABLE "payments"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mock_promptpay',
ADD COLUMN "provider_ref" TEXT,
ADD COLUMN "provider_status" TEXT,
ADD COLUMN "provider_confirmed_at" TIMESTAMP(3),
ADD COLUMN "last_webhook_at" TIMESTAMP(3),
ADD COLUMN "last_webhook_event_id" TEXT,
ADD COLUMN "last_webhook_status" TEXT,
ADD COLUMN "last_reconciled_at" TIMESTAMP(3),
ADD COLUMN "reconciliation_attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payment_attempts"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "action" TEXT,
ADD COLUMN "provider_status" TEXT,
ADD COLUMN "event_id" TEXT,
ADD COLUMN "note" TEXT;

-- CreateIndex
CREATE INDEX "payments_provider_provider_ref_idx" ON "payments"("provider", "provider_ref");

-- CreateIndex
CREATE INDEX "payment_attempts_event_id_idx" ON "payment_attempts"("event_id");
