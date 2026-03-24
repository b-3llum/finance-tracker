import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()

    db.prepare('UPDATE users SET onboarding_complete = 1 WHERE id = ?').run(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'POST /api/auth/onboarding')
  }
}
