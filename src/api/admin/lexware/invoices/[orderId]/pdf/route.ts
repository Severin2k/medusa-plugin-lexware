import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../../../../../../index.js"
import { LexwareApiClient } from "../../../../../../client/lexware-api.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { orderId } = req.params
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  const invoice = await lexwareService.getInvoiceByOrderId(orderId)

  if (!invoice || !invoice.lexware_invoice_id) {
    return res.status(404).json({ message: "No Lexware invoice found for this order" })
  }

  try {
    const apiKey = lexwareService.options?.api_key
    if (!apiKey) {
      return res.status(500).json({ message: "Lexware API key not configured" })
    }

    const client = new LexwareApiClient(apiKey, logger)
    const pdfBuffer = await client.downloadInvoicePdf(invoice.lexware_invoice_id)

    const filename = `Rechnung-${invoice.lexware_voucher_number || orderId}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", pdfBuffer.length)
    res.send(pdfBuffer)
  } catch (err: any) {
    logger.error(`lexware: PDF download failed for order ${orderId}: ${err.message}`)
    res.status(500).json({ message: "Failed to download PDF from Lexware" })
  }
}
