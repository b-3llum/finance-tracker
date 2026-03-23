'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export function useApi<T>(url: string, options?: { skip?: boolean }) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' })
      if (res.status === 401) {
        localStorage.removeItem('auth_token')
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url, router])

  useEffect(() => {
    if (!options?.skip) fetchData()
  }, [fetchData, options?.skip])

  return { data, loading, error, refetch: fetchData }
}

function checkUnauthorized(res: Response) {
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
    throw new Error('Unauthorized')
  }
}

export async function apiPost<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  checkUnauthorized(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiPut<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
    credentials: 'include',
  })
  checkUnauthorized(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
  checkUnauthorized(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
}
