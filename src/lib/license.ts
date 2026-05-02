import { createHmac } from "crypto"

const LICENSE_SECRET = "LexBridge-2026-HMAC-SigningKey-v1"

interface LicensePayload {
  email: string
  created: string
  expires?: string  // ISO-Datum, optional (ohne = unbegrenzt)
}

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

  if (signature !== expected) return false

  // Ablaufdatum pruefen
  try {
    const data: LicensePayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (data.expires) {
      const expiresAt = new Date(data.expires)
      if (expiresAt.getTime() < Date.now()) return false
    }
  } catch {
    return false
  }

  return true
}

export function generateLicenseKey(email: string, expiresInDays?: number): string {
  const data: LicensePayload = {
    email,
    created: new Date().toISOString(),
  }

  if (expiresInDays) {
    const expires = new Date()
    expires.setDate(expires.getDate() + expiresInDays)
    data.expires = expires.toISOString()
  }

  const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
  const signature = createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("base64url")
  return `LB-${payload}.${signature}`
}
