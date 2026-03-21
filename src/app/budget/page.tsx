'use client'

import { useState } from 'react'
import { useApi, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { Pencil } from 'lucide-react'

interface BudgetCategory {
  id: number
  name: string
  color: string
  icon: string
  budget_amount: number
  spent: number
  remaining: number
  percent: number
}

interface BudgetResponse {
  month: string
  categories: BudgetCategory[]
  totalBudget: number
  totalSpent: number
  totalRemaining: number
}

export default function BudgetPage() {
  const { data: budget, refetch } = useApi<BudgetResponse>('/api/budget')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [editing, setEditing] = useState<BudgetCategory | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')

  const sym = settings?.currency_symbol || '$'

  async function saveBudget() {
    if (!editing) return
    try {
      await apiPut(`/api/categories/${editing.id}`, {
        budget_amount: parseFloat(budgetAmount) || 0,
      })
      setEditing(null)
      refetch()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function getProgressColor(percent: number) {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-muted-foreground">
          {budget?.month ? new Date(budget.month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'This month'}
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(budget?.totalBudget || 0, sym)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{formatCurrency(budget?.totalSpent || 0, sym)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className={`text-2xl font-bold mt-1 ${(budget?.totalRemaining || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(budget?.totalRemaining || 0, sym)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {budget?.categories.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(cat.spent, sym)} / {cat.budget_amount > 0 ? formatCurrency(cat.budget_amount, sym) : 'No budget'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditing(cat); setBudgetAmount(String(cat.budget_amount || '')) }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {cat.budget_amount > 0 && (
                  <Progress
                    value={cat.percent}
                    indicatorClassName={getProgressColor(cat.percent)}
                  />
                )}
                {cat.budget_amount > 0 && cat.percent > 100 && (
                  <p className="text-xs text-red-500 mt-1">
                    Over budget by {formatCurrency(Math.abs(cat.remaining), sym)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogClose onClose={() => setEditing(null)} />
        <DialogHeader>
          <DialogTitle>Set Budget: {editing?.name}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Monthly Budget Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={budgetAmount}
                onChange={e => setBudgetAmount(e.target.value)}
              />
            </div>
            <Button onClick={saveBudget} className="w-full">Save Budget</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
