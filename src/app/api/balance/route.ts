import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const safeDays = Math.max(1, Math.min(365, isNaN(days) ? 30 : days))

    const history = db.prepare(`
      SELECT balance, recorded_at FROM balance_history
      WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)
        AND recorded_at >= datetime('now', '-' || ? || ' days')
      ORDER BY recorded_at ASC
    `).all(userId, safeDays)

    return NextResponse.json(history)
  } catch (e) {
    return handleApiError(e, 'balance:GET')
  }
}
