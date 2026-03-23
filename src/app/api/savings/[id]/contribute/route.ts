import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const body = await request.json()
    const { amount, note, date } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId) as any
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
        UPDATE savings_goals SET current_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?
      `).run(newAmount, status, id, userId)
    })

    contributeTx()

    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId)
    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'POST /api/savings/[id]/contribute')
  }
}
