import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(id, userId)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }
    return NextResponse.json(transaction)
  } catch (error) {
    return handleApiError(error, 'GET /api/transactions/[id]')
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const body = await request.json()

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as any
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: number }

    const updateTx = db.transaction(() => {
      // Reverse old balance impact
      const oldImpact = existing.type === 'income' ? -existing.amount : existing.amount
      db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?').run(oldImpact, account.id, userId)

      // Update transaction
      const newAmount = body.amount !== undefined ? Math.abs(body.amount) : existing.amount
      const newType = body.type || existing.type

      db.prepare(`
        UPDATE transactions SET
          category_id = ?, type = ?, amount = ?, description = ?, date = ?,
          recurring = ?, recurring_interval = ?
        WHERE id = ? AND user_id = ?
      `).run(
        body.category_id !== undefined ? body.category_id : existing.category_id,
        newType,
        newAmount,
        body.description !== undefined ? body.description : existing.description,
        body.date || existing.date,
        body.recurring !== undefined ? (body.recurring ? 1 : 0) : existing.recurring,
        body.recurring_interval !== undefined ? body.recurring_interval : existing.recurring_interval,
        id,
        userId
      )

      // Apply new balance impact
      const newImpact = newType === 'income' ? newAmount : -newAmount
      db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(newImpact, account.id, userId)

      const updatedAccount = db.prepare('SELECT current_balance FROM accounts WHERE id = ? AND user_id = ?').get(account.id, userId) as { current_balance: number }
      db.prepare('INSERT INTO balance_history (account_id, balance) VALUES (?, ?)').run(account.id, updatedAccount.current_balance)
    })

    updateTx()

    const transaction = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ? AND t.user_id = ?
    `).get(id, userId)

    return NextResponse.json(transaction)
  } catch (error) {
    return handleApiError(error, 'PUT /api/transactions/[id]')
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()

    const existing = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(id, userId) as any
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: number }

    const deleteTx = db.transaction(() => {
      const impact = existing.type === 'income' ? -existing.amount : existing.amount
      db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(impact, account.id, userId)
      db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId)

      const updatedAccount = db.prepare('SELECT current_balance FROM accounts WHERE id = ? AND user_id = ?').get(account.id, userId) as { current_balance: number }
      db.prepare('INSERT INTO balance_history (account_id, balance) VALUES (?, ?)').run(account.id, updatedAccount.current_balance)
    })

    deleteTx()
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'DELETE /api/transactions/[id]')
  }
}
