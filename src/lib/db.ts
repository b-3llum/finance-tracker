import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { encrypt, decrypt, isEncrypted } from './crypto'

const DB_PATH = path.join(process.cwd(), 'data', 'finance.db')
const MIGRATIONS_PATH = path.join(process.cwd(), 'migrations')

const SENSITIVE_KEYS = ['claude_api_key', 'openai_api_key']

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    runMigrations(db)
  }
  return db
}

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    database.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name)
  )

  const files = fs.readdirSync(MIGRATIONS_PATH)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_PATH, file), 'utf-8')
    database.exec(sql)
    database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    console.log(`Migration applied: ${file}`)
  }
}

export function getSetting(key: string, userId?: number): string | null {
  const uid = userId ?? 1
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ? AND user_id = ?').get(key, uid) as { value: string } | undefined
  if (!row) return null
  if (SENSITIVE_KEYS.includes(key) && isEncrypted(row.value)) {
    return decrypt(row.value)
  }
  return row.value
}

export function setSetting(key: string, value: string, userId?: number): void {
  const uid = userId ?? 1
  const storedValue = SENSITIVE_KEYS.includes(key) && value ? encrypt(value) : value
  getDb().prepare('INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (?, ?, ?)').run(uid, key, storedValue)
}

export function getAllSettings(userId?: number): Record<string, string> {
  const uid = userId ?? 1
  const rows = getDb().prepare('SELECT key, value FROM settings WHERE user_id = ?').all(uid) as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (SENSITIVE_KEYS.includes(row.key) && isEncrypted(row.value)) {
      settings[row.key] = decrypt(row.value)
    } else {
      settings[row.key] = row.value
    }
  }
  return settings
}
