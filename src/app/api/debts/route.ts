import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()
  const debts = db.prepare(`
    SELECT d.*,
      COALESCE((SELECT SUM(dp.amount) FROM debt_payments dp WHERE dp.debt_id = d.id), 0) as total_paid
    FROM debts d
    WHERE d.user_id = ?
    ORDER BY d.interest_rate DESC, d.current_balance DESC
  `).all(userId)

  return NextResponse.json(debts)
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  const body = await request.json()
  const { name, type, original_balance, current_balance, interest_rate, minimum_payment, due_day } = body

  if (!name || !type || original_balance === undefined) {
    return NextResponse.json({ error: 'Name, type, and original balance are required' }, { status: 400 })
  }

  const db = getDb()
  const result = db.prepare(`
    INSERT INTO debts (user_id, name, type, original_balance, current_balance, interest_rate, minimum_payment, due_day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name, type, original_balance, current_balance ?? original_balance, interest_rate || 0, minimum_payment || 0, due_day || null)

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
}
