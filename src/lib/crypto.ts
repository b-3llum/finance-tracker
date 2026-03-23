import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (key && key.length >= 64) {
    return Buffer.from(key.substring(0, 64), 'hex')
  }
  // Dev fallback — NOT safe for production
  if (process.env.NODE_ENV !== 'production') {
    return Buffer.from('0'.repeat(64), 'hex')
  }
  throw new Error('ENCRYPTION_KEY env var is required in production')
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

export function decrypt(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) return encrypted
  const parts = encrypted.split(':')
  if (parts.length !== 3) return encrypted
  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(parts[0], 'base64')
    const authTag = Buffer.from(parts[1], 'base64')
    const ciphertext = parts[2]
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encrypted
  }
}

export function isEncrypted(value: string): boolean {
  if (!value) return false
  const parts = value.split(':')
  return parts.length === 3 && parts[0].length > 10
}
