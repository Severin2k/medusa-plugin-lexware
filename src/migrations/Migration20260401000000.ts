import { Migration } from "@mikro-orm/migrations"

export class Migration20260401000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lexware_settings" (
        "id" TEXT NOT NULL,
        "api_key_encrypted" TEXT NULL,
        "api_key_iv" TEXT NULL,
        "api_key_tag" TEXT NULL,
        "invoice_on_order" BOOLEAN NOT NULL DEFAULT TRUE,
        "payment_due_days" INTEGER NOT NULL DEFAULT 14,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "lexware_settings_pkey" PRIMARY KEY ("id")
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "lexware_settings";`)
  }
}
