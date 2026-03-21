import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { TransactionWithCategory } from '@/lib/types'

export async function GET(request: Request) {
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const type = searchParams.get('type')
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let where = 'WHERE 1=1'
  const params: any[] = []

  if (from) { where += ' AND t.date >= ?'; params.push(from) }
  if (to) { where += ' AND t.date <= ?'; params.push(to) }
  if (type) { where += ' AND t.type = ?'; params.push(type) }
  if (category) { where += ' AND t.category_id = ?'; params.push(category) }

  const transactions = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as TransactionWithCategory[]

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM transactions t ${where}
  `).get(...params) as { count: number }

  return NextResponse.json({ transactions, total: total.count })
}

export async function POST(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { category_id, type, amount, description, date, recurring, recurring_interval } = body

  if (!type || !amount || !date) {
    return NextResponse.json({ error: 'Type, amount, and date are required' }, { status: 400 })
  }

  const insertTx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO transactions (account_id, category_id, type, amount, description, date, recurring, recurring_interval)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category_id || null,
      type,
      Math.abs(amount),
      description || null,
      date,
      recurring ? 1 : 0,
      recurring_interval || null
    )

    // Update account balance
    const balanceChange = type === 'income' ? Math.abs(amount) : -Math.abs(amount)
    db.prepare(`
      UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime('now') WHERE id = 1
    `).run(balanceChange)

    // Record balance history
    const account = db.prepare('SELECT current_balance FROM accounts WHERE id = 1').get() as { current_balance: number }
    db.prepare(`
      INSERT INTO balance_history (account_id, balance) VALUES (1, ?)
    `).run(account.current_balance)

    return result.lastInsertRowid
  })

  const txId = insertTx()
  const transaction = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(txId)

  return NextResponse.json(transaction, { status: 201 })
}
