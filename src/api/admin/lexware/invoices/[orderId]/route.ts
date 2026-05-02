import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEXWARE_MODULE } from "../../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { orderId } = req.params
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any

  const invoice = await lexwareService.getInvoiceByOrderId(orderId)

  if (!invoice) {
    return res.status(404).json({ message: "No invoice found for this order" })
  }

  res.json({ invoice })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { orderId } = req.params
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any

  try {
    await lexwareService.retryFailedInvoice(orderId, req.scope)
    const invoice = await lexwareService.getInvoiceByOrderId(orderId)
    res.json({ invoice, message: "Invoice creation triggered" })
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Invoice creation failed" })
  }
}
