import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()

  const { searchParams } = new URL(request.url)
  const months = parseInt(searchParams.get('months') || '3')

  // Get current balance
  const account = db.prepare('SELECT current_balance FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as any
  const currentBalance = account?.current_balance || 0

  // Get recurring transactions
  const recurring = db.prepare(`
    SELECT t.type, t.amount, t.description, t.recurring_interval, t.category_id, c.name as category_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.recurring = 1
  `).all(userId) as any[]

  // Get monthly bills
  const bills = db.prepare(`
    SELECT name, amount, due_day, frequency FROM bills
    WHERE user_id = ? AND status = 'active'
  `).all(userId) as any[]

  // Calculate average monthly income/expenses from last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const avgData = db.prepare(`
    SELECT type,
      SUM(amount) / 3.0 as avg_monthly
    FROM transactions
    WHERE user_id = ? AND date >= ? AND recurring = 0
    GROUP BY type
  `).all(userId, threeMonthsAgo.toISOString().split('T')[0]) as any[]

  const avgIncome = avgData.find(d => d.type === 'income')?.avg_monthly || 0
  const avgExpense = avgData.find(d => d.type === 'expense')?.avg_monthly || 0

  // Project forward
  const dates: string[] = []
  const projected_balance: number[] = []
  const income_events: { date: string; amount: number; label: string }[] = []
  const expense_events: { date: string; amount: number; label: string }[] = []

  let balance = currentBalance
  const today = new Date()

  for (let d = 0; d <= months * 30; d++) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfMonth = date.getDate()
    const isFirstOfMonth = dayOfMonth === 1

    // Add bill payments on due days
    for (const bill of bills) {
      if (dayOfMonth === bill.due_day) {
        balance -= bill.amount
        expense_events.push({ date: dateStr, amount: bill.amount, label: bill.name })
      }
    }

    // Add recurring transactions
    for (const tx of recurring) {
      const shouldApply = (tx.recurring_interval === 'monthly' && dayOfMonth === 1) ||
        (tx.recurring_interval === 'weekly' && date.getDay() === 1) ||
        (tx.recurring_interval === 'biweekly' && date.getDay() === 1 && Math.floor(d / 7) % 2 === 0)

      if (shouldApply) {
        if (tx.type === 'income') {
          balance += tx.amount
          income_events.push({ date: dateStr, amount: tx.amount, label: tx.description || tx.category_name || 'Income' })
        } else {
          balance -= tx.amount
          expense_events.push({ date: dateStr, amount: tx.amount, label: tx.description || tx.category_name || 'Expense' })
        }
      }
    }

    // Add average non-recurring on first of month
    if (isFirstOfMonth && d > 0) {
      balance += avgIncome
      balance -= avgExpense
      if (avgIncome > 0) income_events.push({ date: dateStr, amount: avgIncome, label: 'Avg monthly income' })
      if (avgExpense > 0) expense_events.push({ date: dateStr, amount: avgExpense, label: 'Avg monthly expenses' })
    }

    // Sample every 7 days for chart
    if (d % 7 === 0) {
      dates.push(dateStr)
      projected_balance.push(Math.round(balance * 100) / 100)
    }
  }

  return NextResponse.json({ dates, projected_balance, income_events, expense_events })
}
