'use client'

import { useState } from 'react'
import { useApi, apiPost, apiDelete } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, CreditCard, DollarSign, Landmark, GraduationCap, Car, Heart, TrendingDown, Trophy, Flame } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { Debt } from '@/lib/types'

const DEBT_META: Record<string, { label: string; icon: typeof CreditCard; color: string }> = {
  credit_card: { label: 'Credit Card', icon: CreditCard, color: 'text-orange-500' },
  student_loan: { label: 'Student Loan', icon: GraduationCap, color: 'text-blue-500' },
  mortgage: { label: 'Mortgage', icon: Landmark, color: 'text-violet-500' },
  auto_loan: { label: 'Auto Loan', icon: Car, color: 'text-cyan-500' },
  personal_loan: { label: 'Personal Loan', icon: DollarSign, color: 'text-emerald-500' },
  medical: { label: 'Medical', icon: Heart, color: 'text-rose-500' },
  other: { label: 'Other', icon: TrendingDown, color: 'text-gray-500' },
}

export default function DebtsPage() {
  const { data: debts, refetch } = useApi<Debt[]>('/api/debts')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [showAdd, setShowAdd] = useState(false)
  const [showPayment, setShowPayment] = useState<Debt | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [form, setForm] = useState({
    name: '', type: 'credit_card', original_balance: '', current_balance: '',
    interest_rate: '', minimum_payment: '', due_day: ''
  })

  const { toast } = useToast()
  const sym = settings?.currency_symbol || '$'

  const activeDebts = debts?.filter(d => d.status === 'active') || []
  const paidOffDebts = debts?.filter(d => d.status === 'paid_off') || []
  const totalOwed = activeDebts.reduce((sum, d) => sum + d.current_balance, 0)
  const totalOriginal = activeDebts.reduce((sum, d) => sum + d.original_balance, 0)
  const totalPaid = totalOriginal - totalOwed
  const overallPct = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0
  const totalMinPayments = activeDebts.reduce((sum, d) => sum + d.minimum_payment, 0)

  // Snowball order: smallest balance first
  const snowball = [...activeDebts].sort((a, b) => a.current_balance - b.current_balance)
  // Avalanche order: highest interest first
  const avalanche = [...activeDebts].sort((a, b) => b.interest_rate - a.interest_rate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/api/debts', {
        name: form.name, type: form.type,
        original_balance: parseFloat(form.original_balance),
        current_balance: form.current_balance ? parseFloat(form.current_balance) : parseFloat(form.original_balance),
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : 0,
        minimum_payment: form.minimum_payment ? parseFloat(form.minimum_payment) : 0,
        due_day: form.due_day ? parseInt(form.due_day) : null,
      })
      setForm({ name: '', type: 'credit_card', original_balance: '', current_balance: '', interest_rate: '', minimum_payment: '', due_day: '' })
      setShowAdd(false)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!showPayment) return
    setSubmitting(true)
    try {
      await apiPost(`/api/debts/${showPayment.id}/payments`, { amount: parseFloat(payAmount), note: payNote || null })
      toast.success('Payment recorded')
      setPayAmount(''); setPayNote(''); setShowPayment(null)
      refetch()
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this debt?')) return
    try { await apiDelete(`/api/debts/${id}`); refetch() }
    catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debt Tracker</h1>
          <p className="text-muted-foreground">Your path to debt freedom</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Debt
        </Button>
      </div>

      {/* Overall Progress Hero */}
      {activeDebts.length > 0 && (
        <Card className="overflow-hidden animate-scale-in">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Debt Remaining</p>
                <p className="text-3xl font-bold text-red-500">{formatCurrency(totalOwed, sym)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Minimums</p>
                <p className="text-xl font-bold">{formatCurrency(totalMinPayments, sym)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(totalPaid, sym)} paid</span>
                <span>{overallPct}% done</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-progress-fill transition-all duration-700" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeDebts.length === 0 && paidOffDebts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debts tracked"
          description="Add your debts to track payoff progress, compare payoff strategies, and celebrate milestones."
          action={{ label: 'Add Your First Debt', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <>
          {/* Debt Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDebts.map((debt, i) => {
              const meta = DEBT_META[debt.type] || DEBT_META.other
              const Icon = meta.icon
              const paidPct = debt.original_balance > 0
                ? Math.round(((debt.original_balance - debt.current_balance) / debt.original_balance) * 100) : 0
              const isHighInterest = debt.interest_rate >= 20

              return (
                <Card key={debt.id} className="animate-count-up group" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{debt.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{meta.label}</span>
                            {isHighInterest && (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 gap-0.5">
                                <Flame className="h-2.5 w-2.5" />{debt.interest_rate}% APR
                              </Badge>
                            )}
                            {!isHighInterest && debt.interest_rate > 0 && (
                              <span className="text-[10px] text-muted-foreground">{debt.interest_rate}% APR</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(debt.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Balance */}
                    <div className="mb-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl font-bold tabular-nums">{formatCurrency(debt.current_balance, sym)}</span>
                        <span className="text-xs text-muted-foreground">of {formatCurrency(debt.original_balance, sym)}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5 mb-4">
                      <Progress value={paidPct} className="h-2" indicatorClassName={`bg-gradient-to-r ${paidPct >= 75 ? 'from-emerald-500 to-emerald-400' : paidPct >= 50 ? 'from-blue-500 to-blue-400' : 'from-primary to-primary/80'}`} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{paidPct}% paid off</span>
                        {debt.minimum_payment > 0 && <span>Min: {formatCurrency(debt.minimum_payment, sym)}/mo</span>}
                      </div>
                    </div>

                    {/* Action */}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { setShowPayment(debt); setPayAmount(debt.minimum_payment.toString()); setPayNote('') }}>
                      <DollarSign className="h-3.5 w-3.5" /> Make Payment
                    </Button>
                  </CardContent>
                </Card>
              )
            })}

            {paidOffDebts.map(debt => (
              <Card key={debt.id} className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{debt.name}</p>
                    <p className="text-xs text-emerald-600">Paid off! Originally {formatCurrency(debt.original_balance, sym)}</p>
                  </div>
                  <Badge variant="success">Paid Off</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payoff Strategy Comparison */}
          {activeDebts.length >= 2 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payoff Strategy</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">S</span>
                      </div>
                      <p className="text-sm font-semibold">Snowball</p>
                      <Badge variant="secondary" className="text-[10px] ml-auto">Motivation</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Pay smallest balance first for quick wins</p>
                    <ol className="space-y-1.5">
                      {snowball.map((d, i) => (
                        <li key={d.id} className="flex items-center gap-2 text-xs">
                          <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto font-medium tabular-nums">{formatCurrency(d.current_balance, sym)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-red-600">A</span>
                      </div>
                      <p className="text-sm font-semibold">Avalanche</p>
                      <Badge variant="secondary" className="text-[10px] ml-auto">Saves Most</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Pay highest interest first to save money</p>
                    <ol className="space-y-1.5">
                      {avalanche.map((d, i) => (
                        <li key={d.id} className="flex items-center gap-2 text-xs">
                          <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto font-medium tabular-nums">{d.interest_rate}%</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Debt Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogClose onClose={() => setShowAdd(false)} />
        <DialogHeader><DialogTitle>Add Debt</DialogTitle></DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="Visa Credit Card, Student Loan..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(DEBT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Original Balance</label>
                <Input type="number" step="0.01" min="0" placeholder="5000" value={form.original_balance} onChange={e => setForm(f => ({ ...f, original_balance: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium">Current Balance</label>
                <Input type="number" step="0.01" min="0" placeholder="Same as original" value={form.current_balance} onChange={e => setForm(f => ({ ...f, current_balance: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Interest Rate (%)</label>
                <Input type="number" step="0.01" min="0" placeholder="19.9" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Min Payment</label>
                <Input type="number" step="0.01" min="0" placeholder="25" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Debt'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogClose onClose={() => setShowPayment(null)} />
        <DialogHeader><DialogTitle>Payment: {showPayment?.name}</DialogTitle></DialogHeader>
        <DialogContent>
          <div className="rounded-xl bg-muted/40 p-3 mb-4 text-center">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className="text-lg font-bold">{formatCurrency(showPayment?.current_balance || 0, sym)}</p>
          </div>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Payment Amount</label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Input placeholder="Monthly payment" value={payNote} onChange={e => setPayNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
