import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { queryAI } from '@/lib/ai-client'
import { buildProfilePrompt, SYSTEM_FINANCIAL_ADVISOR } from '@/lib/ai-prompts'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const profile = db.prepare(
      'SELECT * FROM ai_profiles WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1'
    ).get(userId)

    if (!profile) {
      return NextResponse.json({ error: 'No profile generated yet', data_days: getDataDays(userId) }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    return handleApiError(error, 'GET /api/ai/profile')
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)

    if (!rateLimit(`ai-profile:${userId}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 })
    }

    const db = getDb()
    const days = getDataDays(userId)

    if (days < 14) {
      return NextResponse.json({
        error: `Need at least 14 days of data. Currently have ${days} days.`,
        data_days: days,
      }, { status: 400 })
    }

    // Category breakdown
    const categories = db.prepare(`
      SELECT c.name as category, SUM(t.amount) as total, COUNT(*) as count,
             AVG(t.amount) as avg_per_transaction
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND t.user_id = ?
      GROUP BY c.id ORDER BY total DESC
    `).all(userId) as any[]

    // Day of week spending
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dowSpending = db.prepare(`
      SELECT CAST(strftime('%w', date) AS INTEGER) as dow, SUM(amount) as amount
      FROM transactions WHERE type = 'expense' AND user_id = ?
      GROUP BY dow ORDER BY dow
    `).all(userId) as { dow: number; amount: number }[]

    const totalIncome = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'income\' AND user_id = ?'
    ).get(userId) as { total: number }

    const totalExpenses = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\' AND user_id = ?'
    ).get(userId) as { total: number }

    const recurring = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\' AND recurring = 1 AND user_id = ?'
    ).get(userId) as { total: number }

    const oneTime = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\' AND recurring = 0 AND user_id = ?'
    ).get(userId) as { total: number }

    const prompt = buildProfilePrompt({
      days,
      total_income: totalIncome.total,
      total_expenses: totalExpenses.total,
      category_breakdown: categories,
      day_of_week_spending: dowSpending.map(d => ({
        day: dayNames[d.dow],
        amount: d.amount,
      })),
      recurring_expenses: recurring.total,
      one_time_expenses: oneTime.total,
    })

    const response = await queryAI(prompt, SYSTEM_FINANCIAL_ADVISOR, userId)

    let profileData
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      profileData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response }
    } catch {
      profileData = { raw: response }
    }

    const existing = db.prepare('SELECT MAX(version) as v FROM ai_profiles WHERE user_id = ?').get(userId) as { v: number | null }
    const version = (existing.v || 0) + 1

    const result = db.prepare(`
      INSERT INTO ai_profiles (user_id, profile_data, data_days, version)
      VALUES (?, ?, ?, ?)
    `).run(userId, JSON.stringify(profileData), days, version)

    const profile = db.prepare('SELECT * FROM ai_profiles WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json(profile)
  } catch (error) {
    return handleApiError(error, 'POST /api/ai/profile')
  }
}

function getDataDays(userId: number): number {
  const db = getDb()
  const result = db.prepare(`
    SELECT CAST(julianday('now') - julianday(MIN(date)) AS INTEGER) as days
    FROM transactions WHERE user_id = ?
  `).get(userId) as { days: number | null }
  return result?.days || 0
}
