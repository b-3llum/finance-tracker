'use client'

import { useState } from 'react'
import { useApi, apiPost, apiDelete, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Receipt, AlertTriangle, CheckCircle2, Clock, Calendar, Zap, Bell } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { Bill, Category } from '@/lib/types'

export default function BillsPage() {
  const { data: bills, refetch } = useApi<Bill[]>('/api/bills')
  const { data: categories } = useApi<Category[]>('/api/categories')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '', amount: '', due_day: '', category_id: '', frequency: 'monthly', auto_pay: false, reminder_days: '3', notes: ''
  })

  const { toast } = useToast()
  const sym = settings?.currency_symbol || '$'

  const expenseCategories = categories?.filter(c => c.type === 'expense') || []
  const overdue = bills?.filter(b => b.is_overdue) || []
  const upcoming = bills?.filter(b => !b.is_overdue && b.days_until_due !== null && b.days_until_due <= 7) || []
  const totalMonthly = bills?.filter(b => b.status === 'active').reduce((sum, b) => sum + b.amount, 0) || 0
  const totalYearly = totalMonthly * 12

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/api/bills', {
        ...form,
        amount: parseFloat(form.amount),
        due_day: parseInt(form.due_day),
        reminder_days: parseInt(form.reminder_days),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      })
      setForm({ name: '', amount: '', due_day: '', category_id: '', frequency: 'monthly', auto_pay: false, reminder_days: '3', notes: '' })
      setShowAdd(false)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  async function markPaid(bill: Bill) {
    try {
      await apiPut(`/api/bills/${bill.id}`, { last_paid_date: new Date().toISOString().split('T')[0] })
      toast.success(`${bill.name} marked as paid`)
      refetch()
    } catch (e: any) { toast.error(e.message) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this bill?')) return
    try { await apiDelete(`/api/bills/${id}`); refetch() }
    catch (e: any) { toast.error(e.message) }
  }

  function getDueLabel(bill: Bill) {
    if (bill.is_overdue) return `${Math.abs(bill.days_until_due!)} days overdue`
    if (bill.days_until_due === 0) return 'Due today'
    if (bill.days_until_due === 1) return 'Due tomorrow'
    if (bill.days_until_due !== null && bill.days_until_due <= 7) return `Due in ${bill.days_until_due} days`
    return bill.next_due_date ? `Due ${bill.next_due_date}` : `Day ${bill.due_day}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bills & Recurring</h1>
          <p className="text-muted-foreground">Track and never miss a payment</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Bill
        </Button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="animate-count-up">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-lg font-bold truncate">{formatCurrency(totalMonthly, sym)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-count-up stagger-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Yearly</p>
                <p className="text-lg font-bold truncate">{formatCurrency(totalYearly, sym)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`animate-count-up stagger-2 ${overdue.length > 0 ? 'ring-2 ring-red-500/20' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${overdue.length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${overdue.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className={`text-lg font-bold ${overdue.length > 0 ? 'text-red-500' : ''}`}>{overdue.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`animate-count-up stagger-3 ${upcoming.length > 0 ? 'ring-2 ring-amber-500/20' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${upcoming.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                <Clock className={`h-5 w-5 ${upcoming.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Due Soon</p>
                <p className={`text-lg font-bold ${upcoming.length > 0 ? 'text-amber-600' : ''}`}>{upcoming.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bills Timeline */}
      {!bills || bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills tracked yet"
          description="Add your recurring bills to track due dates, get reminders, and see your total monthly commitments."
          action={{ label: 'Add Your First Bill', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => {
            const urgency = bill.is_overdue ? 'overdue' : bill.days_until_due !== null && bill.days_until_due <= 3 ? 'urgent' : bill.days_until_due !== null && bill.days_until_due <= 7 ? 'soon' : 'normal'
            const borderColor = urgency === 'overdue' ? 'border-l-red-500' : urgency === 'urgent' ? 'border-l-amber-500' : urgency === 'soon' ? 'border-l-blue-400' : 'border-l-transparent'

            return (
              <Card key={bill.id} className={`border-l-4 ${borderColor} animate-count-up`} style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Status Icon */}
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                        urgency === 'overdue' ? 'bg-red-100 dark:bg-red-900/30' :
                        urgency === 'urgent' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-muted/60'
                      }`}>
                        {bill.category_color ? (
                          <div className="h-5 w-5 rounded-lg" style={{ backgroundColor: bill.category_color }} />
                        ) : (
                          <Receipt className={`h-5 w-5 ${
                            urgency === 'overdue' ? 'text-red-500' :
                            urgency === 'urgent' ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`} />
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{bill.name}</p>
                          {bill.auto_pay === 1 && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-0.5">
                              <Zap className="h-2.5 w-2.5" />Auto
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs font-medium ${
                            urgency === 'overdue' ? 'text-red-500' :
                            urgency === 'urgent' ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            {getDueLabel(bill)}
                          </span>
                          {bill.category_name && (
                            <span className="text-xs text-muted-foreground">{bill.category_name}</span>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{bill.frequency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-base font-bold tabular-nums">{formatCurrency(bill.amount, sym)}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => markPaid(bill)} title="Mark paid">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(bill.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Bill Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogClose onClose={() => setShowAdd(false)} />
        <DialogHeader><DialogTitle>Add Recurring Bill</DialogTitle></DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bill Name</label>
              <Input placeholder="Netflix, Rent, Electric..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium">Due Day (1-31)</label>
                <Input type="number" min="1" max="31" placeholder="15" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Frequency</label>
                <Select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">None</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="autopay" checked={form.auto_pay} onChange={e => setForm(f => ({ ...f, auto_pay: e.target.checked }))} className="rounded" />
              <label htmlFor="autopay" className="text-sm">Auto-pay enabled</label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Bill'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
