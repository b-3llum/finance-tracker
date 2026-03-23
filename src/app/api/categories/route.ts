import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import type { Category } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const categories = db.prepare(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type, name'
    ).all(userId) as Category[]
    return NextResponse.json(categories)
  } catch (error) {
    return handleApiError(error, 'GET /api/categories')
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const body = await request.json()
    const { name, type, color, icon, budget_amount } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    const result = db.prepare(`
      INSERT INTO categories (user_id, name, type, color, icon, budget_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name, type, color || null, icon || null, budget_amount || null)

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/categories')
  }
}
