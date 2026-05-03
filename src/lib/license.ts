import { createHmac } from "crypto"

const LICENSE_SECRET = "LexBridge-2026-HMAC-SigningKey-v1"

// Cache fuer Lemon Squeezy Validierung (einmal pro Start)
let lsValidationCache: { valid: boolean; checkedAt: number } | null = null
const LS_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

interface LicensePayload {
  email: string
  created: string
  expires?: string  // ISO-Datum, optional (ohne = unbegrenzt)
}

interface LemonSqueezyValidateResponse {
  valid: boolean
  error?: string
  license_key?: {
    id: number
    status: string
    key: string
    activation_limit: number
    activations_count: number
    expires_at: string | null
  }
  instance?: {
    id: string
    name: string
  }
  meta?: {
    store_id: number
    product_id: number
    variant_id: number
  }
}

/**
 * Validiert einen HMAC-signierten License Key (offline)
 */
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

/**
 * Aktiviert und validiert einen Lemon Squeezy License Key (online).
 * Ergebnis wird fuer 24h gecached.
 */
export async function validateLemonSqueezyKey(key: string | undefined, instanceName?: string): Promise<boolean> {
  if (!key) return false

  // Cache pruefen
  if (lsValidationCache && (Date.now() - lsValidationCache.checkedAt) < LS_CACHE_TTL) {
    return lsValidationCache.valid
  }

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/activate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        license_key: key,
        instance_name: instanceName || `medusa-${require("os").hostname()}`,
      }),
    })

    const data: LemonSqueezyValidateResponse = await res.json()

    // Status 400 mit "already activated" zaehlt als gueltig
    if (!data.valid && res.status === 400) {
      // Bereits aktivierte Instanz - validate stattdessen
      const validateRes = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          license_key: key,
          instance_id: data.instance?.id || "",
        }),
      })
      const validateData: LemonSqueezyValidateResponse = await validateRes.json()
      const valid = validateData.valid && validateData.license_key?.status === "active"
      lsValidationCache = { valid: !!valid, checkedAt: Date.now() }
      return !!valid
    }

    const valid = data.valid && data.license_key?.status !== "expired" && data.license_key?.status !== "disabled"
    lsValidationCache = { valid: !!valid, checkedAt: Date.now() }
    return !!valid
  } catch {
    // Bei Netzwerkfehler: Cache beibehalten wenn vorhanden, sonst false
    if (lsValidationCache) return lsValidationCache.valid
    return false
  }
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
