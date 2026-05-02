import { Migration } from "@mikro-orm/migrations"

export class Migration20260403000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      ADD COLUMN IF NOT EXISTS "payment_conditions" TEXT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      DROP COLUMN IF EXISTS "payment_conditions";
    `)
  }
}
