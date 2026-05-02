import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const orderId = req.query.order_id as string | undefined
  const creditNotes = await lexwareService.listCreditNotes(orderId)
  res.json({ credit_notes: creditNotes })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { order_id, items } = (req.body || {}) as {
    order_id: string
    items?: { name: string; quantity: number; grossAmount: number; taxRatePercentage: number }[]
  }

  if (!order_id) {
    return res.status(400).json({ message: "order_id ist erforderlich" })
  }

  try {
    const result = await lexwareService.issueCreditNote(order_id, logger, items)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
