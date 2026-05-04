import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LEXWARE_MODULE } from "../../../../../index.js"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const result = await lexwareService.sendTestEmail()
  res.status(result.success ? 200 : 400).json(result)
}
