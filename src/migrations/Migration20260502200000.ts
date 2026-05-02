import { Migration } from "@mikro-orm/migrations"

export class Migration20260502200000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lexware_credit_note" (
        "id" TEXT PRIMARY KEY,
        "order_id" TEXT NOT NULL,
        "linked_invoice_id" TEXT NULL,
        "lexware_credit_note_id" TEXT NULL,
        "lexware_voucher_number" TEXT NULL,
        "status" TEXT DEFAULT 'pending',
        "error_message" TEXT NULL,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "lexware_credit_note";`)
  }
}
