import { Migration } from "@mikro-orm/migrations"

export class Migration20260403200000 extends Migration {
  async up(): Promise<void> {
    // Invoice: Zahlungsstatus-Felder
    this.addSql(`
      ALTER TABLE "lexware_invoice"
      ADD COLUMN IF NOT EXISTS "payment_status" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "payment_status_updated_at" TIMESTAMPTZ NULL;
    `)

    // Settings: Webhook Subscription ID + Organization ID
    this.addSql(`
      ALTER TABLE "lexware_settings"
      ADD COLUMN IF NOT EXISTS "webhook_subscription_id" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "webhook_organization_id" TEXT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_invoice"
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "payment_status_updated_at";
    `)
    this.addSql(`
      ALTER TABLE "lexware_settings"
      DROP COLUMN IF EXISTS "webhook_subscription_id",
      DROP COLUMN IF EXISTS "webhook_organization_id";
    `)
  }
}
