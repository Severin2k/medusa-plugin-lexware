import { Migration } from "@mikro-orm/migrations"

export class Migration20260403100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_contact"
      ALTER COLUMN "customer_id" DROP NOT NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "lexware_contact"
      ALTER COLUMN "customer_id" SET NOT NULL;
    `)
  }
}
