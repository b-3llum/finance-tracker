import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { getDb } from './db'

const COST_FACTOR = 12

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (secret) return new TextEncoder().encode(secret)
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Auth] JWT_SECRET not set — using dev fallback. Set JWT_SECRET in .env.local for production.')
    return new TextEncoder().encode('dev-secret-do-not-use-in-production-000')
  }
  throw new Error('JWT_SECRET env var is required in production')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function verifySession(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (!payload.sub) return null
    return { userId: parseInt(payload.sub, 10) }
  } catch {
    return null
  }
}

export function getUserId(request: Request): number {
  const header = request.headers.get('x-user-id')
  if (!header) throw new Error('Not authenticated')
  return parseInt(header, 10)
}

export async function createUser(email: string, password: string, name?: string): Promise<{ id: number; email: string; name: string | null }> {
  const db = getDb()
  const passwordHash = await hashPassword(password)

  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email, passwordHash, name || null)

  const userId = result.lastInsertRowid as number

  // Create default account for new user
  db.prepare(
    'INSERT INTO accounts (user_id, name, current_balance) VALUES (?, ?, 0)'
  ).run(userId, 'Main Account')

  // Copy default settings for new user
  const defaultSettings = [
    ['currency', 'USD'],
    ['currency_symbol', '$'],
    ['ai_provider', 'ollama'],
    ['ollama_url', 'http://localhost:11434'],
    ['ollama_model', 'llama3'],
    ['claude_api_key', ''],
    ['claude_model', 'claude-sonnet-4-6'],
    ['openai_api_key', ''],
    ['openai_model', 'gpt-4o'],
  ]
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (user_id, key, value) VALUES (?, ?, ?)')
  for (const [key, value] of defaultSettings) {
    insertSetting.run(userId, key, value)
  }

  return { id: userId, email, name: name || null }
}

export async function authenticateUser(email: string, password: string): Promise<{ id: number; email: string; name: string | null } | null> {
  const db = getDb()
  const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email) as
    { id: number; email: string; name: string | null; password_hash: string } | undefined

  if (!user) return null

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return null

  return { id: user.id, email: user.email, name: user.name }
}

export function getSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `auth_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}${secure}`
}

export function clearSessionCookie(): string {
  return 'auth_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
}
