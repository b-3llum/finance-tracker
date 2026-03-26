import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login?error=Email+and+password+are+required', request.url))
  }

  const user = await authenticateUser(email, password)
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=Invalid+email+or+password', request.url))
  }

  const token = await createSession(user.id)

  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: false,
  })
  return response
}
