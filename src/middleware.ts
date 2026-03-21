import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/']
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/sw.js', '/manifest.json', '/icons/']

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (secret) return new TextEncoder().encode(secret)
  return new TextEncoder().encode('dev-secret-do-not-use-in-production-000')
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
  }
}

function addCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value)
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders() })
  }

  // Allow static assets
  for (const prefix of STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next()
  }

  // Allow public paths
  for (const path of PUBLIC_PATHS) {
    if (pathname.startsWith(path)) {
      const response = NextResponse.next()
      return addCors(response)
    }
  }

  // Check auth — accept token from Cookie OR Authorization header
  let token = request.cookies.get('auth_token')?.value
  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }
  }

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return addCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (!payload.sub) throw new Error('Invalid token')

    // Pass userId to API routes via header
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.sub)

    // For API routes, clone the request with the header
    if (pathname.startsWith('/api/')) {
      const headers = new Headers(request.headers)
      headers.set('x-user-id', payload.sub)
      return addCors(NextResponse.next({ request: { headers } }))
    }

    return addCors(response)
  } catch {
    if (pathname.startsWith('/api/')) {
      return addCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    // Clear invalid cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
