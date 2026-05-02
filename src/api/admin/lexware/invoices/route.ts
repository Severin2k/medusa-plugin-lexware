import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEXWARE_MODULE } from "../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any

  const status = req.query.status as string | undefined
  const limit = parseInt(req.query.limit as string) || 20
  const offset = parseInt(req.query.offset as string) || 0

  const filters: any = {}
  if (status) {
    filters.status = status
  }

  const invoices = await lexwareService.listLexwareInvoices(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })

  res.json({
    invoices,
    count: invoices.length,
    limit,
    offset,
  })
}
