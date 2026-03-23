import { checkAIStatus } from '@/lib/ai-client'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

export async function GET(request: Request) {
  try {
    const userId = getUserId(request)
    const status = await checkAIStatus(userId)
    return Response.json(status)
  } catch (error) {
    return handleApiError(error, 'GET /api/ai/status')
  }
}
