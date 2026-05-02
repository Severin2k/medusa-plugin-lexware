import { model } from "@medusajs/framework/utils"

const LexwareInvoice = model.define("lexware_invoice", {
  id: model.id().primaryKey(),
  order_id: model.text().unique(),
  lexware_invoice_id: model.text().nullable(),
  lexware_voucher_number: model.text().nullable(),
  status: model.text().default("pending"),
  error_message: model.text().nullable(),
  pdf_sent: model.boolean().default(false),
  retry_count: model.number().default(0),
  payment_status: model.text().nullable(),
  payment_status_updated_at: model.dateTime().nullable(),
})

export default LexwareInvoice
