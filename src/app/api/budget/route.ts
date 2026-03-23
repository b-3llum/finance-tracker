import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { getMonthStart, getMonthEnd } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || undefined

    const start = getMonthStart(month)
    const end = getMonthEnd(month)

    const account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId) as { id: number } | undefined
    if (!account) {
      return NextResponse.json({ error: 'No account found for user' }, { status: 404 })
    }

    const budget = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.color,
        c.icon,
        COALESCE(c.budget_amount, 0) as budget_amount,
        COALESCE(SUM(t.amount), 0) as spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND t.date BETWEEN ? AND ? AND t.type = 'expense' AND t.account_id = ?
      WHERE c.type = 'expense' AND (c.user_id IS NULL OR c.user_id = ?)
      GROUP BY c.id
      ORDER BY c.name
    `).all(start, end, account.id, userId) as any[]

    const totalBudget = budget.reduce((sum: number, b: any) => sum + b.budget_amount, 0)
    const totalSpent = budget.reduce((sum: number, b: any) => sum + b.spent, 0)

    return NextResponse.json({
      month: start.substring(0, 7),
      categories: budget.map(b => ({
        ...b,
        remaining: b.budget_amount - b.spent,
        percent: b.budget_amount > 0 ? Math.round((b.spent / b.budget_amount) * 100) : 0,
      })),
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/budget')
  }
}
