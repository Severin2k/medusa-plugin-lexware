import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEXWARE_MODULE } from "../index.js"

const WARN_DAYS = 30

export default async function apiKeyExpiryCheck(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const lexwareService = container.resolve(LEXWARE_MODULE) as any

  const settings = await lexwareService.getSettings()

  if (!settings.is_pro) return
  if (!settings.has_api_key || !settings.api_key_created_at) return
  if (!settings.notification_email || !settings.smtp_host) return

  const created = new Date(settings.api_key_created_at)
  const expiresAt = new Date(created)
  expiresAt.setMonth(expiresAt.getMonth() + 24)
  const diffMs = expiresAt.getTime() - Date.now()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysRemaining > WARN_DAYS) return
  if (daysRemaining < -7) return // Laengst abgelaufen, keine Spam-Mails mehr

  const subject = daysRemaining <= 0
    ? "LexBridge: API Key ist abgelaufen!"
    : `LexBridge: API Key laeuft in ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tagen"} ab`

  const text = daysRemaining <= 0
    ? "Dein Lexware API Key ist abgelaufen. Rechnungen koennen nicht mehr erstellt werden.\n\nBitte erstelle einen neuen Key in Lexware Office und trage ihn im Admin unter Lexware ein."
    : `Dein Lexware API Key laeuft in ${daysRemaining} ${daysRemaining === 1 ? "Tag" : "Tagen"} ab.\n\nBitte erstelle rechtzeitig einen neuen Key in Lexware Office und trage ihn im Admin unter Lexware ein.`

  try {
    const transporter = await lexwareService.buildMailTransporter()
    if (!transporter) return

    await transporter.sendMail({
      from: `"LexBridge" <${settings.smtp_user}>`,
      to: settings.notification_email,
      subject,
      text,
    })
    logger.info(`[lexware] API-Key-Ablauf-Warnung gesendet: ${daysRemaining} Tage verbleibend`)
  } catch (err: any) {
    logger.error(`[lexware] API-Key-Ablauf-Mail fehlgeschlagen: ${err.message}`)
  }
}

export const config = {
  name: "lexware-api-key-expiry-check",
  schedule: "0 8 * * *", // taeglich um 08:00
}
