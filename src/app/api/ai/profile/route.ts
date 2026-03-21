import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { queryAI } from '@/lib/ai-client'
import { buildProfilePrompt, SYSTEM_FINANCIAL_ADVISOR } from '@/lib/ai-prompts'

export async function GET() {
  const db = getDb()
  const profile = db.prepare(
    'SELECT * FROM ai_profiles ORDER BY generated_at DESC LIMIT 1'
  ).get()

  if (!profile) {
    return NextResponse.json({ error: 'No profile generated yet', data_days: getDataDays() }, { status: 404 })
  }

  return NextResponse.json(profile)
}

export async function POST() {
  const db = getDb()
  const days = getDataDays()

  if (days < 14) {
    return NextResponse.json({
      error: `Need at least 14 days of data. Currently have ${days} days.`,
      data_days: days,
    }, { status: 400 })
  }

  const firstDate = db.prepare(
    'SELECT MIN(date) as min_date FROM transactions'
  ).get() as { min_date: string }

  // Category breakdown
  const categories = db.prepare(`
    SELECT c.name as category, SUM(t.amount) as total, COUNT(*) as count,
           AVG(t.amount) as avg_per_transaction
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense'
    GROUP BY c.id ORDER BY total DESC
  `).all() as any[]

  // Day of week spending
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dowSpending = db.prepare(`
    SELECT CAST(strftime('%w', date) AS INTEGER) as dow, SUM(amount) as amount
    FROM transactions WHERE type = 'expense'
    GROUP BY dow ORDER BY dow
  `).all() as { dow: number; amount: number }[]

  const totalIncome = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'income\''
  ).get() as { total: number }

  const totalExpenses = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\''
  ).get() as { total: number }

  const recurring = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\' AND recurring = 1'
  ).get() as { total: number }

  const oneTime = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = \'expense\' AND recurring = 0'
  ).get() as { total: number }

  try {
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

    const response = await queryAI(prompt, SYSTEM_FINANCIAL_ADVISOR)

    let profileData
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      profileData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response }
    } catch {
      profileData = { raw: response }
    }

    const existing = db.prepare('SELECT MAX(version) as v FROM ai_profiles').get() as { v: number | null }
    const version = (existing.v || 0) + 1

    const result = db.prepare(`
      INSERT INTO ai_profiles (profile_data, data_days, version)
      VALUES (?, ?, ?)
    `).run(JSON.stringify(profileData), days, version)

    const profile = db.prepare('SELECT * FROM ai_profiles WHERE id = ?').get(result.lastInsertRowid)
    return NextResponse.json(profile)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getDataDays(): number {
  const db = getDb()
  const result = db.prepare(`
    SELECT CAST(julianday('now') - julianday(MIN(date)) AS INTEGER) as days
    FROM transactions
  `).get() as { days: number | null }
  return result?.days || 0
}
