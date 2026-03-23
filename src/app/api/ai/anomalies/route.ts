import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()

  // Get this week's spending by category
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)
  const twoMonthsAgo = new Date(now)
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60)

  // This week's spending by category
  const thisWeek = db.prepare(`
    SELECT c.name as category, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ?
    GROUP BY c.name
  `).all(userId, weekAgo.toISOString().split('T')[0]) as any[]

  // Average weekly spending (from prior month)
  const avgWeekly = db.prepare(`
    SELECT c.name as category, SUM(t.amount) / 4.0 as avg_weekly
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date < ?
    GROUP BY c.name
  `).all(userId, twoMonthsAgo.toISOString().split('T')[0], weekAgo.toISOString().split('T')[0]) as any[]

  const avgMap = new Map(avgWeekly.map(a => [a.category, a.avg_weekly]))

  const anomalies: { category: string; current: number; average: number; ratio: number; message: string }[] = []

  for (const week of thisWeek) {
    const avg = avgMap.get(week.category)
    if (avg && avg > 0) {
      const ratio = week.total / avg
      if (ratio >= 1.5) {
        anomalies.push({
          category: week.category,
          current: Math.round(week.total * 100) / 100,
          average: Math.round(avg * 100) / 100,
          ratio: Math.round(ratio * 10) / 10,
          message: `${week.category} spending is ${Math.round(ratio * 10) / 10}x higher than your weekly average`
        })
      }
    }
  }

  // Check for unusually large single transactions
  const largeThreshold = db.prepare(`
    SELECT AVG(amount) * 3 as threshold
    FROM transactions
    WHERE user_id = ? AND type = 'expense' AND date >= ?
  `).get(userId, twoMonthsAgo.toISOString().split('T')[0]) as any

  if (largeThreshold?.threshold) {
    const largeTxns = db.prepare(`
      SELECT t.*, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.amount > ?
      ORDER BY t.amount DESC LIMIT 5
    `).all(userId, weekAgo.toISOString().split('T')[0], largeThreshold.threshold) as any[]

    for (const tx of largeTxns) {
      anomalies.push({
        category: tx.category_name || 'Uncategorized',
        current: tx.amount,
        average: Math.round(largeThreshold.threshold / 3 * 100) / 100,
        ratio: Math.round(tx.amount / (largeThreshold.threshold / 3) * 10) / 10,
        message: `Unusually large transaction: ${tx.description || tx.category_name} ($${tx.amount.toFixed(2)})`
      })
    }
  }

  anomalies.sort((a, b) => b.ratio - a.ratio)

  return NextResponse.json(anomalies)
}
