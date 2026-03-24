'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useApi, apiPost, apiPut, apiDelete } from '@/hooks/use-api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getToday } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n'
import {
  Plus, Trash2, ArrowUpRight, ArrowDownRight, Filter,
  Search, Check, X, ChevronDown, Scissors, Tag, CheckSquare, Square,
  Minus,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { Category, TransactionWithCategory } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SplitRow {
  category_id: string
  amount: string
}

interface EditingCell {
  txId: number
  field: 'description' | 'amount' | 'category_id'
}

// ---------------------------------------------------------------------------
// Inline editable cell
// ---------------------------------------------------------------------------

function InlineEditCell({
  value,
  onSave,
  type = 'text',
  className = '',
  selectOptions,
  renderDisplay,
}: {
  value: string
  onSave: (val: string) => void
  type?: 'text' | 'number' | 'select'
  className?: string
  selectOptions?: { value: string; label: string }[]
  renderDisplay?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(value)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`text-left cursor-pointer rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-accent/60 transition-colors ${className}`}
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        {renderDisplay ?? (value || <span className="text-muted-foreground italic">--</span>)}
      </button>
    )
  }

  if (type === 'select' && selectOptions) {
    return (
      <Select
        ref={inputRef as React.Ref<HTMLSelectElement>}
        value={draft}
        onChange={e => { setDraft(e.target.value); }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter') commit() }}
        className="h-8 text-xs w-full min-w-[120px]"
      >
        <option value="">--</option>
        {selectOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    )
  }

  return (
    <Input
      ref={inputRef as React.Ref<HTMLInputElement>}
      type={type}
      step={type === 'number' ? '0.01' : undefined}
      min={type === 'number' ? '0.01' : undefined}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
      className="h-8 text-xs w-full"
    />
  )
}

// ---------------------------------------------------------------------------
// Split Transaction Dialog
// ---------------------------------------------------------------------------

function SplitDialog({
  open,
  tx,
  categories,
  sym,
  t,
  onClose,
  onSplit,
}: {
  open: boolean
  tx: TransactionWithCategory | null
  categories: Category[]
  sym: string
  t: (key: string, params?: Record<string, string | number>) => string
  onClose: () => void
  onSplit: (txId: number, rows: SplitRow[]) => Promise<void>
}) {
  const [rows, setRows] = useState<SplitRow[]>([
    { category_id: '', amount: '' },
    { category_id: '', amount: '' },
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && tx) {
      setRows([
        { category_id: String(tx.category_id ?? ''), amount: '' },
        { category_id: '', amount: '' },
      ])
    }
  }, [open, tx])

  if (!tx) return null

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const remaining = tx.amount - total
  const isValid = rows.every(r => r.amount && parseFloat(r.amount) > 0) && Math.abs(remaining) < 0.01

  const updateRow = (i: number, field: keyof SplitRow, val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const addRow = () => setRows(prev => [...prev, { category_id: '', amount: '' }])

  const removeRow = (i: number) => {
    if (rows.length <= 2) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  const filteredCats = categories.filter(c => c.type === tx.type)

  async function handleSplit() {
    if (!isValid || !tx) return
    setSaving(true)
    try {
      await onSplit(tx.id, rows)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle>{t('splitTransaction')}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('originalAmount')}</span>
            <span className="font-semibold">{formatCurrency(tx.amount, sym)}</span>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={row.category_id}
                  onChange={e => updateRow(i, 'category_id', e.target.value)}
                  className="h-9 text-sm flex-1"
                >
                  <option value="">{t('category')}</option>
                  {filteredCats.map(c => (
                    <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={row.amount}
                  onChange={e => updateRow(i, 'amount', e.target.value)}
                  className="h-9 text-sm w-28"
                />
                {rows.length > 2 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeRow(i)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-3 w-3 mr-1" /> {t('addSplitRow')}
          </Button>

          <div className={`flex items-center justify-between text-sm font-medium ${Math.abs(remaining) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
            <span>{t('remaining')}</span>
            <span>{formatCurrency(remaining, sym)}</span>
          </div>

          <Button onClick={handleSplit} disabled={!isValid || saving} className="w-full">
            {saving ? t('splitting') : t('splitTransaction')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TransactionsPage() {
  const { t } = useTranslations('transactions')

  // Data state
  const [showAdd, setShowAdd] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 50

  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')

  // Split dialog
  const [splitTx, setSplitTx] = useState<TransactionWithCategory | null>(null)

  // Build API query
  const filterParams = useMemo(() => {
    const p = new URLSearchParams()
    if (typeFilter) p.set('type', typeFilter)
    if (categoryFilter) p.set('category', categoryFilter)
    if (dateFrom) p.set('from', dateFrom)
    if (dateTo) p.set('to', dateTo)
    p.set('limit', String(PAGE_SIZE))
    p.set('offset', String(offset))
    return p.toString()
  }, [typeFilter, categoryFilter, dateFrom, dateTo, offset])

  const { data: txData, loading, refetch } = useApi<{ transactions: TransactionWithCategory[]; total: number }>(
    `/api/transactions?${filterParams}`
  )
  const { data: categories } = useApi<Category[]>('/api/categories')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')

  const { toast } = useToast()
  const sym = settings?.currency_symbol || '$'

  // Client-side smart search
  const transactions = useMemo(() => {
    if (!txData?.transactions) return []
    if (!searchQuery.trim()) return txData.transactions

    const q = searchQuery.toLowerCase().trim()

    // Parse smart search tokens
    let amountMin: number | null = null
    let amountMax: number | null = null
    let textTokens: string[] = []

    const tokens = q.split(/\s+/)
    for (const token of tokens) {
      const gtMatch = token.match(/^>(\d+\.?\d*)$/)
      const ltMatch = token.match(/^<(\d+\.?\d*)$/)
      if (gtMatch) {
        amountMin = parseFloat(gtMatch[1])
      } else if (ltMatch) {
        amountMax = parseFloat(ltMatch[1])
      } else {
        textTokens.push(token)
      }
    }

    return txData.transactions.filter(tx => {
      if (amountMin !== null && tx.amount < amountMin) return false
      if (amountMax !== null && tx.amount > amountMax) return false
      if (textTokens.length > 0) {
        const haystack = [tx.description, tx.category_name].filter(Boolean).join(' ').toLowerCase()
        return textTokens.every(tok => haystack.includes(tok))
      }
      return true
    })
  }, [txData, searchQuery])

  // Pagination helpers
  const totalPages = txData ? Math.ceil(txData.total / PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  // ---------------------------------------------------------------------------
  // Add Transaction form
  // ---------------------------------------------------------------------------
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category_id: '',
    amount: '',
    description: '',
    date: getToday(),
    recurring: false,
    recurring_interval: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const filteredFormCategories = categories?.filter(c => c.type === form.type) || []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || !form.date) return
    setSubmitting(true)
    try {
      await apiPost('/api/transactions', {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      })
      setForm({ type: 'expense', category_id: '', amount: '', description: '', date: getToday(), recurring: false, recurring_interval: '' })
      setShowAdd(false)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Inline edit
  // ---------------------------------------------------------------------------
  const handleInlineEdit = useCallback(async (tx: TransactionWithCategory, field: string, value: string) => {
    try {
      const body: Record<string, any> = {}
      if (field === 'description') body.description = value
      if (field === 'amount') body.amount = parseFloat(value)
      if (field === 'category_id') body.category_id = value ? parseInt(value) : null
      await apiPut(`/api/transactions/${tx.id}`, body)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [refetch, toast])

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete(id: number) {
    if (!confirm(t('deleteConfirm'))) return
    try {
      await apiDelete(`/api/transactions/${id}`)
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map(tx => tx.id)))
    }
  }

  async function handleBulkDelete() {
    if (!confirm(t('bulkDeleteConfirm', { count: selected.size }))) return
    try {
      await Promise.all([...selected].map(id => apiDelete(`/api/transactions/${id}`)))
      setSelected(new Set())
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleBulkCategorize() {
    if (!bulkCategory) return
    try {
      await Promise.all(
        [...selected].map(id =>
          apiPost('/api/categorize', { transaction_id: id, category_id: parseInt(bulkCategory) })
        )
      )
      setBulkCategory('')
      setSelected(new Set())
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ---------------------------------------------------------------------------
  // Split transaction
  // ---------------------------------------------------------------------------
  async function handleSplit(txId: number, rows: SplitRow[]) {
    const tx = transactions.find(t => t.id === txId)
    if (!tx) return
    try {
      // Create new transactions for each split row
      await Promise.all(
        rows.map(row =>
          apiPost('/api/transactions', {
            type: tx.type,
            amount: parseFloat(row.amount),
            category_id: row.category_id ? parseInt(row.category_id) : null,
            description: tx.description,
            date: tx.date,
            recurring: false,
            recurring_interval: '',
          })
        )
      )
      // Delete the original
      await apiDelete(`/api/transactions/${txId}`)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ---------------------------------------------------------------------------
  // Category helpers
  // ---------------------------------------------------------------------------
  const categoryOptions = useMemo(() =>
    (categories || []).map(c => ({
      value: String(c.id),
      label: `${c.icon ?? ''} ${c.name}`.trim(),
    })),
    [categories]
  )

  const categoryMap = useMemo(() => {
    const m = new Map<number, Category>()
    categories?.forEach(c => m.set(c.id, c))
    return m
  }, [categories])

  function renderCategoryBadge(tx: TransactionWithCategory) {
    const cat = tx.category_id ? categoryMap.get(tx.category_id) : null
    if (!cat && !tx.category_name) return <span className="text-muted-foreground text-xs italic">--</span>
    return (
      <Badge variant="secondary" className="text-xs py-0 gap-1">
        {(cat?.icon || tx.category_icon) && (
          <span className="mr-0.5">{cat?.icon || tx.category_icon}</span>
        )}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: cat?.color || tx.category_color || '#94a3b8' }}
        />
        {cat?.name || tx.category_name}
      </Badge>
    )
  }

  // ---------------------------------------------------------------------------
  // Clear filters
  // ---------------------------------------------------------------------------
  const hasFilters = typeFilter || categoryFilter || dateFrom || dateTo || searchQuery
  const clearFilters = () => {
    setTypeFilter('')
    setCategoryFilter('')
    setDateFrom('')
    setDateTo('')
    setSearchQuery('')
    setOffset(0)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')} {txData && <span className="text-xs">({txData.total} {t('total')})</span>}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t('addTransaction')}
        </Button>
      </div>

      {/* Smart search + Filters */}
      <Card className="backdrop-blur-md bg-card/80 border-border/50">
        <CardContent className="p-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('searchHint')}
              className="pl-9 h-11"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground shrink-0">{t('filters')}</span>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={clearFilters}>
                {t('clearFilters')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setOffset(0) }}>
              <option value="">{t('allTypes')}</option>
              <option value="income">{t('income')}</option>
              <option value="expense">{t('expense')}</option>
            </Select>
            <Select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setOffset(0) }}>
              <option value="">{t('allCategories')}</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>
              ))}
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setOffset(0) }} placeholder={t('dateFrom')} />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setOffset(0) }} placeholder={t('dateTo')} />
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card className="backdrop-blur-md bg-primary/5 border-primary/20 animate-fade-in">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" className="text-sm">
                {t('selectedCount', { count: selected.size })}
              </Badge>

              <div className="flex items-center gap-2 ml-auto">
                {/* Bulk categorize */}
                <Select
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                  className="h-9 text-sm w-40"
                >
                  <option value="">{t('categorize')}</option>
                  {categories?.map(c => (
                    <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkCategorize}
                  disabled={!bulkCategory}
                >
                  <Tag className="h-3 w-3 mr-1" /> {t('apply')}
                </Button>

                {/* Bulk delete */}
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> {t('delete')}
                </Button>

                {/* Deselect */}
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction table */}
      <Card className="backdrop-blur-md bg-card/80 border-border/50">
        <CardContent className="p-0">
          {loading && !txData ? (
            <div className="p-4">
              <TableSkeleton rows={8} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">{t('noTransactions')}</p>
              {!hasFilters && (
                <Button variant="outline" className="mt-4" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> {t('addTransaction')}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[40px_1fr_140px_120px_100px_80px] gap-2 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                <button type="button" onClick={toggleSelectAll} className="flex items-center justify-center">
                  {selected.size === transactions.length && transactions.length > 0
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />
                  }
                </button>
                <span>{t('description')}</span>
                <span>{t('category')}</span>
                <span className="text-right">{t('amount')}</span>
                <span>{t('date')}</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-[40px_1fr_140px_120px_100px_80px] gap-2 px-4 py-3 items-center hover:bg-accent/40 transition-colors group ${
                      selected.has(tx.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button type="button" onClick={() => toggleSelect(tx.id)} className="flex items-center justify-center">
                      {selected.has(tx.id)
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>

                    {/* Description (inline editable) */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {tx.type === 'income'
                          ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                          : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <InlineEditCell
                          value={tx.description || ''}
                          onSave={val => handleInlineEdit(tx, 'description', val)}
                          className="text-sm font-medium truncate block"
                          renderDisplay={
                            <span className="truncate block text-sm font-medium">
                              {tx.description || tx.category_name || t('uncategorized')}
                              {tx.recurring === 1 && (
                                <Badge variant="outline" className="text-[10px] py-0 ml-1.5 align-middle">{t('recurring')}</Badge>
                              )}
                            </span>
                          }
                        />
                      </div>
                    </div>

                    {/* Category (inline editable) */}
                    <InlineEditCell
                      value={String(tx.category_id ?? '')}
                      onSave={val => handleInlineEdit(tx, 'category_id', val)}
                      type="select"
                      selectOptions={categoryOptions.filter(o => {
                        const cat = categoryMap.get(parseInt(o.value))
                        return !cat || cat.type === tx.type
                      })}
                      renderDisplay={renderCategoryBadge(tx)}
                    />

                    {/* Amount (inline editable) */}
                    <InlineEditCell
                      value={String(tx.amount)}
                      onSave={val => handleInlineEdit(tx, 'amount', val)}
                      type="number"
                      className="text-right"
                      renderDisplay={
                        <span className={`text-sm font-semibold text-right block ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, sym)}
                        </span>
                      }
                    />

                    {/* Date */}
                    <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setSplitTx(tx)}
                        title={t('splitTransaction')}
                      >
                        <Scissors className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(tx.id)}
                        title={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                  <span className="text-muted-foreground">
                    {t('page', { current: currentPage, total: totalPages })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                      {t('prev')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Split Dialog */}
      <SplitDialog
        open={!!splitTx}
        tx={splitTx}
        categories={categories || []}
        sym={sym}
        t={t}
        onClose={() => setSplitTx(null)}
        onSplit={handleSplit}
      />

      {/* Add Transaction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogClose onClose={() => setShowAdd(false)} />
        <DialogHeader>
          <DialogTitle>{t('addTransaction')}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.type === 'expense' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'expense', category_id: '' }))}
              >
                {t('expense')}
              </Button>
              <Button
                type="button"
                variant={form.type === 'income' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'income', category_id: '' }))}
              >
                {t('income')}
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">{t('amount')}</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('category')}</label>
              <Select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">{t('selectCategory')}</option>
                {filteredFormCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('description')}</label>
              <Input
                placeholder={t('descriptionPlaceholder')}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('date')}</label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={form.recurring}
                onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="recurring" className="text-sm">{t('recurringTransaction')}</label>
            </div>

            {form.recurring && (
              <Select value={form.recurring_interval} onChange={e => setForm(f => ({ ...f, recurring_interval: e.target.value }))}>
                <option value="">{t('selectInterval')}</option>
                <option value="weekly">{t('weekly')}</option>
                <option value="biweekly">{t('biweekly')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </Select>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('adding') : t('addTransaction')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
