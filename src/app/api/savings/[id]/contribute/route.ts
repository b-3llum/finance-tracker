import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await request.json()
  const { amount, note, date } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as any
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  const contributeTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO savings_contributions (goal_id, amount, date, note)
      VALUES (?, ?, ?, ?)
    `).run(id, amount, date || new Date().toISOString().split('T')[0], note || null)

    const newAmount = goal.current_amount + amount
    const status = newAmount >= goal.target_amount ? 'completed' : goal.status

    db.prepare(`
      UPDATE savings_goals SET current_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newAmount, status, id)
  })

  contributeTx()

  const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id)
  return NextResponse.json(updated)
}
