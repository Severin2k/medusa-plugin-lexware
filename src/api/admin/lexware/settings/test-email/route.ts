import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../../../../../index.js"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const result = await lexwareService.sendTestEmail(logger)
  res.status(result.success ? 200 : 400).json(result)
}
