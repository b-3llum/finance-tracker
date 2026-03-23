import { NextResponse } from 'next/server'

export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status })
}

export function handleApiError(error: unknown, context: string) {
  console.error(`[${context}]`, error)
  return apiError('An internal error occurred', 500)
}

export function validateAmount(amount: unknown): { valid: boolean; value: number; error?: string } {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
  if (isNaN(num) || num <= 0) {
    return { valid: false, value: 0, error: 'Amount must be greater than 0' }
  }
  if (num > 999999999.99) {
    return { valid: false, value: 0, error: 'Amount exceeds maximum allowed' }
  }
  return { valid: true, value: Math.round(num * 100) / 100 }
}

export function validateDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export function validateDescription(desc: unknown): string | null {
  if (!desc) return null
  const s = String(desc).trim()
  if (s.length > 500) return s.substring(0, 500)
  return s
}
