import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEXWARE_MODULE } from "../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const settings = await lexwareService.getSettings()
  res.json(settings)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const { api_key, invoice_on_order, payment_due_days, dry_run } = req.body as {
    api_key?: string
    invoice_on_order?: boolean
    payment_due_days?: number
    dry_run?: boolean
  }

  await lexwareService.upsertSettings({
    api_key,
    invoice_on_order,
    payment_due_days,
    dry_run,
  })

  res.json({ success: true })
}
