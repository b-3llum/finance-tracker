'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  name: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | null>
  register: (email: string, password: string, name?: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  register: async () => null,
  logout: async () => {},
})

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  if (token) return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  return { 'Content-Type': 'application/json' }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Hard navigate to ensure cookies are sent on the full page request
  const navigate = useCallback((path: string) => {
    window.location.href = path
  }, [])

  useEffect(() => {
    fetch('/api/auth/me', { headers: authHeaders(), credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) return data.error || 'Login failed'
    // Store token in localStorage for iOS Safari / PWA where cookies may not persist
    if (data.token) localStorage.setItem('auth_token', data.token)
    setUser(data.user)
    navigate('/dashboard')
    return null
  }, [navigate])

  const register = useCallback(async (email: string, password: string, name?: string): Promise<string | null> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) return data.error || 'Registration failed'
    if (data.token) localStorage.setItem('auth_token', data.token)
    setUser(data.user)
    navigate('/dashboard')
    return null
  }, [navigate])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders(), credentials: 'include' })
    localStorage.removeItem('auth_token')
    setUser(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
