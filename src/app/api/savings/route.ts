import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { SavingsGoal } from '@/lib/types'

export async function GET() {
  const db = getDb()
  const goals = db.prepare(`
    SELECT * FROM savings_goals ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
      priority ASC, created_at DESC
  `).all() as SavingsGoal[]

  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { name, target_amount, deadline, priority } = body

  if (!name || !target_amount) {
    return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO savings_goals (name, target_amount, deadline, priority)
    VALUES (?, ?, ?, ?)
  `).run(name, target_amount, deadline || null, priority || 1)

  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid) as SavingsGoal
  return NextResponse.json(goal, { status: 201 })
}
