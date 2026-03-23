'use client'

import { useState } from 'react'
import { useApi, apiPost, apiDelete } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency, formatDate, getToday } from '@/lib/utils'
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { Category, TransactionWithCategory } from '@/lib/types'

export default function TransactionsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filterParams = new URLSearchParams()
  if (typeFilter) filterParams.set('type', typeFilter)
  if (categoryFilter) filterParams.set('category', categoryFilter)
  if (dateFrom) filterParams.set('from', dateFrom)
  if (dateTo) filterParams.set('to', dateTo)
  filterParams.set('limit', '100')

  const { data: txData, refetch } = useApi<{ transactions: TransactionWithCategory[]; total: number }>(
    `/api/transactions?${filterParams.toString()}`
  )
  const { data: categories } = useApi<Category[]>('/api/categories')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')

  const { toast } = useToast()
  const sym = settings?.currency_symbol || '$'

  // Add transaction form state
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

  const filteredCategories = categories?.filter(c => c.type === form.type) || []

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

  async function handleDelete(id: number) {
    if (!confirm('Delete this transaction?')) return
    try {
      await apiDelete(`/api/transactions/${id}`)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">{txData?.total || 0} transactions</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Filters</span>
            {(typeFilter || categoryFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setTypeFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo('') }}>
                Clear
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardContent className="p-0">
          {txData?.transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              No transactions found. Click "Add Transaction" to get started.
            </p>
          ) : (
            <div className="divide-y">
              {txData?.transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {tx.type === 'income'
                        ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        : <ArrowDownRight className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.category_name || 'Uncategorized'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        {tx.category_name && (
                          <Badge variant="secondary" className="text-xs py-0">
                            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tx.category_color || '#94a3b8' }} />
                            {tx.category_name}
                          </Badge>
                        )}
                        {tx.recurring === 1 && <Badge variant="outline" className="text-xs py-0">Recurring</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, sym)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(tx.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogClose onClose={() => setShowAdd(false)} />
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.type === 'expense' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'expense', category_id: '' }))}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={form.type === 'income' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'income', category_id: '' }))}
              >
                Income
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
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
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select category</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="What was this for?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Date</label>
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
              <label htmlFor="recurring" className="text-sm">Recurring transaction</label>
            </div>

            {form.recurring && (
              <Select value={form.recurring_interval} onChange={e => setForm(f => ({ ...f, recurring_interval: e.target.value }))}>
                <option value="">Select interval</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
