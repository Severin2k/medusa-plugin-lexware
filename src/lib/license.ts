import { createHmac } from "crypto"

const LICENSE_SECRET = "LexBridge-2026-HMAC-SigningKey-v1"

export function validateLicenseKey(key: string | undefined): boolean {
  if (!key) return false
  if (!key.startsWith("LB-")) return false

  const rest = key.slice(3)
  const dotIndex = rest.lastIndexOf(".")
  if (dotIndex === -1) return false

  const payload = rest.slice(0, dotIndex)
  const signature = rest.slice(dotIndex + 1)

  const expected = createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("base64url")

  return signature === expected
}

export function generateLicenseKey(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, created: new Date().toISOString() })).toString("base64url")
  const signature = createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("base64url")
  return `LB-${payload}.${signature}`
}
