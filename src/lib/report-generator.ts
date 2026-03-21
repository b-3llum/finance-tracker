import { getDb } from './db'
import { queryAI } from './ai-client'
import { buildReportInsightsPrompt, SYSTEM_FINANCIAL_ADVISOR } from './ai-prompts'
import { getWeekStart, getWeekEnd, getMonthStart, getMonthEnd } from './utils'
import type { WeeklyReportData, MonthlyReportData } from './types'

export async function generateWeeklyReport(dateInWeek?: string): Promise<number> {
  const db = getDb()
  const start = getWeekStart(dateInWeek)
  const end = getWeekEnd(dateInWeek)

  const reportData = buildReportData(start, end)

  let aiInsights: string | null = null
  try {
    aiInsights = await queryAI(
      buildReportInsightsPrompt({
        type: 'weekly',
        period: `${start} to ${end}`,
        income: reportData.total_income,
        expenses: reportData.total_expenses,
        net: reportData.net_change,
        top_categories: reportData.top_expense_categories.map(c => ({ name: c.name, amount: c.amount })),
        budget_status: reportData.budget_adherence.map(b => ({ category: b.category, percent: b.percent })),
        savings_progress: [],
      }),
      SYSTEM_FINANCIAL_ADVISOR
    )
  } catch (e) {
    console.error('Failed to generate AI insights for weekly report:', e)
  }

  const result = db.prepare(`
    INSERT INTO reports (type, period_start, period_end, data, ai_insights)
    VALUES ('weekly', ?, ?, ?, ?)
  `).run(start, end, JSON.stringify(reportData), aiInsights)

  return result.lastInsertRowid as number
}

export async function generateMonthlyReport(month?: string): Promise<number> {
  const db = getDb()
  const start = getMonthStart(month)
  const end = getMonthEnd(month)

  const reportData = buildReportData(start, end) as MonthlyReportData

  // income by source
  const incomeSources = db.prepare(`
    SELECT c.name as source, SUM(t.amount) as amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'income' AND t.date BETWEEN ? AND ?
    GROUP BY c.name
    ORDER BY amount DESC
  `).all(start, end) as { source: string; amount: number }[]
  reportData.income_by_source = incomeSources

  // expense trend vs last month
  const prevStart = getMonthStart(new Date(new Date(start + 'T00:00:00').setMonth(new Date(start + 'T00:00:00').getMonth() - 1)).toISOString().split('T')[0])
  const prevEnd = getMonthEnd(prevStart)
  const prevExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'expense' AND date BETWEEN ? AND ?
  `).get(prevStart, prevEnd) as { total: number }
  reportData.expense_trend_vs_last_month = prevExpenses.total > 0
    ? ((reportData.total_expenses - prevExpenses.total) / prevExpenses.total) * 100
    : 0

  // savings goal progress
  const goals = db.prepare(`
    SELECT name, target_amount as target, current_amount as current, deadline
    FROM savings_goals WHERE status = 'active'
  `).all() as { name: string; target: number; current: number; deadline: string }[]
  reportData.savings_goal_progress = goals

  let aiInsights: string | null = null
  try {
    aiInsights = await queryAI(
      buildReportInsightsPrompt({
        type: 'monthly',
        period: `${start} to ${end}`,
        income: reportData.total_income,
        expenses: reportData.total_expenses,
        net: reportData.net_change,
        top_categories: reportData.top_expense_categories.map(c => ({ name: c.name, amount: c.amount })),
        budget_status: reportData.budget_adherence.map(b => ({ category: b.category, percent: b.percent })),
        savings_progress: goals.map(g => ({
          name: g.name,
          percent: g.target > 0 ? Math.round((g.current / g.target) * 100) : 0,
        })),
      }),
      SYSTEM_FINANCIAL_ADVISOR
    )
  } catch (e) {
    console.error('Failed to generate AI insights for monthly report:', e)
  }

  const result = db.prepare(`
    INSERT INTO reports (type, period_start, period_end, data, ai_insights)
    VALUES ('monthly', ?, ?, ?, ?)
  `).run(start, end, JSON.stringify(reportData), aiInsights)

  return result.lastInsertRowid as number
}

function buildReportData(start: string, end: string): WeeklyReportData {
  const db = getDb()

  const account = db.prepare('SELECT current_balance FROM accounts WHERE id = 1').get() as { current_balance: number }

  const totals = db.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) as total
    FROM transactions WHERE date BETWEEN ? AND ?
    GROUP BY type
  `).all(start, end) as { type: string; total: number }[]

  const totalIncome = totals.find(t => t.type === 'income')?.total || 0
  const totalExpenses = totals.find(t => t.type === 'expense')?.total || 0

  const topCategories = db.prepare(`
    SELECT c.name, SUM(t.amount) as amount, COALESCE(c.budget_amount, 0) as budget
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
    GROUP BY c.id
    ORDER BY amount DESC
    LIMIT 10
  `).all(start, end) as { name: string; amount: number; budget: number }[]

  const txCount = db.prepare(`
    SELECT COUNT(*) as count FROM transactions WHERE date BETWEEN ? AND ?
  `).get(start, end) as { count: number }

  const savingsContribs = db.prepare(`
    SELECT g.name as goal, SUM(sc.amount) as amount
    FROM savings_contributions sc
    JOIN savings_goals g ON sc.goal_id = g.id
    WHERE sc.date BETWEEN ? AND ?
    GROUP BY g.id
  `).all(start, end) as { goal: string; amount: number }[]

  const budgetAdherence = db.prepare(`
    SELECT c.name as category, c.budget_amount as budgeted, COALESCE(SUM(t.amount), 0) as actual
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND t.date BETWEEN ? AND ?
    WHERE c.type = 'expense' AND c.budget_amount IS NOT NULL AND c.budget_amount > 0
    GROUP BY c.id
  `).all(start, end) as { category: string; budgeted: number; actual: number }[]

  // opening balance: current balance minus net change in period
  const openingBalance = account.current_balance - (totalIncome - totalExpenses)

  return {
    period: { start, end },
    opening_balance: openingBalance,
    closing_balance: account.current_balance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_change: totalIncome - totalExpenses,
    top_expense_categories: topCategories,
    transactions_count: txCount.count,
    savings_contributions: savingsContribs,
    budget_adherence: budgetAdherence.map(b => ({
      ...b,
      percent: b.budgeted > 0 ? Math.round((b.actual / b.budgeted) * 100) : 0,
    })),
  }
}
