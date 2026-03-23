import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()

  // Find recurring expense patterns: same description + similar amount appearing monthly
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const candidates = db.prepare(`
    SELECT description, ROUND(amount, 2) as amount, COUNT(*) as occurrences,
      MIN(date) as first_seen, MAX(date) as last_seen,
      c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ?
      AND t.description IS NOT NULL AND t.description != ''
    GROUP BY description, ROUND(amount, 2)
    HAVING COUNT(*) >= 2
    ORDER BY occurrences DESC, amount DESC
  `).all(userId, sixMonthsAgo.toISOString().split('T')[0]) as any[]

  // Also flag explicit recurring transactions
  const explicit = db.prepare(`
    SELECT description, amount, recurring_interval, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.recurring = 1 AND t.type = 'expense'
    GROUP BY description, amount
  `).all(userId) as any[]

  const subscriptions = [
    ...explicit.map(e => ({
      name: e.description || e.category_name || 'Unknown',
      amount: e.amount,
      frequency: e.recurring_interval || 'monthly',
      category: e.category_name,
      category_color: e.category_color,
      confirmed: true,
      monthly_cost: calcMonthlyCost(e.amount, e.recurring_interval || 'monthly'),
    })),
    ...candidates
      .filter(c => !explicit.some(e => e.description === c.description && Math.abs(e.amount - c.amount) < 0.01))
      .map(c => ({
        name: c.description,
        amount: c.amount,
        frequency: guessFrequency(c.occurrences, c.first_seen, c.last_seen),
        category: c.category_name,
        category_color: c.category_color,
        confirmed: false,
        monthly_cost: calcMonthlyCost(c.amount, guessFrequency(c.occurrences, c.first_seen, c.last_seen)),
      }))
  ]

  const total_monthly = subscriptions.reduce((sum, s) => sum + s.monthly_cost, 0)
  const total_yearly = total_monthly * 12

  return NextResponse.json({ subscriptions, total_monthly: Math.round(total_monthly * 100) / 100, total_yearly: Math.round(total_yearly * 100) / 100 })
}

function guessFrequency(occurrences: number, firstSeen: string, lastSeen: string): string {
  const days = (new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 86400000
  if (days === 0) return 'monthly'
  const avgGap = days / (occurrences - 1)
  if (avgGap <= 10) return 'weekly'
  if (avgGap <= 20) return 'biweekly'
  if (avgGap <= 45) return 'monthly'
  if (avgGap <= 120) return 'quarterly'
  return 'yearly'
}

function calcMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    default: return amount
  }
}
