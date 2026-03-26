import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createSession } from '@/lib/auth'

function buildUrl(path: string, request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3001'
  const proto = request.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}${path}`
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return NextResponse.redirect(buildUrl('/login?error=Email+and+password+are+required', request))
  }

  const user = await authenticateUser(email, password)
  if (!user) {
    return NextResponse.redirect(buildUrl('/login?error=Invalid+email+or+password', request))
  }

  const token = await createSession(user.id)

  const response = NextResponse.redirect(buildUrl('/dashboard', request))
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: false,
  })
  return response
}
