import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateWeeklyReport, generateMonthlyReport } from '@/lib/report-generator'

export async function GET(request: Request) {
  const db = getDb()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  let where = ''
  const params: any[] = []
  if (type) { where = 'WHERE type = ?'; params.push(type) }

  const reports = db.prepare(`
    SELECT id, type, period_start, period_end, ai_insights, created_at
    FROM reports ${where} ORDER BY created_at DESC LIMIT 20
  `).all(...params)

  return NextResponse.json(reports)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { type, date } = body

  try {
    let reportId: number
    if (type === 'monthly') {
      reportId = await generateMonthlyReport(date)
    } else {
      reportId = await generateWeeklyReport(date)
    }

    const db = getDb()
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId)
    return NextResponse.json(report, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
