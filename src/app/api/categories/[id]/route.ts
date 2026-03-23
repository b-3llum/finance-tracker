import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const body = await request.json()
    const { name, color, icon, budget_amount } = body

    // Verify category belongs to user (or is a global category)
    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as any
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const fields: string[] = []
    const values: any[] = []

    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (color !== undefined) { fields.push('color = ?'); values.push(color) }
    if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
    if (budget_amount !== undefined) { fields.push('budget_amount = ?'); values.push(budget_amount) }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id, userId)
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`).run(...values)

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    return NextResponse.json(category)
  } catch (error) {
    return handleApiError(error, 'PUT /api/categories/[id]')
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()

    // Verify category belongs to user (or is a global category)
    const existing = db.prepare('SELECT * FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(id, userId) as any
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(id) as { count: number }
    if (txCount.count > 0) {
      return NextResponse.json({ error: 'Cannot delete category with existing transactions' }, { status: 400 })
    }

    db.prepare('DELETE FROM categories WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(id, userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/categories/[id]')
  }
}
