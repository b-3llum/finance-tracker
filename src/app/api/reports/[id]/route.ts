import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id)
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(report)
}
