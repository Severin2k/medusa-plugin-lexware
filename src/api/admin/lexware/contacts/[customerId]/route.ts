import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEXWARE_MODULE } from "../../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { customerId } = req.params
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any

  const contact = await lexwareService.getContactByCustomerId(customerId)

  if (!contact) {
    return res.status(404).json({ message: "No Lexware contact found for this customer" })
  }

  res.json({ contact })
}
