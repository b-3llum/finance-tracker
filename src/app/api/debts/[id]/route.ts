import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const body = await request.json()
  const db = getDb()

  const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND user_id = ?').get(id, userId)
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, type, current_balance, interest_rate, minimum_payment, due_day, status } = body

  db.prepare(`
    UPDATE debts SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      current_balance = COALESCE(?, current_balance),
      interest_rate = COALESCE(?, interest_rate),
      minimum_payment = COALESCE(?, minimum_payment),
      due_day = COALESCE(?, due_day),
      status = COALESCE(?, status),
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(name, type, current_balance, interest_rate, minimum_payment, due_day, status, id, userId)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const db = getDb()
  const result = db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run(id, userId)
  if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
