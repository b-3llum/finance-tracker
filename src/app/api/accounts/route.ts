import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import type { Account } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const account = db.prepare('SELECT * FROM accounts WHERE user_id = ?').get(userId) as Account
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    return NextResponse.json(account)
  } catch (e) {
    return handleApiError(e, 'accounts:GET')
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const body = await request.json()
    const { current_balance, name } = body

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: number } | undefined
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    if (current_balance !== undefined) {
      db.prepare('UPDATE accounts SET current_balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(current_balance, account.id)
      db.prepare('INSERT INTO balance_history (account_id, balance, note) VALUES (?, ?, \'Manual balance update\')').run(account.id, current_balance)
    }

    if (name !== undefined) {
      db.prepare('UPDATE accounts SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, account.id)
    }

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id) as Account
    return NextResponse.json(updated)
  } catch (e) {
    return handleApiError(e, 'accounts:PUT')
  }
}
