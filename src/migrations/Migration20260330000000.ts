import { Migration } from "@mikro-orm/migrations"

export class Migration20260330000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lexware_contact" (
        "id" TEXT NOT NULL,
        "customer_id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "lexware_contact_id" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "lexware_contact_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lexware_contact_customer_id_unique"
        ON "lexware_contact" ("customer_id")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lexware_contact_lexware_contact_id_unique"
        ON "lexware_contact" ("lexware_contact_id")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "lexware_invoice" (
        "id" TEXT NOT NULL,
        "order_id" TEXT NOT NULL,
        "lexware_invoice_id" TEXT NULL,
        "lexware_voucher_number" TEXT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "error_message" TEXT NULL,
        "pdf_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "retry_count" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "lexware_invoice_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lexware_invoice_order_id_unique"
        ON "lexware_invoice" ("order_id")
        WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "lexware_invoice";`)
    this.addSql(`DROP TABLE IF EXISTS "lexware_contact";`)
  }
}
