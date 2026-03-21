import { checkAIStatus } from '@/lib/ai-client'

export async function GET() {
  try {
    const status = await checkAIStatus()
    return Response.json(status)
  } catch (error: any) {
    return Response.json(
      { available: false, provider: 'unknown', detail: error.message },
      { status: 500 }
    )
  }
}
