'use client'

import { useState } from 'react'
import { useApi, apiPost, apiDelete } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency, daysUntil } from '@/lib/utils'
import { Plus, Target, Trash2, DollarSign, Calendar } from 'lucide-react'
import type { SavingsGoal } from '@/lib/types'

export default function SavingsPage() {
  const { data: goals, refetch } = useApi<SavingsGoal[]>('/api/savings')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [showAdd, setShowAdd] = useState(false)
  const [showContribute, setShowContribute] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '', priority: '1' })
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sym = settings?.currency_symbol || '$'

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiPost('/api/savings', {
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        deadline: form.deadline || null,
        priority: parseInt(form.priority),
      })
      setForm({ name: '', target_amount: '', deadline: '', priority: '1' })
      setShowAdd(false)
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    if (!showContribute) return
    setSubmitting(true)
    try {
      await apiPost(`/api/savings/${showContribute.id}/contribute`, {
        amount: parseFloat(contribAmount),
        note: contribNote || null,
      })
      setContribAmount('')
      setContribNote('')
      setShowContribute(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this savings goal?')) return
    try {
      await apiDelete(`/api/savings/${id}`)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-muted-foreground">Track your savings progress</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New Goal
        </Button>
      </div>

      {!goals || goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No savings goals yet. Create one to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
            const days = goal.deadline ? daysUntil(goal.deadline) : null
            const remaining = goal.target_amount - goal.current_amount
            const dailyNeeded = days && days > 0 && remaining > 0 ? remaining / days : null

            return (
              <Card key={goal.id} className={goal.status === 'completed' ? 'border-emerald-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={goal.status === 'completed' ? 'success' : goal.status === 'paused' ? 'warning' : 'secondary'}>
                        {goal.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{formatCurrency(goal.current_amount, sym)}</span>
                      <span className="text-muted-foreground">{formatCurrency(goal.target_amount, sym)}</span>
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName={pct >= 100 ? 'bg-emerald-500' : 'bg-primary'}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{pct}% complete</p>
                  </div>

                  {goal.deadline && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {days !== null && days > 0
                        ? <span>{days} days remaining</span>
                        : days !== null && days <= 0
                          ? <span className="text-red-500">Deadline passed</span>
                          : null
                      }
                    </div>
                  )}

                  {dailyNeeded && (
                    <p className="text-xs text-muted-foreground">
                      Need {formatCurrency(dailyNeeded, sym)}/day or {formatCurrency(dailyNeeded * 7, sym)}/week to reach goal
                    </p>
                  )}

                  {goal.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => { setShowContribute(goal); setContribAmount(''); setContribNote('') }}
                    >
                      <DollarSign className="h-3 w-3" /> Add Contribution
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogClose onClose={() => setShowAdd(false)} />
        <DialogHeader>
          <DialogTitle>New Savings Goal</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Goal Name</label>
              <Input placeholder="Emergency Fund" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium">Target Amount</label>
              <Input type="number" step="0.01" min="1" placeholder="1000" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium">Deadline (optional)</label>
              <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Priority (1 = highest)</label>
              <Input type="number" min="1" max="10" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Goal'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={!!showContribute} onOpenChange={() => setShowContribute(null)}>
        <DialogClose onClose={() => setShowContribute(null)} />
        <DialogHeader>
          <DialogTitle>Contribute to: {showContribute?.name}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleContribute} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={contribAmount} onChange={e => setContribAmount(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Input placeholder="Monthly contribution" value={contribNote} onChange={e => setContribNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Contribution'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
