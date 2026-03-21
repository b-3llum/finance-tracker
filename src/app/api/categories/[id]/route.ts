import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await request.json()
  const { name, color, icon, budget_amount } = body

  const fields: string[] = []
  const values: any[] = []

  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (color !== undefined) { fields.push('color = ?'); values.push(color) }
  if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
  if (budget_amount !== undefined) { fields.push('budget_amount = ?'); values.push(budget_amount) }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  values.push(id)
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  return NextResponse.json(category)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number }
  if (txCount.count > 0) {
    return NextResponse.json({ error: 'Cannot delete category with existing transactions' }, { status: 400 })
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return NextResponse.json({ success: true })
}
