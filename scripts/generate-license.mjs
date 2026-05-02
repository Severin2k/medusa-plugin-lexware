#!/usr/bin/env node
import { createHmac } from "crypto"

const LICENSE_SECRET = "LexBridge-2026-HMAC-SigningKey-v1"

const email = process.argv[2]
if (!email) {
  console.error("Usage: node generate-license.mjs <email>")
  process.exit(1)
}

const payload = Buffer.from(JSON.stringify({ email, created: new Date().toISOString() })).toString("base64url")
const signature = createHmac("sha256", LICENSE_SECRET).update(payload).digest("base64url")
const key = `LB-${payload}.${signature}`

console.log(`\nLicense Key fuer ${email}:\n`)
console.log(key)
console.log()
