import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { Category } from '@/lib/types'

export async function GET() {
  const db = getDb()
  const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all() as Category[]
  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { name, type, color, icon, budget_amount } = body

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO categories (name, type, color, icon, budget_amount)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, type, color || null, icon || null, budget_amount || null)

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category
  return NextResponse.json(category, { status: 201 })
}
