import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const body = await request.json()
  const db = getDb()

  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?').get(id, userId)
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, amount, due_day, category_id, frequency, auto_pay, reminder_days, status, notes, last_paid_date } = body

  // Recalculate next due date if marking as paid
  let next_due_date = (bill as any).next_due_date
  if (last_paid_date) {
    const day = due_day || (bill as any).due_day
    const paid = new Date(last_paid_date)
    const nextDue = new Date(paid.getFullYear(), paid.getMonth() + 1, day)
    next_due_date = nextDue.toISOString().split('T')[0]
  }

  db.prepare(`
    UPDATE bills SET
      name = COALESCE(?, name),
      amount = COALESCE(?, amount),
      due_day = COALESCE(?, due_day),
      category_id = COALESCE(?, category_id),
      frequency = COALESCE(?, frequency),
      auto_pay = COALESCE(?, auto_pay),
      reminder_days = COALESCE(?, reminder_days),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      last_paid_date = COALESCE(?, last_paid_date),
      next_due_date = ?,
      updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(name, amount, due_day, category_id, frequency, auto_pay !== undefined ? (auto_pay ? 1 : 0) : null, reminder_days, status, notes, last_paid_date, next_due_date, id, userId)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request)
  const { id } = await params
  const db = getDb()
  const result = db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(id, userId)
  if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
