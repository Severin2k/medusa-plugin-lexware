import { model } from "@medusajs/framework/utils"

const LexwareSettings = model.define("lexware_settings", {
  id: model.id().primaryKey(),
  api_key_encrypted: model.text().nullable(),
  api_key_iv: model.text().nullable(),
  api_key_tag: model.text().nullable(),
  api_key_created_at: model.dateTime().nullable(),
  invoice_on_order: model.boolean().default(true),
  payment_due_days: model.number().default(14),
  payment_conditions: model.text().nullable(),
  webhook_subscription_id: model.text().nullable(),
  webhook_organization_id: model.text().nullable(),
  dry_run: model.boolean().default(false),
})

export default LexwareSettings
