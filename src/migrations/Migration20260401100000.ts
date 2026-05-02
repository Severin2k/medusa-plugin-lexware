import { Migration } from "@mikro-orm/migrations"

export class Migration20260401100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      ADD COLUMN IF NOT EXISTS "api_key_created_at" TIMESTAMPTZ NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      DROP COLUMN IF EXISTS "api_key_created_at";
    `)
  }
}
