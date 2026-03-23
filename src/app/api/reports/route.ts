import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/report-generator'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let where = 'WHERE user_id = ?'
    const params: any[] = [userId]
    if (type) { where += ' AND type = ?'; params.push(type) }

    const reports = db.prepare(`
      SELECT id, type, period_start, period_end, ai_insights, created_at
      FROM reports ${where} ORDER BY created_at DESC LIMIT 20
    `).all(...params)

    return NextResponse.json(reports)
  } catch (error) {
    return handleApiError(error, 'GET /api/reports')
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request)
    const body = await request.json()
    const { type, date } = body

    let reportId: number
    if (type === 'monthly') {
      reportId = await generateMonthlyReport(date, userId)
    } else {
      reportId = await generateWeeklyReport(date, userId)
    }

    const db = getDb()
    const report = db.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').get(reportId, userId)
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'POST /api/reports')
  }
}
