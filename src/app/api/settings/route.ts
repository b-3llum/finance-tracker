import { NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    return NextResponse.json(getAllSettings(userId))
  } catch (error) {
    return handleApiError(error, 'GET /api/settings')
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserId(request)
    const body = await request.json()

    for (const [key, value] of Object.entries(body)) {
      setSetting(key, String(value), userId)
    }

    return NextResponse.json(getAllSettings(userId))
  } catch (error) {
    return handleApiError(error, 'PUT /api/settings')
  }
}
