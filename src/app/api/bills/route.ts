import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()
  const bills = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color
    FROM bills b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ?
    ORDER BY b.next_due_date ASC, b.due_day ASC
  `).all(userId)

  const today = new Date().toISOString().split('T')[0]
  const enriched = (bills as any[]).map(b => {
    const daysUntil = b.next_due_date
      ? Math.ceil((new Date(b.next_due_date).getTime() - new Date(today).getTime()) / 86400000)
      : null
    return { ...b, days_until_due: daysUntil, is_overdue: daysUntil !== null && daysUntil < 0 }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  const body = await request.json()
  const { name, amount, due_day, category_id, frequency, auto_pay, reminder_days, notes } = body

  if (!name || !amount || !due_day) {
    return NextResponse.json({ error: 'Name, amount, and due day are required' }, { status: 400 })
  }

  const db = getDb()

  // Calculate next due date
  const now = new Date()
  let nextDue = new Date(now.getFullYear(), now.getMonth(), due_day)
  if (nextDue <= now) {
    nextDue = new Date(now.getFullYear(), now.getMonth() + 1, due_day)
  }
  const next_due_date = nextDue.toISOString().split('T')[0]

  const result = db.prepare(`
    INSERT INTO bills (user_id, name, amount, due_day, category_id, frequency, auto_pay, reminder_days, next_due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name, amount, due_day, category_id || null, frequency || 'monthly', auto_pay ? 1 : 0, reminder_days || 3, next_due_date, notes || null)

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
}
