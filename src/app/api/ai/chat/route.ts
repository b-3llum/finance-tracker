import { getDb } from '@/lib/db'
import { streamOllama } from '@/lib/ollama'
import { buildChatPrompt, SYSTEM_FINANCIAL_ADVISOR } from '@/lib/ai-prompts'
import { getMonthStart, getMonthEnd } from '@/lib/utils'

export async function POST(request: Request) {
  const body = await request.json()
  const { question } = body

  if (!question) {
    return new Response(JSON.stringify({ error: 'Question is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const db = getDb()
  const account = db.prepare('SELECT current_balance FROM accounts WHERE id = 1').get() as { current_balance: number }

  const start = getMonthStart()
  const end = getMonthEnd()

  const monthlyIncome = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'income' AND date BETWEEN ? AND ?
  `).get(start, end) as { total: number }

  const monthlyExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE type = 'expense' AND date BETWEEN ? AND ?
  `).get(start, end) as { total: number }

  const goals = db.prepare(`
    SELECT name, target_amount as target, current_amount as current
    FROM savings_goals WHERE status = 'active'
  `).all() as { name: string; target: number; current: number }[]

  try {
    const prompt = buildChatPrompt(question, {
      balance: account.current_balance,
      monthly_income: monthlyIncome.total,
      monthly_expenses: monthlyExpenses.total,
      savings_goals: goals,
    })

    const stream = await streamOllama(prompt, SYSTEM_FINANCIAL_ADVISOR)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
