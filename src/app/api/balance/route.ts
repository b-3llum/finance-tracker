import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const history = db.prepare(`
    SELECT balance, recorded_at FROM balance_history
    WHERE account_id = 1 AND recorded_at >= datetime('now', '-${days} days')
    ORDER BY recorded_at ASC
  `).all()

  return NextResponse.json(history)
}
