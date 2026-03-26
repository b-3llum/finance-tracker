'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wallet, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      if (data.token) localStorage.setItem('auth_token', data.token)
      window.location.href = '/dashboard'
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const inputClass = "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 transition-colors duration-150"

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">FinTrack</h1>
          <p className="text-sm text-muted-foreground">Personal Finance</p>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start tracking your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="#" method="POST" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-3 animate-fade-in">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                placeholder="Your name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                name="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full" disabled={loading}>
              {loading ? 'Creating account...' : <><UserPlus className="h-4 w-4" /> Create Account</>}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
