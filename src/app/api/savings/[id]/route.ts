import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contributions = db.prepare(
    'SELECT * FROM savings_contributions WHERE goal_id = ? ORDER BY date DESC'
  ).all(id)

  return NextResponse.json({ ...goal, contributions })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await request.json()

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
  values.push(id)

  db.prepare(`UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id)
  return NextResponse.json(goal)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  db.prepare('DELETE FROM savings_contributions WHERE goal_id = ?').run(id)
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
