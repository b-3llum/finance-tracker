import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Account } from '@/lib/types'

export async function GET() {
  const db = getDb()
  const account = db.prepare('SELECT * FROM accounts WHERE id = 1').get() as Account
  return NextResponse.json(account)
}

export async function PUT(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { current_balance, name } = body

  if (current_balance !== undefined) {
    db.prepare(`
      UPDATE accounts SET current_balance = ?, updated_at = datetime('now') WHERE id = 1
    `).run(current_balance)

    db.prepare(`
      INSERT INTO balance_history (account_id, balance, note) VALUES (1, ?, 'Manual balance update')
    `).run(current_balance)
  }

  if (name !== undefined) {
    db.prepare(`UPDATE accounts SET name = ?, updated_at = datetime('now') WHERE id = 1`).run(name)
  }

  const account = db.prepare('SELECT * FROM accounts WHERE id = 1').get() as Account
  return NextResponse.json(account)
}
