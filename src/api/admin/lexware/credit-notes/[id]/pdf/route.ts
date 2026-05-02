import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../../../../../../index.js"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lexwareService = req.scope.resolve(LEXWARE_MODULE) as any
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { id } = req.params

  try {
    const { pdf } = await lexwareService.downloadCreditNotePdf(
      { lexware_credit_note_id: id },
      logger
    )
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="Gutschrift-${id}.pdf"`)
    res.send(pdf)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
