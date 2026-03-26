import { NextRequest, NextResponse } from 'next/server'
import { createUser, createSession } from '@/lib/auth'

function buildUrl(path: string, request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3001'
  const proto = request.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}${path}`
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !password) {
    return NextResponse.redirect(buildUrl('/register?error=Email+and+password+are+required', request))
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(buildUrl('/register?error=Passwords+do+not+match', request))
  }

  if (password.length < 8) {
    return NextResponse.redirect(buildUrl('/register?error=Password+must+be+at+least+8+characters', request))
  }

  try {
    const user = await createUser(email, password, name || undefined)
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
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.redirect(buildUrl('/register?error=An+account+with+this+email+already+exists', request))
    }
    return NextResponse.redirect(buildUrl('/register?error=Registration+failed', request))
  }
}
