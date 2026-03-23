import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const userId = getUserId(request)
  const db = getDb()

  const accounts = db.prepare('SELECT name, current_balance as balance FROM accounts WHERE user_id = ?').all(userId) as any[]
  const debts = db.prepare('SELECT name, current_balance as balance, type FROM debts WHERE user_id = ? AND status = ?').all(userId, 'active') as any[]
  const savings = db.prepare('SELECT name, current_amount as current FROM savings_goals WHERE user_id = ? AND status = ?').all(userId, 'active') as any[]

  const total_assets = accounts.reduce((sum: number, a: any) => sum + Math.max(0, a.balance), 0)
    + savings.reduce((sum: number, s: any) => sum + s.current, 0)
  const total_liabilities = debts.reduce((sum: number, d: any) => sum + d.balance, 0)

  return NextResponse.json({
    total_assets,
    total_liabilities,
    net_worth: total_assets - total_liabilities,
    accounts,
    debts,
    savings,
  })
}
