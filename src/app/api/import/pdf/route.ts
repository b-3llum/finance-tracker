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

// Build a minimal PNG buffer from raw pixel data (for tesseract.js input)
function buildPngBuffer(data: Uint8Array | Uint8ClampedArray, width: number, height: number, hasAlpha: boolean): Buffer {
  // Create a BMP (tesseract.js accepts BMP, PNG, JPEG)
  // We'll create a simple 24-bit BMP
  const rowSize = Math.ceil((width * 3) / 4) * 4 // rows padded to 4 bytes
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize
  const buf = Buffer.alloc(fileSize)

  // BMP header
  buf.write('BM', 0) // signature
  buf.writeUInt32LE(fileSize, 2) // file size
  buf.writeUInt32LE(54, 10) // pixel data offset
  // DIB header
  buf.writeUInt32LE(40, 14) // DIB header size
  buf.writeInt32LE(width, 18) // width
  buf.writeInt32LE(-height, 22) // negative = top-down
  buf.writeUInt16LE(1, 26) // color planes
  buf.writeUInt16LE(24, 28) // bits per pixel
  buf.writeUInt32LE(0, 30) // no compression
  buf.writeUInt32LE(pixelDataSize, 34) // pixel data size

  const channels = hasAlpha ? 4 : 3
  let offset = 54
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels
      const r = data[srcIdx] || 0
      const g = data[srcIdx + 1] || 0
      const b = data[srcIdx + 2] || 0
      buf[offset++] = b // BMP is BGR
      buf[offset++] = g
      buf[offset++] = r
    }
    // Pad row to 4-byte boundary
    while (offset % 4 !== 54 % 4 && (offset - 54) % rowSize !== 0) {
      buf[offset++] = 0
    }
    offset = 54 + (y + 1) * rowSize
  }

  return buf
}
const MIN_REGEX_ROWS = 3

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
}

// ── Date parsing ────────────────────────────────────────

// Detect year range from statement text (e.g., "December 24, 2025 through January 27, 2026")
function detectStatementYears(text: string): { startYear: number; endYear: number } {
  const currentYear = new Date().getFullYear()

  // Look for "Beginning [date] through [date]" or "Statement Period: [date] to [date]"
  const rangeMatch = text.match(
    /(?:beginning|from|period[:\s]*)\s*(?:\w+\s+\d{1,2},?\s+)?(\d{4})\s*(?:through|to|[-–])\s*(?:\w+\s+\d{1,2},?\s+)?(\d{4})/i
  )
  if (rangeMatch) {
    return { startYear: parseInt(rangeMatch[1]), endYear: parseInt(rangeMatch[2]) }
  }

  // Look for any 4-digit years in the first 500 chars
  const years = [...text.substring(0, 1000).matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]))
  if (years.length >= 2) {
    return { startYear: Math.min(...years), endYear: Math.max(...years) }
  }
  if (years.length === 1) {
    return { startYear: years[0], endYear: years[0] }
  }

  return { startYear: currentYear, endYear: currentYear }
}

function parseDate(raw: string, yearHint?: { startYear: number; endYear: number }): string | null {
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

  // MM/DD (no year) — common in bank statements like Citizens Bank
  const shortMdy = s.match(/^(\d{1,2})[\/](\d{1,2})$/)
  if (shortMdy && yearHint) {
    const m = parseInt(shortMdy[1], 10)
    const d = parseInt(shortMdy[2], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      // Use startYear for months >= 10 (Oct-Dec), endYear for months <= 6 (Jan-Jun)
      // This handles statements spanning year boundaries (e.g., Dec 2025 - Jan 2026)
      const year = m >= 10 ? yearHint.startYear : (yearHint.startYear === yearHint.endYear ? yearHint.startYear : yearHint.endYear)
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
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

function extractTransactionsWithRegex(text: string, sectionContext?: { inDebits: boolean; inCredits: boolean }, yearHint?: { startYear: number; endYear: number }): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const lines = text.split('\n')

  // Pattern 1: Date  Description  Amount (most common)
  const lineRe = new RegExp(
    `^\\s*(${DATE_PATTERN})\\s+(.+?)\\s+(${AMOUNT_PATTERN})\\s*$`,
    'i'
  )

  // Pattern 2: Date  Amount  Description (Citizens Bank, some others)
  // e.g., "12/24    3.10    0581 DBT PURCHASE - ..."
  const dateAmountDescRe = new RegExp(
    `^\\s*(\\d{1,2}[/]\\d{1,2})\\s+(\\d[\\d,]*\\.\\d{2})\\s+(.+?)\\s*$`,
    'i'
  )

  // Track section context for determining income vs expense
  let inDebitsSection = sectionContext?.inDebits ?? false
  let inCreditsSection = sectionContext?.inCredits ?? false

  for (const line of lines) {
    const lower = line.toLowerCase().trim()

    // Detect section headers
    if (lower.includes('withdrawals') || lower.includes('debits') || lower.includes('atm/purchases')) {
      inDebitsSection = true
      inCreditsSection = false
      continue
    }
    if (lower.includes('deposits') || lower.includes('credits') || lower.includes('electronic deposits')) {
      inCreditsSection = true
      inDebitsSection = false
      continue
    }

    // Skip headers/totals/noise
    if (
      lower.includes('opening balance') || lower.includes('closing balance') ||
      lower.includes('previous balance') || lower.includes('current balance') ||
      lower.includes('total withdrawals') || lower.includes('total deposits') ||
      lower.includes('balance calculation') || lower.includes('page ') ||
      lower === 'date' || lower === 'description' || lower === 'amount' ||
      lower.includes('statement period') || lower.includes('student checking') ||
      lower.includes('transaction details') || lower.includes('continued') ||
      lower.includes('member fdic') || lower.includes('please see additional')
    ) {
      continue
    }

    // Try Pattern 1: Date Description Amount
    let match = line.match(lineRe)
    if (match) {
      const parsedDate = parseDate(match[1], yearHint)
      if (!parsedDate) continue
      const parsedAmount = parseAmount(match[3])
      if (!parsedAmount) continue

      // Override type based on section context
      let type = parsedAmount.type
      if (inDebitsSection) type = 'expense'
      if (inCreditsSection) type = 'income'

      transactions.push({ date: parsedDate, description: match[2].trim(), amount: parsedAmount.value, type })
      continue
    }

    // Try Pattern 2: Date Amount Description (Citizens Bank style)
    const match2 = line.match(dateAmountDescRe)
    if (match2) {
      const parsedDate = parseDate(match2[1], yearHint)
      if (!parsedDate) continue
      const val = parseFloat(match2[2].replace(/,/g, ''))
      if (isNaN(val) || val === 0) continue

      let description = match2[3].trim()
      // Clean up Citizens Bank descriptions: strip "0581 DBT PURCHASE -", "0581 POS DEBIT -"
      description = description
        .replace(/^\d{4}\s+(DBT\s+PURCHASE|POS\s+DEBIT|DBT\s+PURCHASE|ATM\s+WITHDRAWAL)\s*[-–]\s*/i, '')
        .replace(/^\d{6}\s+/, '') // strip leading 6-digit codes
        .trim()

      // Determine type from section or description keywords
      let type: 'income' | 'expense' = 'expense'
      if (inCreditsSection) type = 'income'
      else if (inDebitsSection) type = 'expense'

      if (description.length > 2) {
        transactions.push({ date: parsedDate, description, amount: val, type })
      }
      continue
    }
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

  // Extract text from PDF — try text layer first, fall back to OCR
  let rawText: string = ''
  let usedOcr = false

  try {
    const { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync, rmSync } = await import('fs')
    const { join } = await import('path')
    const { execSync } = await import('child_process')
    const os = await import('os')

    // Save uploaded file to a temp location
    const tmpDir = join(os.tmpdir(), `fintrack-pdf-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
    const tmpPdf = join(tmpDir, 'input.pdf')
    const arrayBuf = await file.arrayBuffer()
    writeFileSync(tmpPdf, Buffer.from(arrayBuf))

    // Step A: Try pdfjs-dist text extraction (works for text-based PDFs)
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any
      const uint8 = new Uint8Array(arrayBuf)
      const doc = await pdfjsLib.getDocument({ data: uint8 }).promise

      const pageTexts: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        const text = content.items.map((item: any) => item.str).join(' ')
        pageTexts.push(text)
      }
      rawText = pageTexts.join('\n')
    } catch {
      // pdfjs-dist failed (worker issue, etc) — will try OCR below
    }

    // Step B: If text layer is empty/tiny, use pdftoppm + tesseract.js OCR
    if (rawText.replace(/\s/g, '').length < 50) {
      console.log('[PDF Import] Text layer empty — attempting OCR via pdftoppm + tesseract.js...')

      try {
        // Convert PDF pages to PNG images using pdftoppm (poppler-utils)
        execSync(`pdftoppm -png -r 300 "${tmpPdf}" "${join(tmpDir, 'page')}"`, { timeout: 60000 })

        const pngFiles = readdirSync(tmpDir)
          .filter(f => f.startsWith('page-') && f.endsWith('.png'))
          .sort()

        if (pngFiles.length > 0) {
          const Tesseract = await import('tesseract.js') as any
          const worker = await Tesseract.createWorker('eng')
          const ocrTexts: string[] = []

          for (const pngFile of pngFiles) {
            const pngPath = join(tmpDir, pngFile)
            const imgBuf = readFileSync(pngPath)
            const { data: { text } } = await worker.recognize(imgBuf)
            ocrTexts.push(text)
          }

          await worker.terminate()
          rawText = ocrTexts.join('\n')
          usedOcr = true
          console.log(`[PDF Import] OCR extracted ${rawText.length} chars from ${pngFiles.length} pages`)
        }
      } catch (ocrErr: any) {
        console.error('[PDF Import] OCR failed:', ocrErr.message)
        // pdftoppm might not be available — that's ok, we'll return an error below
      }
    }

    // Cleanup temp files
    try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to parse PDF: ${err.message || 'Unknown error'}. Ensure the file is a valid PDF.` },
      { status: 422 }
    )
  }

  if (!rawText || rawText.trim().length < 20) {
    return NextResponse.json(
      {
        error: 'Could not extract text from this PDF. If your statement is image-based, ensure poppler-utils (pdftoppm) is installed. Otherwise, try exporting as CSV from your bank\'s website.',
        rawText: '',
      },
      { status: 422 }
    )
  }

  // Detect year range from statement text
  const yearHint = detectStatementYears(rawText)
  console.log(`[PDF Import] Detected year range: ${yearHint.startYear}-${yearHint.endYear}`)

  // Step 1: Try regex extraction
  let transactions = extractTransactionsWithRegex(rawText, { inDebits: false, inCredits: false }, yearHint)
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

  return NextResponse.json({
    transactions,
    confidence: usedOcr ? Math.min(confidence, 0.7) : confidence, // OCR adds uncertainty
    rawText,
    usedAiFallback,
    usedOcr,
  })
}
