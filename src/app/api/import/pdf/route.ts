import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { queryAI } from '@/lib/ai-client'

// ── Types ───────────────────────────────────────────────

interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

interface ImportResult {
  transactions: ParsedTransaction[]
  confidence: number
  rawText: string
  usedAiFallback: boolean
}

// ── Constants ───────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MIN_REGEX_ROWS = 3

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
}

// ── Date parsing ────────────────────────────────────────

function parseDate(raw: string): string | null {
  const s = raw.trim()

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return s

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) {
    const m = parseInt(mdy[1], 10)
    const d = parseInt(mdy[2], 10)
    // If first number > 12 it must be DD/MM/YYYY
    if (m > 12 && d <= 12) {
      return `${mdy[3]}-${mdy[2].padStart(2, '0')}-${mdy[1].padStart(2, '0')}`
    }
    return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  }

  // "Mar 15" or "Mar 15, 2026" or "15 Mar 2026" or "15 Mar"
  const namedMonth = s.match(
    /^(\d{1,2})\s+([A-Za-z]{3,9})(?:[,\s]+(\d{4}))?$|^([A-Za-z]{3,9})\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/
  )
  if (namedMonth) {
    let day: string, monthStr: string, year: string
    if (namedMonth[1]) {
      // "15 Mar 2026"
      day = namedMonth[1]
      monthStr = namedMonth[2]
      year = namedMonth[3] || String(new Date().getFullYear())
    } else {
      // "Mar 15, 2026"
      monthStr = namedMonth[4]
      day = namedMonth[5]
      year = namedMonth[6] || String(new Date().getFullYear())
    }
    const monthNum = MONTH_MAP[monthStr.toLowerCase().slice(0, 3)]
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`
    }
  }

  // Fallback to Date.parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return null
}

// ── Amount parsing ──────────────────────────────────────

interface ParsedAmount {
  value: number
  type: 'income' | 'expense'
}

function parseAmount(raw: string): ParsedAmount | null {
  const s = raw.trim()

  // Parenthesized amounts: (1,234.56) => expense
  const parenMatch = s.match(/^\([\$]?([\d,]+\.?\d*)\)$/)
  if (parenMatch) {
    const val = parseFloat(parenMatch[1].replace(/,/g, ''))
    if (!isNaN(val) && val !== 0) return { value: val, type: 'expense' }
  }

  // DR/CR suffix: 1,234.56 DR or 1234.56 CR
  const drCrMatch = s.match(/^[\$]?([\d,]+\.?\d*)\s*(DR|CR)$/i)
  if (drCrMatch) {
    const val = parseFloat(drCrMatch[1].replace(/,/g, ''))
    const indicator = drCrMatch[2].toUpperCase()
    if (!isNaN(val) && val !== 0) {
      return { value: val, type: indicator === 'DR' ? 'expense' : 'income' }
    }
  }

  // Negative prefix: -$50.00 or -50.00
  const negMatch = s.match(/^-\s*[\$]?([\d,]+\.?\d*)$/)
  if (negMatch) {
    const val = parseFloat(negMatch[1].replace(/,/g, ''))
    if (!isNaN(val) && val !== 0) return { value: val, type: 'expense' }
  }

  // Positive: $1,234.56 or +$50.00 or 1234.56
  const posMatch = s.match(/^\+?\s*[\$]?([\d,]+\.?\d*)$/)
  if (posMatch) {
    const val = parseFloat(posMatch[1].replace(/,/g, ''))
    if (!isNaN(val) && val !== 0) return { value: val, type: 'income' }
  }

  return null
}

// ── Regex-based extraction ──────────────────────────────

// Date patterns to look for at the start of a line
const DATE_PATTERN = [
  '\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}',                       // MM/DD/YYYY, DD/MM/YYYY
  '\\d{4}-\\d{2}-\\d{2}',                                         // YYYY-MM-DD
  '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2}(?:[,\\s]+\\d{4})?', // Mar 15, 2026
  '\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?(?:[,\\s]+\\d{4})?', // 15 Mar 2026
].join('|')

// Amount patterns to look for
const AMOUNT_PATTERN = [
  '-?\\$[\\d,]+\\.\\d{2}',                       // $1,234.56 or -$50.00
  '\\([\\$]?[\\d,]+\\.\\d{2}\\)',                // (1,234.56)
  '[\\d,]+\\.\\d{2}\\s*(?:DR|CR)',               // 1234.56 DR/CR
  '-?[\\d,]+\\.\\d{2}',                           // plain number with 2 decimal places
].join('|')

const TRANSACTION_LINE_RE = new RegExp(
  `^\\s*(${DATE_PATTERN})\\s+(.+?)\\s+(${AMOUNT_PATTERN})\\s*$`,
  'im'
)

function extractTransactionsWithRegex(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n')

  // Build a per-line regex (case-insensitive for month names)
  const lineRe = new RegExp(
    `^\\s*(${DATE_PATTERN})\\s+(.+?)\\s+(${AMOUNT_PATTERN})\\s*$`,
    'i'
  )

  for (const line of lines) {
    const match = line.match(lineRe)
    if (!match) continue

    const dateStr = match[1]
    const description = match[2].trim()
    const amountStr = match[3]

    const parsedDate = parseDate(dateStr)
    if (!parsedDate) continue

    const parsedAmount = parseAmount(amountStr)
    if (!parsedAmount) continue

    // Skip lines that look like headers or totals
    const lowerDesc = description.toLowerCase()
    if (
      lowerDesc.includes('opening balance') ||
      lowerDesc.includes('closing balance') ||
      lowerDesc.includes('total') ||
      lowerDesc === 'date' ||
      lowerDesc === 'description'
    ) {
      continue
    }

    transactions.push({
      date: parsedDate,
      description,
      amount: parsedAmount.value,
      type: parsedAmount.type,
    })
  }

  return transactions
}

// ── AI fallback parser ──────────────────────────────────

async function extractTransactionsWithAI(
  rawText: string,
  userId: number
): Promise<ParsedTransaction[]> {
  const systemPrompt = `You are a bank statement parser. Given raw text extracted from a PDF bank statement, identify all financial transactions and return them as a JSON array. Each transaction must have: date (YYYY-MM-DD), description (string), amount (positive number), type ("income" or "expense"). Return ONLY valid JSON, no markdown fences, no commentary.`

  // Truncate to avoid blowing up context
  const truncated = rawText.slice(0, 8000)

  const prompt = `Parse the following bank statement text and extract all transactions as a JSON array.

Rules:
- date must be in YYYY-MM-DD format
- amount must be a positive number (no currency symbols)
- type must be "income" for credits/deposits or "expense" for debits/withdrawals/charges
- Skip headers, totals, and balance lines
- If a year is missing from a date, assume the current year (${new Date().getFullYear()})

Bank statement text:
${truncated}`

  const response = await queryAI(prompt, systemPrompt, userId)

  // Extract JSON from the response (handle potential markdown fences)
  const jsonMatch = response.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (t: any) =>
          t.date &&
          t.description &&
          typeof t.amount === 'number' &&
          t.amount > 0 &&
          (t.type === 'income' || t.type === 'expense')
      )
      .map((t: any) => ({
        date: String(t.date),
        description: String(t.description).trim(),
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
      }))
  } catch {
    return []
  }
}

// ── Confidence scoring ──────────────────────────────────

function computeConfidence(transactions: ParsedTransaction[], usedFallback: boolean): number {
  if (transactions.length === 0) return 0

  let score = 0.5

  // More transactions = higher confidence (up to +0.3)
  score += Math.min(transactions.length / 30, 0.3)

  // Check date consistency (all dates parse and are reasonable)
  const validDates = transactions.filter((t) => {
    const d = new Date(t.date)
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2030
  })
  score += (validDates.length / transactions.length) * 0.1

  // Check that amounts are reasonable (not astronomical)
  const reasonableAmounts = transactions.filter((t) => t.amount > 0 && t.amount < 1_000_000)
  score += (reasonableAmounts.length / transactions.length) * 0.1

  // Penalty for AI fallback
  if (usedFallback) score -= 0.15

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100))
}

// ── Route handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  let userId: number
  try {
    userId = getUserId(request)
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request. Expected multipart form data with a PDF file.' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file provided. Send a PDF file in the "file" form field.' },
      { status: 400 }
    )
  }

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: `Invalid file type "${file.type || file.name}". Only PDF files are accepted.` },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.` },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: 'The uploaded file is empty.' },
      { status: 400 }
    )
  }

  // Extract text from PDF
  let rawText: string
  try {
    const pdfModule = await import('pdf-parse') as any
    const pdfParse = pdfModule.default ?? pdfModule
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await pdfParse(buffer)
    rawText = pdfData.text
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to parse PDF: ${err.message || 'Unknown error'}. Ensure the file is a valid PDF.` },
      { status: 422 }
    )
  }

  if (!rawText || rawText.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'No text could be extracted from the PDF. The file may be image-based (scanned). Try an OCR tool first.',
        rawText: '',
      },
      { status: 422 }
    )
  }

  // Step 1: Try regex extraction
  let transactions = extractTransactionsWithRegex(rawText)
  let usedAiFallback = false

  // Step 2: If regex finds too few rows, try AI fallback
  if (transactions.length < MIN_REGEX_ROWS) {
    try {
      const aiTransactions = await extractTransactionsWithAI(rawText, userId)
      if (aiTransactions.length > 0) {
        transactions = aiTransactions
        usedAiFallback = true
      }
    } catch (err: any) {
      // AI fallback failed — continue with whatever regex found
      // We still return what we have, the confidence will reflect the quality
      console.error('[PDF Import] AI fallback failed:', err.message)
    }
  }

  const confidence = computeConfidence(transactions, usedAiFallback)

  const result: ImportResult = {
    transactions,
    confidence,
    rawText,
    usedAiFallback,
  }

  return NextResponse.json(result)
}
