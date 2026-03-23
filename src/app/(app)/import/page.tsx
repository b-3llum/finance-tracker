'use client'

import { useState, useCallback, useRef } from 'react'
import { apiPost } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, X, File } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface ParsedCSV {
  headers: string[]
  rows: string[][]
  preview: string[][]
  filename: string
}

export default function ImportPage() {
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [mapping, setMapping] = useState<Record<string, number>>({ date: -1, amount: -1, description: -1, type: -1, category: -1 })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()

  const processFile = useCallback((file: File) => {
    setResult(null)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) { toast.error('File must have at least a header and one data row'); return }

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
  }, [toast])

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

  async function handleImport() {
    if (!parsed || mapping.date === -1 || mapping.amount === -1) {
      toast.error('Please map at least Date and Amount columns')
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

  const requiredMapped = mapping.date !== -1 && mapping.amount !== -1

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Import Transactions</h1>
        <p className="text-muted-foreground">Bulk import from bank statements</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${parsed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-primary text-primary-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
          Upload
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${parsed && !result ? 'bg-primary text-primary-foreground' : result ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
          Map & Review
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${result ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
          <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">3</span>
          Import
        </div>
      </div>

      {/* Upload Zone */}
      {!parsed ? (
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
              <p className="text-sm font-medium mb-1">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports CSV, TSV, and most bank export formats</p>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFile} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* File Info Bar */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 animate-count-up">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <File className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{parsed.filename}</p>
              <p className="text-xs text-muted-foreground">{parsed.rows.length} rows, {parsed.headers.length} columns</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setParsed(null); setResult(null) }}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Column Mapping */}
          <Card className="animate-count-up stagger-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Map Your Columns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  { field: 'date', label: 'Date', required: true },
                  { field: 'amount', label: 'Amount', required: true },
                  { field: 'description', label: 'Description', required: false },
                  { field: 'type', label: 'Type', required: false },
                  { field: 'category', label: 'Category', required: false },
                ] as const).map(({ field, label, required }) => (
                  <div key={field}>
                    <label className="text-sm font-medium flex items-center gap-1.5 mb-1.5">
                      {label}
                      {required ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Required</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Optional</span>
                      )}
                    </label>
                    <Select
                      value={mapping[field]?.toString() || '-1'}
                      onChange={e => setMapping(m => ({ ...m, [field]: parseInt(e.target.value) }))}
                    >
                      <option value="-1">-- Skip --</option>
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
              <CardTitle className="text-base">Preview</CardTitle>
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
                  Map at least Date and Amount to continue
                </p>
              )}
            </div>
            <Button onClick={handleImport} disabled={importing || !requiredMapped} size="lg" className="min-w-44">
              {importing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </span>
              ) : (
                `Import ${parsed.rows.length} Transactions`
              )}
            </Button>
          </div>
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
                <p className="font-semibold">Import Complete</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-sm text-emerald-600 font-medium">{result.imported} imported</span>
                  {result.skipped > 0 && <span className="text-sm text-muted-foreground">{result.skipped} skipped</span>}
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
