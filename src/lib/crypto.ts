import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const hex = process.env.LEXWARE_ENCRYPTION_KEY
  if (!hex) throw new Error("LEXWARE_ENCRYPTION_KEY ist nicht gesetzt")
  const buf = Buffer.from(hex, "hex")
  if (buf.length !== 32)
    throw new Error(
      "LEXWARE_ENCRYPTION_KEY muss 32 Bytes (64 hex Zeichen) sein"
    )
  return buf
}

export function encrypt(plaintext: string): {
  encrypted: string
  iv: string
  tag: string
} {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  }
}

export function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(iv, "hex"))
  decipher.setAuthTag(Buffer.from(tag, "hex"))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "hex")),
    decipher.final(),
  ]).toString("utf8")
}
