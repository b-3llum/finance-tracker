import { getDb } from '@/lib/db'
import { streamAI } from '@/lib/ai-client'
import { buildChatPrompt, SYSTEM_FINANCIAL_ADVISOR } from '@/lib/ai-prompts'
import { getMonthStart, getMonthEnd } from '@/lib/utils'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)

    if (!rateLimit(`ai-chat:${userId}`, 10, 60_000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const { question } = body

    if (!question) {
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const db = getDb()
    const account = db.prepare('SELECT current_balance FROM accounts WHERE user_id = ?').get(userId) as { current_balance: number }

    const start = getMonthStart()
    const end = getMonthEnd()

    const monthlyIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'income' AND date BETWEEN ? AND ? AND user_id = ?
    `).get(start, end, userId) as { total: number }

    const monthlyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE type = 'expense' AND date BETWEEN ? AND ? AND user_id = ?
    `).get(start, end, userId) as { total: number }

    const goals = db.prepare(`
      SELECT name, target_amount as target, current_amount as current
      FROM savings_goals WHERE status = 'active' AND user_id = ?
    `).all(userId) as { name: string; target: number; current: number }[]

    const prompt = buildChatPrompt(question, {
      balance: account.current_balance,
      monthly_income: monthlyIncome.total,
      monthly_expenses: monthlyExpenses.total,
      savings_goals: goals,
    })

    const stream = streamAI(prompt, SYSTEM_FINANCIAL_ADVISOR, userId)

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    return handleApiError(error, 'POST /api/ai/chat')
  }
}
