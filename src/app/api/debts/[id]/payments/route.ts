import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const db = getDb()

  const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, userId)
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payments = db.prepare('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY date DESC').all(id)
  return NextResponse.json(payments)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const body = await request.json()
  const { amount, note } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
  }

  const db = getDb()
  const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, userId) as any
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newBalance = Math.max(0, debt.current_balance - amount)

  db.prepare('INSERT INTO debt_payments (debt_id, amount, note) VALUES (?, ?, ?)').run(id, amount, note || null)
  db.prepare('UPDATE debts SET current_balance = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newBalance, newBalance === 0 ? 'paid_off' : 'active', id)

  return NextResponse.json({ new_balance: newBalance }, { status: 201 })
}
