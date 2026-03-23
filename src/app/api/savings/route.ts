import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import type { SavingsGoal } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const goals = db.prepare(`
      SELECT * FROM savings_goals WHERE user_id = ? ORDER BY
        CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
        priority ASC, created_at DESC
    `).all(userId) as SavingsGoal[]

    return NextResponse.json(goals)
  } catch (error) {
    return handleApiError(error, 'GET /api/savings')
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const body = await request.json()
    const { name, target_amount, deadline, priority } = body

    if (!name || !target_amount) {
      return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 })
    }

    const result = db.prepare(`
      INSERT INTO savings_goals (user_id, name, target_amount, deadline, priority)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, target_amount, deadline || null, priority || 1)

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid) as SavingsGoal
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/savings')
  }
}
