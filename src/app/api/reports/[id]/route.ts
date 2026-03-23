import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request)
    const { id } = await params
    const db = getDb()
    const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(id, userId)
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (error) {
    return handleApiError(error, 'GET /api/reports/[id]')
  }
}
