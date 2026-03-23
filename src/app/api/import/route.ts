import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const userId = getUserId(request)
  const body = await request.json()
  const { rows, mapping } = body

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No data to import' }, { status: 400 })
  }

  const db = getDb()

  // Get user's first account
  const account = db.prepare('SELECT id FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as any
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 400 })

  const insert = db.prepare(`
    INSERT INTO transactions (account_id, user_id, type, amount, description, date, category_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  const txn = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const date = row[mapping.date]
        const description = row[mapping.description] || ''
        const amountStr = String(row[mapping.amount] || '0').replace(/[,$]/g, '')
        const amount = parseFloat(amountStr)

        if (!date || isNaN(amount) || amount === 0) {
          skipped++
          continue
        }

        // Determine type from amount sign or explicit type column
        let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense'
        if (mapping.type !== undefined && row[mapping.type]) {
          const t = String(row[mapping.type]).toLowerCase()
          if (t.includes('income') || t.includes('credit') || t.includes('deposit')) type = 'income'
          else if (t.includes('expense') || t.includes('debit') || t.includes('withdrawal')) type = 'expense'
        }

        // Normalize date to YYYY-MM-DD
        const parsed = parseDate(date)
        if (!parsed) {
          errors.push(`Row ${i + 1}: Invalid date "${date}"`)
          skipped++
          continue
        }

        // Try to match category by description
        let categoryId: number | null = null
        if (mapping.category !== undefined && row[mapping.category]) {
          const cat = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND user_id = ?')
            .get(String(row[mapping.category]).trim(), userId) as any
          if (cat) categoryId = cat.id
        }

        insert.run(account.id, userId, type, Math.abs(amount), description.trim(), parsed, categoryId)
        imported++
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message}`)
        skipped++
      }
    }

    // Update account balance
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as net
      FROM transactions WHERE account_id = ? AND user_id = ?
    `).get(account.id, userId) as any
    db.prepare('UPDATE accounts SET current_balance = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(totals.net, account.id)
  })

  txn()

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10) })
}

function parseDate(input: string): string | null {
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  // Try MM/DD/YYYY
  const mdy = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  // Try DD/MM/YYYY (if day > 12)
  const dmy = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy && parseInt(dmy[1]) > 12) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // Try Date.parse as fallback
  const d = new Date(input)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}
