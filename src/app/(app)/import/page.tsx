'use client'

import { useState, useCallback, useRef } from 'react'
import { apiPost } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, ArrowRight, X, File } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useTranslations } from '@/lib/i18n'

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  preview: string[][]
  filename: string
}

interface PdfTransaction {
  date: string
  description: string
  amount: string | number
  type: string
}

interface PdfExtractionResult {
  transactions: PdfTransaction[]
  confidence: number
  rawText: string
  usedAiFallback: boolean
}

export default function ImportPage() {
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<string, number>>({ date: -1, amount: -1, description: -1, type: -1, category: -1 })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // PDF-specific state
  const [pdfExtracting, setPdfExtracting] = useState(false)
  const [pdfResult, setPdfResult] = useState<PdfExtractionResult | null>(null)
  const [pdfFilename, setPdfFilename] = useState<string>('')
  const [pdfEdits, setPdfEdits] = useState<PdfTransaction[]>([])
  const [pdfError, setPdfError] = useState<string | null>(null)

  const { toast } = useToast()
  const { t } = useTranslations('import')

  const isPdfFlow = pdfResult !== null || pdfExtracting || pdfError !== null

  const resetAll = useCallback(() => {
    setParsed(null)
    setResult(null)
    setPdfResult(null)
    setPdfFilename('')
    setPdfEdits([])
    setPdfError(null)
    setPdfExtracting(false)
  }, [])

  const processCsvFile = useCallback((file: File) => {
    setResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { toast.error(t('csvMinRows', 'File must have at least a header and one data row')); return }

      const delimiter = lines[0].includes('\t') ? '\t' : ','
      const parseRow = (line: string) => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes }
          else if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = '' }
          else { current += ch }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseRow(lines[0])
      const rows = lines.slice(1).map(parseRow)
      const preview = rows.slice(0, 5)

      // Auto-detect column mapping
      const autoMap: Record<string, number> = { date: -1, amount: -1, description: -1, type: -1, category: -1 }
      headers.forEach((h, i) => {
        const lower = h.toLowerCase()
        if (lower.includes('date') && autoMap.date === -1) autoMap.date = i
        if ((lower.includes('amount') || lower.includes('sum') || lower.includes('total')) && autoMap.amount === -1) autoMap.amount = i
        if ((lower.includes('desc') || lower.includes('memo') || lower.includes('note') || lower.includes('payee')) && autoMap.description === -1) autoMap.description = i
        if ((lower.includes('type') || lower.includes('credit') || lower.includes('debit')) && autoMap.type === -1) autoMap.type = i
        if (lower.includes('categ') && autoMap.category === -1) autoMap.category = i
      })

      setMapping(autoMap)
      setParsed({ headers, rows, preview, filename: file.name })
    }
    reader.readAsText(file)
  }, [toast, t])

  const processPdfFile = useCallback(async (file: File) => {
    setPdfExtracting(true)
    setPdfFilename(file.name)
    setPdfError(null)
    setPdfResult(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/pdf', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(t('pdfUploadFailed', 'Failed to process PDF'))

      const data: PdfExtractionResult = await res.json()

      if (!data.transactions || data.transactions.length < 3) {
        setPdfError(t('pdfParseFailed', "Could not parse this PDF format. Try exporting as CSV from your bank's website."))
        return
      }

      setPdfResult(data)
      setPdfEdits([...data.transactions])
    } catch (e: any) {
      setPdfError(e.message || t('pdfUnknownError', 'An error occurred while processing the PDF'))
    } finally {
      setPdfExtracting(false)
    }
  }, [t])

  const processFile = useCallback((file: File) => {
    resetAll()
    if (file.name.toLowerCase().endsWith('.pdf')) {
      processPdfFile(file)
    } else {
      processCsvFile(file)
    }
  }, [resetAll, processCsvFile, processPdfFile])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const updatePdfRow = useCallback((index: number, field: keyof PdfTransaction, value: string) => {
    setPdfEdits(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const deletePdfRow = useCallback((index: number) => {
    setPdfEdits(prev => prev.filter((_, i) => i !== index))
  }, [])

  async function handleImport() {
    if (!parsed || mapping.date === -1 || mapping.amount === -1) {
      toast.error(t('mapRequired', 'Please map at least Date and Amount columns'))
      return
    }
    setImporting(true)
    try {
      const res = await apiPost<{ imported: number; skipped: number; errors: string[] }>('/api/import', {
        rows: parsed.rows, mapping,
      })
      setResult(res)
      toast.success(`Imported ${res.imported} transactions`)
    } catch (e: any) { toast.error(e.message) }
    finally { setImporting(false) }
  }

  async function handlePdfImport() {
    if (pdfEdits.length === 0) {
      toast.error(t('noTransactions', 'No transactions to import'))
      return
    }
    setImporting(true)
    try {
      // Convert PDF transactions into rows + pre-built mapping for the existing import endpoint
      const headers = ['date', 'description', 'amount', 'type']
      const rows = pdfEdits.map(tx => [
        String(tx.date),
        String(tx.description),
        String(tx.amount),
        String(tx.type),
      ])
      const preMapping = { date: 0, amount: 2, description: 1, type: 3, category: -1 }

      const res = await apiPost<{ imported: number; skipped: number; errors: string[] }>('/api/import', {
        rows, mapping: preMapping,
      })
      setResult(res)
      toast.success(`Imported ${res.imported} transactions`)
    } catch (e: any) { toast.error(e.message) }
    finally { setImporting(false) }
  }

  const requiredMapped = mapping.date !== -1 && mapping.amount !== -1
  const hasFile = parsed !== null || isPdfFlow

  const confidenceBadgeColor = (confidence: number) => {
    if (confidence > 0.7) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (confidence >= 0.4) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  // Determine active step
  const activeStep = !hasFile ? 1 : result ? 3 : 2

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">{t('title', 'Import Transactions')}</h1>
        <p className="text-muted-foreground">{t('subtitle', 'Bulk import from bank statements')}</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${activeStep > 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-primary text-primary-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
          {t('stepUpload', 'Upload')}
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${activeStep === 2 ? 'bg-primary text-primary-foreground' : activeStep > 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
          {isPdfFlow ? t('stepPreview', 'Preview & Edit') : t('stepMap', 'Map & Review')}
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${activeStep === 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">3</span>
          {t('stepImport', 'Import')}
        </div>
      </div>

      {/* Upload Zone */}
      {!hasFile ? (
        <Card className="animate-scale-in">
          <CardContent className="p-2">
            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border hover:border-primary/50 hover:bg-accent/30'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-primary/10' : 'bg-muted'}`}>
                <Upload className={`h-7 w-7 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <p className="text-sm font-medium mb-1">{t('dropPrompt', 'Drop your file here or click to browse')}</p>
              <p className="text-xs text-muted-foreground">{t('dropHint', 'Supports CSV, TSV, and PDF bank statements')}</p>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.pdf" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ====== PDF Extraction Loading State ====== */}
          {pdfExtracting && (
            <Card className="animate-scale-in">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t('pdfExtracting', 'Extracting transactions from PDF...')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pdfFilename}</p>
                </div>
                <div className="h-1 w-48 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/2 rounded-full bg-primary animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ====== PDF Error State ====== */}
          {pdfError && (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 animate-count-up">
                <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pdfFilename}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetAll}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Card className="animate-scale-in ring-2 ring-red-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t('pdfErrorTitle', 'PDF Extraction Failed')}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{pdfError}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ====== PDF Success Flow ====== */}
          {pdfResult && !result && (
            <>
              {/* File Info Bar */}
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 animate-count-up">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pdfFilename}</p>
                  <p className="text-xs text-muted-foreground">{pdfEdits.length} {t('transactionsExtracted', 'transactions extracted')}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetAll}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Extraction Info Card - Glassmorphism */}
              <Card className="animate-count-up stagger-1 backdrop-blur-md bg-white/60 dark:bg-white/5 border-white/20 dark:border-white/10 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">{t('extractionComplete', 'Extraction complete')}</span>
                      <Badge className={`text-xs ${confidenceBadgeColor(pdfResult.confidence)}`}>
                        {t('confidence', 'Confidence')}: {Math.round(pdfResult.confidence * 100)}%
                      </Badge>
                    </div>
                    {pdfResult.usedAiFallback && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        {t('aiFallback', 'Used AI-assisted extraction. Please verify results.')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* PDF Preview Table */}
              <Card className="animate-count-up stagger-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('previewEdit', 'Preview & Edit')}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">{t('colDate', 'Date')}</th>
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">{t('colDescription', 'Description')}</th>
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">{t('colAmount', 'Amount')}</th>
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs">{t('colType', 'Type')}</th>
                        <th className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pdfEdits.map((tx, ri) => (
                        <tr key={ri} className="border-b border-border/30 hover:bg-accent/30 transition-colors group">
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={tx.date}
                              onChange={e => updatePdfRow(ri, 'date', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={tx.description}
                              onChange={e => updatePdfRow(ri, 'description', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={String(tx.amount)}
                              onChange={e => updatePdfRow(ri, 'amount', e.target.value)}
                              className="w-28 bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs text-right tabular-nums"
                            />
                          </td>
                          <td className="py-1.5 px-3">
                            <input
                              type="text"
                              value={tx.type}
                              onChange={e => updatePdfRow(ri, 'type', e.target.value)}
                              className="w-20 bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deletePdfRow(ri)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* PDF Import Action */}
              <div className="flex items-center justify-between gap-4 animate-count-up stagger-3">
                <div>
                  {pdfEdits.length === 0 && (
                    <p className="text-sm text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('noRows', 'No transactions to import')}
                    </p>
                  )}
                </div>
                <Button onClick={handlePdfImport} disabled={importing || pdfEdits.length === 0} size="lg" className="min-w-44">
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('importing', 'Importing...')}
                    </span>
                  ) : (
                    `Import ${pdfEdits.length} Transactions`
                  )}
                </Button>
              </div>
            </>
          )}

          {/* ====== CSV Flow (original) ====== */}
          {parsed && !result && (
            <>
              {/* File Info Bar */}
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 animate-count-up">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <File className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{parsed.filename}</p>
                  <p className="text-xs text-muted-foreground">{parsed.rows.length} {t('rowsColumns', 'rows')}, {parsed.headers.length} {t('columns', 'columns')}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={resetAll}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Mapping */}
              <Card className="animate-count-up stagger-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> {t('mapColumns', 'Map Your Columns')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {([
                      { field: 'date', label: t('fieldDate', 'Date'), required: true },
                      { field: 'amount', label: t('fieldAmount', 'Amount'), required: true },
                      { field: 'description', label: t('fieldDescription', 'Description'), required: false },
                      { field: 'type', label: t('fieldType', 'Type'), required: false },
                      { field: 'category', label: t('fieldCategory', 'Category'), required: false },
                    ] as const).map(({ field, label, required }) => (
                      <div key={field}>
                        <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                          {label}
                          {required ? (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('required', 'Required')}</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{t('optional', 'Optional')}</span>
                          )}
                        </label>
                        <Select
                          value={mapping[field]?.toString() || '-1'}
                          onChange={e => setMapping(m => ({ ...m, [field]: parseInt(e.target.value) }))}
                        >
                          <option value="-1">-- {t('skip', 'Skip')} --</option>
                          {parsed.headers.map((h, i) => (
                            <option key={i} value={i}>{h}</option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preview Table */}
              <Card className="animate-count-up stagger-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('preview', 'Preview')}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {parsed.headers.map((h, i) => {
                          const mappedTo = Object.entries(mapping).find(([, v]) => v === i)?.[0]
                          return (
                            <th key={i} className="text-left py-2.5 px-4 text-muted-foreground font-medium text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {h}
                                {mappedTo && (
                                  <Badge variant={mappedTo === 'date' || mappedTo === 'amount' ? 'default' : 'secondary'} className="text-[9px] py-0 px-1.5 capitalize">
                                    {mappedTo}
                                  </Badge>
                                )}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.preview.map((row, ri) => (
                        <tr key={ri} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                          {row.map((cell, ci) => (
                            <td key={ci} className="py-2 px-4 max-w-52 truncate text-xs">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 5 && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      ...and {parsed.rows.length - 5} more rows
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Import Action */}
              <div className="flex items-center justify-between gap-4 animate-count-up stagger-3">
                <div>
                  {!requiredMapped && (
                    <p className="text-sm text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('mapHint', 'Map at least Date and Amount to continue')}
                    </p>
                  )}
                </div>
                <Button onClick={handleImport} disabled={importing || !requiredMapped} size="lg" className="min-w-44">
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('importing', 'Importing...')}
                    </span>
                  ) : (
                    `Import ${parsed.rows.length} Transactions`
                  )}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* Results */}
      {result && (
        <Card className={`animate-scale-in ${result.errors.length === 0 ? 'ring-2 ring-emerald-500/20' : 'ring-2 ring-amber-500/20'}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              {result.errors.length === 0 ? (
                <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                </div>
              )}
              <div>
                <p className="font-semibold">{t('importComplete', 'Import Complete')}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm text-emerald-600 font-medium">{result.imported} {t('imported', 'imported')}</span>
                  {result.skipped > 0 && <span className="text-sm text-muted-foreground">{result.skipped} {t('skipped', 'skipped')}</span>}
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 p-3 space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
