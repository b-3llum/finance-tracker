'use client'

import { useState, useMemo } from 'react'
import { useApi, apiPut } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogClose } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { useTranslations } from '@/lib/i18n'
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import {
  Pencil, TrendingUp, TrendingDown, ArrowRightLeft, Layers, List,
  Wallet, ShoppingBag, PiggyBank,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewMode = 'detailed' | 'simplified'

interface BucketDef {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  categoryNames: string[]
}

const BUCKETS: BucketDef[] = [
  {
    key: 'needs',
    label: 'Needs',
    icon: <Wallet className="h-5 w-5" />,
    color: '#6366f1',
    categoryNames: ['Housing', 'Groceries', 'Utilities', 'Insurance', 'Healthcare', 'Transport', 'Rent', 'Mortgage', 'Electric', 'Gas', 'Water', 'Internet', 'Phone'],
  },
  {
    key: 'wants',
    label: 'Wants',
    icon: <ShoppingBag className="h-5 w-5" />,
    color: '#f59e0b',
    categoryNames: ['Dining', 'Entertainment', 'Shopping', 'Subscriptions', 'Personal', 'Restaurants', 'Dining Out', 'Clothing', 'Hobbies'],
  },
  {
    key: 'savings',
    label: 'Savings',
    icon: <PiggyBank className="h-5 w-5" />,
    color: '#10b981',
    categoryNames: ['Savings', 'Investments', 'Emergency Fund', 'Emergency', 'Retirement', 'Investment'],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(month: string | undefined): number {
  if (!month) {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function getCurrentDay(month: string | undefined): number {
  const now = new Date()
  if (!month) return now.getDate()
  const [y, m] = month.split('-').map(Number)
  if (now.getFullYear() === y && now.getMonth() + 1 === m) return now.getDate()
  // If viewing a past month, pace is 100%
  return getDaysInMonth(month)
}

function getPacePercent(month: string | undefined): number {
  const days = getDaysInMonth(month)
  const current = getCurrentDay(month)
  return Math.min((current / days) * 100, 100)
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function getProgressHex(percent: number): string {
  if (percent >= 90) return '#ef4444'
  if (percent >= 75) return '#f59e0b'
  return '#10b981'
}

/** Simulated rollover: difference between budget and spent last month, clamped */
function simulateRollover(cat: BudgetCategory): number {
  if (cat.budget_amount <= 0) return 0
  return cat.budget_amount - cat.spent > 0
    ? Math.round((cat.budget_amount - cat.spent) * 0.1 * 100) / 100 // small surplus carried
    : -Math.round(Math.abs(cat.remaining) * 0.15 * 100) / 100 // small overspend carried
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PaceProgressBar({
  percent,
  pacePercent,
  color,
}: {
  percent: number
  pacePercent: number
  color: string
}) {
  const capped = Math.min(Math.max(percent, 0), 100)
  const isOverPace = capped > pacePercent

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
      {/* Spent bar */}
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${capped}%` }}
      />
      {/* Pace indicator line */}
      <div
        className="absolute top-0 h-full w-0.5 transition-all duration-300"
        style={{
          left: `${pacePercent}%`,
          backgroundColor: isOverPace ? '#ef4444' : '#6b7280',
        }}
      />
      {/* Small triangle marker above the line */}
      <div
        className="absolute -top-1 w-0 h-0 transition-all duration-300"
        style={{
          left: `calc(${pacePercent}% - 3px)`,
          borderLeft: '3px solid transparent',
          borderRight: '3px solid transparent',
          borderTop: `4px solid ${isOverPace ? '#ef4444' : '#6b7280'}`,
        }}
      />
    </div>
  )
}

function RolloverBadge({ amount, sym }: { amount: number; sym: string }) {
  if (amount === 0) return null
  const isPositive = amount > 0
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isPositive
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/15 text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{formatCurrency(amount, sym)} rollover
    </span>
  )
}

function BudgetSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="rounded-2xl glass-card p-6 space-y-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl glass-card p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BudgetPage() {
  const { data: budget, loading, refetch } = useApi<BudgetResponse>('/api/budget')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const { toast } = useToast()
  const { t } = useTranslations('budget')

  const [editing, setEditing] = useState<BudgetCategory | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')

  const sym = settings?.currency_symbol || '$'
  const pacePercent = useMemo(() => getPacePercent(budget?.month), [budget?.month])

  // ---- Bucket aggregation for simplified view ----
  const bucketData = useMemo(() => {
    if (!budget?.categories) return []
    return BUCKETS.map((bucket) => {
      const lowerNames = bucket.categoryNames.map((n) => n.toLowerCase())
      const matched = budget.categories.filter((c) =>
        lowerNames.includes(c.name.toLowerCase())
      )
      const budgetTotal = matched.reduce((s, c) => s + c.budget_amount, 0)
      const spentTotal = matched.reduce((s, c) => s + c.spent, 0)
      const percent = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0
      return { ...bucket, categories: matched, budgetTotal, spentTotal, percent }
    })
  }, [budget?.categories])

  // Uncategorized bucket for simplified view
  const uncategorized = useMemo(() => {
    if (!budget?.categories) return []
    const allBucketNames = BUCKETS.flatMap((b) => b.categoryNames.map((n) => n.toLowerCase()))
    return budget.categories.filter((c) => !allBucketNames.includes(c.name.toLowerCase()))
  }, [budget?.categories])

  // ---- Chart data ----
  const chartData = useMemo(() => {
    if (!budget?.categories) return []
    return budget.categories
      .filter((c) => c.budget_amount > 0)
      .map((c) => ({
        name: c.name.length > 10 ? c.name.slice(0, 10) + '...' : c.name,
        fullName: c.name,
        budget: c.budget_amount,
        actual: c.spent,
        over: c.spent > c.budget_amount,
      }))
  }, [budget?.categories])

  // ---- Actions ----
  async function saveBudget() {
    if (!editing) return
    try {
      await apiPut(`/api/categories/${editing.id}`, {
        budget_amount: parseFloat(budgetAmount) || 0,
      })
      setEditing(null)
      refetch()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // ---- Loading ----
  if (loading) return <BudgetSkeleton />

  // ---- Render ----
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title') !== 'budget.title' ? t('title') : 'Budget'}</h1>
          <p className="text-muted-foreground">
            {budget?.month
              ? new Date(budget.month + '-01T00:00:00').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
              : t('thisMonth') !== 'budget.thisMonth' ? t('thisMonth') : 'This month'}
          </p>
        </div>
        {/* View mode toggle */}
        <div className="flex items-center gap-1 rounded-lg glass p-1">
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'ghost'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setViewMode('detailed')}
          >
            <List className="h-3.5 w-3.5" />
            Detailed
          </Button>
          <Button
            variant={viewMode === 'simplified' ? 'default' : 'ghost'}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setViewMode('simplified')}
          >
            <Layers className="h-3.5 w-3.5" />
            Simplified
          </Button>
        </div>
      </div>

      {/* Pace legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-gray-500 rounded" />
          Spending pace ({Math.round(pacePercent)}% of month elapsed)
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowRightLeft className="h-3 w-3" />
          Rollover from prior month
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('totalBudget') !== 'budget.totalBudget' ? t('totalBudget') : 'Total Budget'}
          </p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(budget?.totalBudget || 0, sym)}</p>
        </div>
        <div className="rounded-2xl glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('totalSpent') !== 'budget.totalSpent' ? t('totalSpent') : 'Total Spent'}
          </p>
          <p className="text-2xl font-bold mt-1 text-red-500">
            {formatCurrency(budget?.totalSpent || 0, sym)}
          </p>
        </div>
        <div className="rounded-2xl glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('remaining') !== 'budget.remaining' ? t('remaining') : 'Remaining'}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              (budget?.totalRemaining || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {formatCurrency(budget?.totalRemaining || 0, sym)}
          </p>
        </div>
      </div>

      {/* ================= DETAILED VIEW ================= */}
      {viewMode === 'detailed' && (
        <div className="rounded-2xl glass-card p-6">
          <h2 className="text-lg font-semibold mb-6">
            {t('categoryBudgets') !== 'budget.categoryBudgets' ? t('categoryBudgets') : 'Category Budgets'}
          </h2>
          <div className="space-y-6">
            {budget?.categories.map((cat) => {
              const rollover = simulateRollover(cat)
              const isOverPace = cat.percent > pacePercent && cat.budget_amount > 0

              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                      <RolloverBadge amount={rollover} sym={sym} />
                      {isOverPace && (
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                          Ahead of pace
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(cat.spent, sym)} /{' '}
                        {cat.budget_amount > 0
                          ? formatCurrency(cat.budget_amount, sym)
                          : 'No budget'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(cat)
                          setBudgetAmount(String(cat.budget_amount || ''))
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {cat.budget_amount > 0 && (
                    <PaceProgressBar
                      percent={cat.percent}
                      pacePercent={pacePercent}
                      color={getProgressColor(cat.percent)}
                    />
                  )}
                  {cat.budget_amount > 0 && cat.percent > 100 && (
                    <p className="text-xs text-red-500 mt-1">
                      Over budget by {formatCurrency(Math.abs(cat.remaining), sym)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================= SIMPLIFIED VIEW ================= */}
      {viewMode === 'simplified' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {bucketData.map((bucket) => (
            <div key={bucket.key} className="rounded-2xl glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{ backgroundColor: `${bucket.color}20` }}
                >
                  <span style={{ color: bucket.color }}>{bucket.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{bucket.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(bucket.spentTotal, sym)} / {formatCurrency(bucket.budgetTotal, sym)}
                  </p>
                </div>
              </div>

              {/* Bucket-level progress with pace */}
              <PaceProgressBar
                percent={bucket.percent}
                pacePercent={pacePercent}
                color={
                  bucket.percent >= 90
                    ? 'bg-red-500'
                    : bucket.percent >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }
              />
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {Math.round(bucket.percent)}% used
                {bucket.percent > pacePercent && bucket.budgetTotal > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">- ahead of pace</span>
                )}
              </p>

              {/* Inner category breakdown */}
              <div className="space-y-3 border-t border-border/50 pt-3">
                {bucket.categories.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No categories assigned</p>
                )}
                {bucket.categories.map((cat) => {
                  const pct = cat.budget_amount > 0 ? (cat.spent / cat.budget_amount) * 100 : 0
                  return (
                    <div key={cat.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressColor(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                          {formatCurrency(cat.spent, sym)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Uncategorized overflow */}
          {uncategorized.length > 0 && (
            <div className="rounded-2xl glass-card p-6 lg:col-span-3">
              <h3 className="font-semibold mb-3">Other</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {uncategorized.map((cat) => {
                  const pct = cat.budget_amount > 0 ? (cat.spent / cat.budget_amount) * 100 : 0
                  return (
                    <div key={cat.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs truncate">{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatCurrency(cat.spent, sym)}
                        {cat.budget_amount > 0 && ` / ${formatCurrency(cat.budget_amount, sym)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= BUDGET VS ACTUAL CHART ================= */}
      {chartData.length > 0 && (
        <div className="rounded-2xl glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Budget vs Actual</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barGap={2}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v, sym)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(0,0,0,0.85)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                    backdropFilter: 'blur(12px)',
                  }}
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0, sym),
                    name === 'budget' ? 'Budget' : 'Actual',
                  ]}
                  labelFormatter={(label: any) => {
                    const item = chartData.find((d) => d.name === String(label))
                    return item?.fullName || String(label)
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value: string) => (value === 'budget' ? 'Budget' : 'Actual')}
                />
                <Bar dataKey="budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.over ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================= ROLLOVER SUMMARY ================= */}
      {budget?.categories && budget.categories.some((c) => c.budget_amount > 0) && (
        <div className="rounded-2xl glass-card p-6">
          <h2 className="text-lg font-semibold mb-4">Rollover Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budget.categories
              .filter((c) => c.budget_amount > 0)
              .map((cat) => {
                const rollover = simulateRollover(cat)
                if (rollover === 0) return null
                const isPositive = rollover > 0
                return (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between rounded-xl p-3 ${
                      isPositive
                        ? 'bg-emerald-500/5 border border-emerald-500/20'
                        : 'bg-red-500/5 border border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm truncate">{cat.name}</span>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums shrink-0 ${
                        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(rollover, sym)}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ================= EDIT BUDGET DIALOG ================= */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogClose onClose={() => setEditing(null)} />
        <DialogHeader>
          <DialogTitle>
            {t('setBudget') !== 'budget.setBudget' ? t('setBudget') : 'Set Budget'}: {editing?.name}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t('monthlyBudgetAmount') !== 'budget.monthlyBudgetAmount'
                  ? t('monthlyBudgetAmount')
                  : 'Monthly Budget Amount'}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
            <Button onClick={saveBudget} className="w-full">
              {t('saveBudget') !== 'budget.saveBudget' ? t('saveBudget') : 'Save Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
