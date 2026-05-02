import { Migration } from "@mikro-orm/migrations"

export class Migration20260502000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      ADD COLUMN IF NOT EXISTS "dry_run" BOOLEAN DEFAULT FALSE;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      DROP COLUMN IF EXISTS "dry_run";
    `)
  }
}
