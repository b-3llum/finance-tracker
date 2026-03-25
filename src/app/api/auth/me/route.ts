import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const db = getDb()
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(userId) as
      { id: number; email: string; name: string | null; created_at: string } | undefined

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json(user)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
