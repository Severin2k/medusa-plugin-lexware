import { model } from "@medusajs/framework/utils"

const LexwareCreditNote = model.define("lexware_credit_note", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  linked_invoice_id: model.text().nullable(),
  lexware_credit_note_id: model.text().nullable(),
  lexware_voucher_number: model.text().nullable(),
  status: model.text().default("pending"),
  error_message: model.text().nullable(),
})

export default LexwareCreditNote
