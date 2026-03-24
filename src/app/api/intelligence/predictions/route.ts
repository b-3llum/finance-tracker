import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface MonthlyCategorySpend {
  month: string
  category_id: number
  category_name: string
  total: number
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const db = getDb()

    const account = db.prepare('SELECT id, current_balance FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as { id: number; current_balance: number } | undefined
    if (!account) {
      return NextResponse.json({ error: 'No account found for user' }, { status: 404 })
    }

    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

    // Gather per-category monthly spending for the last 3 months
    const monthlyCatSpend = db.prepare(`
      SELECT
        strftime('%Y-%m', t.date) as month,
        t.category_id,
        c.name as category_name,
        SUM(t.amount) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.category_id IS NOT NULL
      GROUP BY strftime('%Y-%m', t.date), t.category_id
      ORDER BY month, c.name
    `).all(userId, threeMonthsAgoStr) as MonthlyCategorySpend[]

    // Build sorted list of the last 3 months
    const monthSet = new Set(monthlyCatSpend.map(r => r.month))
    const months = Array.from(monthSet).sort()

    // Weighted moving average weights: oldest=1, middle=2, most recent=3
    const weights = months.length === 3 ? [1, 2, 3] : months.length === 2 ? [1, 2] : [1]
    const weightSum = weights.reduce((a, b) => a + b, 0)

    // Group by category
    const catMap = new Map<number, { name: string; monthly: number[] }>()
    for (const row of monthlyCatSpend) {
      if (!catMap.has(row.category_id)) {
        catMap.set(row.category_id, { name: row.category_name, monthly: new Array(months.length).fill(0) })
      }
      const idx = months.indexOf(row.month)
      if (idx >= 0) catMap.get(row.category_id)!.monthly[idx] = row.total
    }

    // ── 1. Next Month Forecast by Category ──
    const forecasts: {
      category_id: number
      category_name: string
      forecast: number
      monthly_history: number[]
      trend_percent: number
    }[] = []

    for (const [catId, data] of catMap) {
      let forecast = 0
      for (let i = 0; i < data.monthly.length; i++) {
        forecast += data.monthly[i] * weights[i]
      }
      forecast = Math.round((forecast / weightSum) * 100) / 100

      // Trend: compare oldest to most recent
      const oldest = data.monthly[0] || 0
      const newest = data.monthly[data.monthly.length - 1] || 0
      const trendPercent = oldest > 0
        ? Math.round(((newest - oldest) / oldest) * 1000) / 10
        : newest > 0 ? 100 : 0

      forecasts.push({
        category_id: catId,
        category_name: data.name,
        forecast,
        monthly_history: data.monthly,
        trend_percent: trendPercent,
      })
    }

    forecasts.sort((a, b) => b.forecast - a.forecast)

    const totalForecast = forecasts.reduce((s, f) => s + f.forecast, 0)

    // ── 2. Cash Shortfall Detection ──
    // Get average daily income and expenses, then project day-by-day for 30 days
    const avgDailyIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) / 90.0 as avg FROM transactions
      WHERE user_id = ? AND type = 'income' AND date >= ?
    `).get(userId, threeMonthsAgoStr) as { avg: number }

    // Get spending pattern by day-of-week
    const dayOfWeekSpending = db.prepare(`
      SELECT
        CAST(strftime('%w', date) AS INTEGER) as dow,
        AVG(daily_total) as avg_spend
      FROM (
        SELECT date, SUM(amount) as daily_total
        FROM transactions
        WHERE user_id = ? AND type = 'expense' AND date >= ?
        GROUP BY date
      )
      GROUP BY CAST(strftime('%w', date) AS INTEGER)
    `).all(userId, threeMonthsAgoStr) as { dow: number; avg_spend: number }[]

    const dowMap = new Map<number, number>()
    for (const d of dayOfWeekSpending) dowMap.set(d.dow, d.avg_spend)
    const avgDailyExpense = dayOfWeekSpending.length > 0
      ? dayOfWeekSpending.reduce((s, d) => s + d.avg_spend, 0) / 7
      : 0

    // Get upcoming bills for the next 30 days
    const bills = db.prepare(`
      SELECT name, amount, due_day FROM bills
      WHERE user_id = ? AND status = 'active'
    `).all(userId) as { name: string; amount: number; due_day: number }[]

    let projectedBalance = account.current_balance
    const dailyProjection: { date: string; balance: number }[] = []
    const shortfallDates: { date: string; projected_balance: number; shortfall: number }[] = []

    for (let d = 0; d < 30; d++) {
      const date = new Date(now)
      date.setDate(date.getDate() + d)
      const dateStr = date.toISOString().split('T')[0]
      const dow = date.getDay()
      const dom = date.getDate()

      // Daily expense based on day-of-week pattern
      const dailyExpense = dowMap.get(dow) ?? avgDailyExpense

      // Daily income spread evenly
      projectedBalance += avgDailyIncome.avg
      projectedBalance -= dailyExpense

      // Bill payments
      for (const bill of bills) {
        if (dom === bill.due_day) {
          projectedBalance -= bill.amount
        }
      }

      projectedBalance = Math.round(projectedBalance * 100) / 100

      if (d % 3 === 0 || projectedBalance < 0) {
        dailyProjection.push({ date: dateStr, balance: projectedBalance })
      }

      if (projectedBalance < 0) {
        shortfallDates.push({
          date: dateStr,
          projected_balance: projectedBalance,
          shortfall: Math.abs(projectedBalance),
        })
      }
    }

    // ── 3. Trend Alerts ──
    const trendAlerts: {
      category_id: number
      category_name: string
      increase_percent: number
      current_monthly: number
      previous_avg: number
    }[] = []

    for (const [catId, data] of catMap) {
      if (data.monthly.length < 2) continue
      const recent = data.monthly[data.monthly.length - 1]
      const priorAvg = data.monthly.slice(0, -1).reduce((s, v) => s + v, 0) / (data.monthly.length - 1)
      if (priorAvg > 0) {
        const increase = ((recent - priorAvg) / priorAvg) * 100
        if (increase > 15) {
          trendAlerts.push({
            category_id: catId,
            category_name: data.name,
            increase_percent: Math.round(increase * 10) / 10,
            current_monthly: Math.round(recent * 100) / 100,
            previous_avg: Math.round(priorAvg * 100) / 100,
          })
        }
      }
    }

    trendAlerts.sort((a, b) => b.increase_percent - a.increase_percent)

    // ── 4. Budget Recommendations ──
    // Recommend budget = weighted average + small buffer (10%), rounded to nearest $5
    const budgetRecommendations: {
      category_id: number
      category_name: string
      current_budget: number
      recommended_budget: number
      avg_actual: number
    }[] = []

    const currentBudgets = db.prepare(`
      SELECT id, name, COALESCE(budget_amount, 0) as budget_amount
      FROM categories
      WHERE type = 'expense' AND (user_id IS NULL OR user_id = ?)
    `).all(userId) as { id: number; name: string; budget_amount: number }[]

    const budgetMap = new Map<number, number>()
    for (const b of currentBudgets) budgetMap.set(b.id, b.budget_amount)

    for (const f of forecasts) {
      const recommended = Math.ceil((f.forecast * 1.1) / 5) * 5 // 10% buffer, round up to $5
      budgetRecommendations.push({
        category_id: f.category_id,
        category_name: f.category_name,
        current_budget: budgetMap.get(f.category_id) || 0,
        recommended_budget: recommended,
        avg_actual: f.forecast,
      })
    }

    // ── 5. Savings Potential ──
    const totalRecommended = budgetRecommendations.reduce((s, b) => s + b.recommended_budget, 0)
    const totalCurrentBudget = budgetRecommendations.reduce((s, b) => s + b.current_budget, 0)

    const monthlyIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) / ? as avg
      FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ?
    `).get(Math.max(months.length, 1), userId, threeMonthsAgoStr) as { avg: number }

    const currentSavingsGap = monthlyIncome.avg - totalForecast
    const potentialSavingsGap = monthlyIncome.avg - totalRecommended

    const categoryPotential = budgetRecommendations
      .filter(b => b.avg_actual > b.recommended_budget * 0.9) // categories where user could cut back
      .map(b => ({
        category_id: b.category_id,
        category_name: b.category_name,
        potential_saving: Math.round((b.avg_actual - b.recommended_budget * 0.85) * 100) / 100,
      }))
      .filter(c => c.potential_saving > 0)
      .sort((a, b) => b.potential_saving - a.potential_saving)

    return NextResponse.json({
      forecast: {
        month: getNextMonth(),
        categories: forecasts,
        total_forecast: Math.round(totalForecast * 100) / 100,
      },
      cash_flow: {
        current_balance: account.current_balance,
        daily_projection: dailyProjection,
        shortfall_dates: shortfallDates,
        has_shortfall: shortfallDates.length > 0,
        days_until_shortfall: shortfallDates.length > 0
          ? Math.round((new Date(shortfallDates[0].date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      },
      trend_alerts: trendAlerts,
      budget_recommendations: budgetRecommendations,
      savings_potential: {
        current_monthly_savings: Math.round(currentSavingsGap * 100) / 100,
        potential_monthly_savings: Math.round(potentialSavingsGap * 100) / 100,
        additional_savings_possible: Math.round(Math.max(0, potentialSavingsGap - currentSavingsGap) * 100) / 100,
        top_categories: categoryPotential,
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/intelligence/predictions')
  }
}

function getNextMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
