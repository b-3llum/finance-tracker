import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { queryAI } from '@/lib/ai-client'
import { buildOptimizationPrompt, SYSTEM_FINANCIAL_ADVISOR } from '@/lib/ai-prompts'
import { getMonthStart, getMonthEnd } from '@/lib/utils'

export async function POST() {
  const db = getDb()

  const start = getMonthStart()
  const end = getMonthEnd()
  const month = start.substring(0, 7)

  // Get monthly income
  const income = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'income' AND date BETWEEN ? AND ?
  `).get(start, end) as { total: number }

  // Get spending by category
  const expenses = db.prepare(`
    SELECT c.name as category, SUM(t.amount) as amount, COALESCE(c.budget_amount, 0) as budget
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
    GROUP BY c.id
    ORDER BY amount DESC
  `).all(start, end) as { category: string; amount: number; budget: number }[]

  // Get savings goals
  const goals = db.prepare(`
    SELECT name, target_amount as target, current_amount as current, deadline
    FROM savings_goals WHERE status = 'active'
  `).all() as { name: string; target: number; current: number; deadline: string }[]

  try {
    const prompt = buildOptimizationPrompt({
      income: income.total,
      expenses: expenses.map(e => ({ ...e })),
      savings_goals: goals,
      month,
    })

    const response = await queryAI(prompt, SYSTEM_FINANCIAL_ADVISOR)

    // Try to parse JSON from response
    let parsed
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response }
    } catch {
      parsed = { raw: response }
    }

    return NextResponse.json(parsed)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
