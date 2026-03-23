import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId)
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const contributions = db.prepare(
      'SELECT * FROM savings_contributions WHERE goal_id = ? ORDER BY date DESC'
    ).all(id)

    return NextResponse.json({ ...goal, contributions })
  } catch (error) {
    return handleApiError(error, 'GET /api/savings/[id]')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const fields: string[] = []
    const values: any[] = []

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name) }
    if (body.target_amount !== undefined) { fields.push('target_amount = ?'); values.push(body.target_amount) }
    if (body.deadline !== undefined) { fields.push('deadline = ?'); values.push(body.deadline) }
    if (body.priority !== undefined) { fields.push('priority = ?'); values.push(body.priority) }
    if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status) }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    fields.push("updated_at = datetime('now')")
    values.push(id, userId)

    db.prepare(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId)
    return NextResponse.json(goal)
  } catch (error) {
    return handleApiError(error, 'PUT /api/savings/[id]')
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()

    const existing = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    db.prepare('DELETE FROM savings_contributions WHERE goal_id = ?').run(id)
    db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(id, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/savings/[id]')
  }
}
