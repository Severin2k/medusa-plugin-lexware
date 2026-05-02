import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../index.js"

export default async function orderPlacedLexwareInvoice({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const lexwareService = container.resolve(LEXWARE_MODULE) as any

  if (!lexwareService.options?.invoice_on_order) {
    logger.info("lexware: invoice_on_order is disabled, skipping")
    return
  }

  try {
    await lexwareService.processOrderInvoice(data.id, container)
  } catch (err) {
    logger.error(`lexware: Unhandled error processing order ${data.id}: ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
