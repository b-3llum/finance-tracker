import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError, validateAmount, validateDate } from '@/lib/api-utils'
import type { TransactionWithCategory } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let where = 'WHERE t.user_id = ?'
    const params: any[] = [userId]

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
  } catch (error) {
    return handleApiError(error, 'GET /api/transactions')
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const body = await request.json()
    const { category_id, type, amount, description, date, recurring, recurring_interval } = body

    if (!type || !amount || !date) {
      return NextResponse.json({ error: 'Type, amount, and date are required' }, { status: 400 })
    }

    const amountCheck = validateAmount(amount)
    if (!amountCheck.valid) {
      return NextResponse.json({ error: amountCheck.error }, { status: 400 })
    }

    if (!validateDate(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
    }

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: number } | undefined
    if (!account) {
      return NextResponse.json({ error: 'No account found for user' }, { status: 404 })
    }

    const insertTx = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO transactions (account_id, user_id, category_id, type, amount, description, date, recurring, recurring_interval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        account.id,
        userId,
        category_id || null,
        type,
        amountCheck.value,
        description || null,
        date,
        recurring ? 1 : 0,
        recurring_interval || null
      )

      // Update account balance
      const balanceChange = type === 'income' ? amountCheck.value : -amountCheck.value
      db.prepare(`
        UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?
      `).run(balanceChange, account.id, userId)

      // Record balance history
      const updatedAccount = db.prepare('SELECT current_balance FROM accounts WHERE id = ? AND user_id = ?').get(account.id, userId) as { current_balance: number }
      db.prepare(`
        INSERT INTO balance_history (account_id, balance) VALUES (?, ?)
      `).run(account.id, updatedAccount.current_balance)

      return result.lastInsertRowid
    })

    const txId = insertTx()
    const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(txId, userId)

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/transactions')
  }
}
