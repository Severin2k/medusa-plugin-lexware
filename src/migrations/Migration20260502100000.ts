import { Migration } from "@mikro-orm/migrations"

export class Migration20260502100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      ADD COLUMN IF NOT EXISTS "smtp_host" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "smtp_port" INTEGER NULL,
      ADD COLUMN IF NOT EXISTS "smtp_secure" BOOLEAN NULL,
      ADD COLUMN IF NOT EXISTS "smtp_user" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "smtp_pass_encrypted" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "smtp_pass_iv" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "smtp_pass_tag" TEXT NULL,
      ADD COLUMN IF NOT EXISTS "notification_email" TEXT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_settings"
      DROP COLUMN IF EXISTS "smtp_host",
      DROP COLUMN IF EXISTS "smtp_port",
      DROP COLUMN IF EXISTS "smtp_secure",
      DROP COLUMN IF EXISTS "smtp_user",
      DROP COLUMN IF EXISTS "smtp_pass_encrypted",
      DROP COLUMN IF EXISTS "smtp_pass_iv",
      DROP COLUMN IF EXISTS "smtp_pass_tag",
      DROP COLUMN IF EXISTS "notification_email";
    `)
  }
}
