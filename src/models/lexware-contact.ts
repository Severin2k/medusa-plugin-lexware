import { model } from "@medusajs/framework/utils"

const LexwareContact = model.define("lexware_contact", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  email: model.text(),
  lexware_contact_id: model.text().unique(),
})

export default LexwareContact
