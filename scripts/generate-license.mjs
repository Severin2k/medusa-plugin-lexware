#!/usr/bin/env node
import { createHmac } from "crypto"

const LICENSE_SECRET = "LexBridge-2026-HMAC-SigningKey-v1"

const email = process.argv[2]
const daysArg = process.argv[3]

if (!email) {
  console.error("Usage: node generate-license.mjs <email> [days]")
  console.error("")
  console.error("  <email>   Kunden-E-Mail")
  console.error("  [days]    Gueltigkeitsdauer in Tagen (ohne = unbegrenzt)")
  console.error("")
  console.error("Beispiele:")
  console.error("  node generate-license.mjs kunde@shop.de        # Unbegrenzt (Jahresabo)")
  console.error("  node generate-license.mjs kunde@shop.de 35     # 35 Tage (Monatsabo)")
  process.exit(1)
}

const data = {
  email,
  created: new Date().toISOString(),
}

if (daysArg) {
  const days = parseInt(daysArg)
  if (isNaN(days) || days < 1) {
    console.error("Fehler: Tage muss eine positive Zahl sein")
    process.exit(1)
  }
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  data.expires = expires.toISOString()
}

const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
const signature = createHmac("sha256", LICENSE_SECRET).update(payload).digest("base64url")
const key = `LB-${payload}.${signature}`

console.log(`\nLicense Key fuer ${email}:`)
if (data.expires) {
  console.log(`Gueltig bis: ${new Date(data.expires).toLocaleDateString("de-DE")}`)
} else {
  console.log("Gueltig: unbegrenzt")
}
console.log(`\n${key}\n`)
