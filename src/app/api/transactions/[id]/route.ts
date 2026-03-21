import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const transaction = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(id)

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }
  return NextResponse.json(transaction)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const body = await request.json()

  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any
  if (!existing) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const updateTx = db.transaction(() => {
    // Reverse old balance impact
    const oldImpact = existing.type === 'income' ? -existing.amount : existing.amount
    db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = 1').run(oldImpact)

    // Update transaction
    const newAmount = body.amount !== undefined ? Math.abs(body.amount) : existing.amount
    const newType = body.type || existing.type

    db.prepare(`
      UPDATE transactions SET
        category_id = ?, type = ?, amount = ?, description = ?, date = ?,
        recurring = ?, recurring_interval = ?
      WHERE id = ?
    `).run(
      body.category_id !== undefined ? body.category_id : existing.category_id,
      newType,
      newAmount,
      body.description !== undefined ? body.description : existing.description,
      body.date || existing.date,
      body.recurring !== undefined ? (body.recurring ? 1 : 0) : existing.recurring,
      body.recurring_interval !== undefined ? body.recurring_interval : existing.recurring_interval,
      id
    )

    // Apply new balance impact
    const newImpact = newType === 'income' ? newAmount : -newAmount
    db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = 1').run(newImpact)

    const account = db.prepare('SELECT current_balance FROM accounts WHERE id = 1').get() as { current_balance: number }
    db.prepare('INSERT INTO balance_history (account_id, balance) VALUES (1, ?)').run(account.current_balance)
  })

  updateTx()

  const transaction = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?
  `).get(id)

  return NextResponse.json(transaction)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()

  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any
  if (!existing) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  const deleteTx = db.transaction(() => {
    const impact = existing.type === 'income' ? -existing.amount : existing.amount
    db.prepare('UPDATE accounts SET current_balance = current_balance + ?, updated_at = datetime(\'now\') WHERE id = 1').run(impact)
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id)

    const account = db.prepare('SELECT current_balance FROM accounts WHERE id = 1').get() as { current_balance: number }
    db.prepare('INSERT INTO balance_history (account_id, balance) VALUES (1, ?)').run(account.current_balance)
  })

  deleteTx()
  return NextResponse.json({ success: true })
}
