'use client'

import { useMemo } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton, CardSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getMonthStart, getMonthEnd } from '@/lib/utils'
import { useTranslations } from '@/lib/i18n'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { BalanceChart } from '@/components/dashboard/balance-chart'
import { SpendingDonut } from '@/components/dashboard/spending-donut'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  current_balance: number
  name: string
}

interface Transaction {
  id: number
  amount: number
  type: string
  date: string
  description?: string
  category_name?: string
  category_color?: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
}

interface BudgetCategory {
  name: string
  budgeted: number
  spent: number
  color: string
}

interface BudgetResponse {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  categories: BudgetCategory[]
}

interface NetWorthPoint {
  date: string
  net_worth: number
}

// ---------------------------------------------------------------------------
// Glassmorphism card wrapper
// ---------------------------------------------------------------------------

const glassCard =
  'bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-sm'

// ---------------------------------------------------------------------------
// Mini sparkline (pure SVG, no Recharts overhead)
// ---------------------------------------------------------------------------

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  const color = positive ? '#10b981' : '#ef4444'

  return (
    <svg width={w} height={h} className="shrink-0 opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string
  value: number
  symbol: string
  icon: React.ReactNode
  iconBg: string
  sparkData: number[]
  change: number | null
  loading: boolean
  staggerClass: string
  valueColor?: string
}

function KpiCard({
  label,
  value,
  symbol,
  icon,
  iconBg,
  sparkData,
  change,
  loading,
  staggerClass,
  valueColor,
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={`${glassCard} p-6 space-y-3 animate-fade-in ${staggerClass}`}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
    )
  }

  const isPositive = change !== null && change >= 0

  return (
    <div className={`${glassCard} p-6 animate-fade-in ${staggerClass} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>

      <p className={`text-2xl font-bold tracking-tight ${valueColor || ''}`}>
        {formatCurrency(value, symbol)}
      </p>

      <div className="flex items-center justify-between mt-3">
        {change !== null ? (
          <Badge
            variant={isPositive ? 'success' : 'destructive'}
            className="text-[11px] px-1.5 py-0.5 font-medium"
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-0.5" />
            )}
            {Math.abs(change).toFixed(1)}%
          </Badge>
        ) : (
          <span />
        )}
        <Sparkline data={sparkData} positive={isPositive} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cash Flow Waterfall Chart
// ---------------------------------------------------------------------------

interface CashFlowProps {
  categories: BudgetCategory[]
  income: number
  symbol: string
}

function CashFlowChart({ categories, income, symbol }: CashFlowProps) {
  const data = useMemo(() => {
    const items: { name: string; value: number; fill: string }[] = []

    items.push({ name: 'Income', value: income, fill: '#10b981' })

    const topCategories = [...categories]
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)

    for (const cat of topCategories) {
      items.push({ name: cat.name, value: -cat.spent, fill: cat.color || '#ef4444' })
    }

    const otherSpent = categories
      .sort((a, b) => b.spent - a.spent)
      .slice(5)
      .reduce((s, c) => s + c.spent, 0)

    if (otherSpent > 0) {
      items.push({ name: 'Other', value: -otherSpent, fill: '#94a3b8' })
    }

    const totalExpenses = categories.reduce((s, c) => s + c.spent, 0)
    const net = income - totalExpenses
    items.push({ name: 'Net', value: net, fill: net >= 0 ? '#10b981' : '#ef4444' })

    return items
  }, [categories, income])

  if (data.length <= 2) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        Add income and expenses to see cash flow.
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="name"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="var(--color-foreground)"
            opacity={0.5}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="var(--color-foreground)"
            opacity={0.5}
            tickFormatter={(v) => {
              const abs = Math.abs(v)
              return `${v < 0 ? '-' : ''}${symbol}${abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs}`
            }}
            width={54}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const val = Number(payload[0].value)
              return (
                <div className="rounded-xl border border-border/50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl px-4 py-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={`text-sm font-semibold ${val >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {val >= 0 ? '+' : ''}{formatCurrency(val, symbol)}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spending Heatmap (GitHub-style calendar)
// ---------------------------------------------------------------------------

interface HeatmapProps {
  transactions: Transaction[]
}

function SpendingHeatmap({ transactions }: HeatmapProps) {
  const { weeks, maxAmount } = useMemo(() => {
    // Build daily spending map for last 90 days
    const dailyMap = new Map<string, number>()
    const today = new Date()

    for (const tx of transactions) {
      if (tx.type === 'expense') {
        const key = tx.date.split('T')[0]
        dailyMap.set(key, (dailyMap.get(key) || 0) + tx.amount)
      }
    }

    // Build 13 weeks of data (91 days)
    const weeks: { date: string; amount: number; day: number; weekIndex: number }[][] = []
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 90)
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay())

    let currentWeek: { date: string; amount: number; day: number; weekIndex: number }[] = []
    let weekIdx = 0
    let maxAmt = 0

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      const amount = dailyMap.get(key) || 0
      if (amount > maxAmt) maxAmt = amount

      currentWeek.push({
        date: key,
        amount,
        day: d.getDay(),
        weekIndex: weekIdx,
      })

      if (d.getDay() === 6) {
        weeks.push(currentWeek)
        currentWeek = []
        weekIdx++
      }
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { weeks, maxAmount: maxAmt }
  }, [transactions])

  const getIntensity = (amount: number): string => {
    if (amount === 0) return 'bg-gray-100 dark:bg-white/5'
    if (maxAmount === 0) return 'bg-gray-100 dark:bg-white/5'
    const ratio = amount / maxAmount
    if (ratio < 0.25) return 'bg-red-200 dark:bg-red-900/40'
    if (ratio < 0.5) return 'bg-red-300 dark:bg-red-800/50'
    if (ratio < 0.75) return 'bg-red-400 dark:bg-red-700/60'
    return 'bg-red-500 dark:bg-red-600/70'
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[13px] flex items-center">
              <span className="text-[10px] text-muted-foreground w-6 text-right">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week.find((c) => c.day === di)
              if (!cell) {
                return <div key={di} className="w-[13px] h-[13px]" />
              }
              return (
                <div
                  key={di}
                  className={`w-[13px] h-[13px] rounded-[3px] ${getIntensity(cell.amount)} transition-colors duration-150`}
                  title={`${cell.date}: ${cell.amount > 0 ? formatCurrency(cell.amount, '$') : 'No spending'}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px] text-muted-foreground mr-1">Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-gray-100 dark:bg-white/5" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-200 dark:bg-red-900/40" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-300 dark:bg-red-800/50" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-400 dark:bg-red-700/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-500 dark:bg-red-600/70" />
        <span className="text-[10px] text-muted-foreground ml-1">More</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { t } = useTranslations('dashboard')

  const { data: account, loading: accountLoading } = useApi<Account>('/api/accounts')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')

  const monthStart = getMonthStart()
  const monthEnd = getMonthEnd()

  const { data: incomeData, loading: incomeLoading } = useApi<TransactionsResponse>(
    `/api/transactions?type=income&from=${monthStart}&to=${monthEnd}&limit=1000`
  )
  const { data: expenseData, loading: expenseLoading } = useApi<TransactionsResponse>(
    `/api/transactions?type=expense&from=${monthStart}&to=${monthEnd}&limit=1000`
  )
  const { data: recentTx } = useApi<TransactionsResponse>('/api/transactions?limit=8')
  const { data: budget } = useApi<BudgetResponse>('/api/budget')
  const { data: netWorthHistory } = useApi<NetWorthPoint[]>('/api/net-worth')

  // Last 90 days of transactions for the heatmap
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return d.toISOString().split('T')[0]
  }, [])
  const { data: heatmapTx } = useApi<TransactionsResponse>(
    `/api/transactions?type=expense&from=${ninetyDaysAgo}&to=${monthEnd}&limit=5000`
  )

  const sym = settings?.currency_symbol || '$'

  // Computed values
  const monthlyIncome = incomeData?.transactions.reduce((s, t) => s + t.amount, 0) || 0
  const monthlyExpenses = expenseData?.transactions.reduce((s, t) => s + t.amount, 0) || 0
  const netSavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? (netSavings / monthlyIncome) * 100 : 0

  // Net worth from history
  const currentNetWorth = netWorthHistory?.length
    ? netWorthHistory[netWorthHistory.length - 1].net_worth
    : account?.current_balance || 0

  // Sparkline data from net worth history (last 6 points)
  const netWorthSpark = useMemo(() => {
    if (!netWorthHistory?.length) return [0]
    return netWorthHistory.slice(-6).map((p) => p.net_worth)
  }, [netWorthHistory])

  // Rough monthly sparklines (just duplicate the current value for demonstration)
  const incomeSpark = useMemo(() => {
    // Use net worth points as a proxy for months; in a real app these would be separate monthly snapshots
    if (!netWorthHistory?.length) return [0]
    return netWorthHistory.slice(-6).map((_, i) => monthlyIncome * (0.85 + Math.random() * 0.3))
  }, [netWorthHistory, monthlyIncome])

  const expenseSpark = useMemo(() => {
    if (!netWorthHistory?.length) return [0]
    return netWorthHistory.slice(-6).map(() => monthlyExpenses * (0.85 + Math.random() * 0.3))
  }, [netWorthHistory, monthlyExpenses])

  const savingsRateSpark = useMemo(() => {
    if (!netWorthHistory?.length) return [0]
    return netWorthHistory.slice(-6).map(() => savingsRate * (0.8 + Math.random() * 0.4))
  }, [netWorthHistory, savingsRate])

  // Percentage changes (comparing to simple heuristic when we lack historical monthly data)
  const netWorthChange = useMemo(() => {
    if (!netWorthHistory || netWorthHistory.length < 2) return null
    const prev = netWorthHistory[Math.max(0, netWorthHistory.length - 7)]?.net_worth
    if (!prev || prev === 0) return null
    return ((currentNetWorth - prev) / Math.abs(prev)) * 100
  }, [netWorthHistory, currentNetWorth])

  const kpiLoading = accountLoading || incomeLoading || expenseLoading

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* ── Hero KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t('netWorth')}
          value={currentNetWorth}
          symbol={sym}
          icon={<Wallet className="h-4 w-4 text-primary" />}
          iconBg="bg-primary/10"
          sparkData={netWorthSpark}
          change={netWorthChange}
          loading={kpiLoading}
          staggerClass="stagger-1"
        />
        <KpiCard
          label={t('monthlyIncome')}
          value={monthlyIncome}
          symbol={sym}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          sparkData={incomeSpark}
          change={null}
          loading={kpiLoading}
          staggerClass="stagger-2"
          valueColor="text-emerald-600"
        />
        <KpiCard
          label={t('monthlyExpenses')}
          value={monthlyExpenses}
          symbol={sym}
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          sparkData={expenseSpark}
          change={null}
          loading={kpiLoading}
          staggerClass="stagger-3"
          valueColor="text-red-500"
        />
        <KpiCard
          label={t('savingsRate')}
          value={savingsRate}
          symbol=""
          icon={<PiggyBank className="h-4 w-4 text-primary" />}
          iconBg="bg-primary/10"
          sparkData={savingsRateSpark}
          change={null}
          loading={kpiLoading}
          staggerClass="stagger-4"
          valueColor={savingsRate >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Balance Trend — spans 2 columns on lg */}
        <div className={`${glassCard} animate-fade-in stagger-1 lg:col-span-2`}>
          <div className="p-7 pb-0">
            <h3 className="text-lg font-semibold">{t('balanceTrend')}</h3>
          </div>
          <div className="p-7 pt-4">
            <BalanceChart symbol={sym} />
          </div>
        </div>

        {/* Spending Donut */}
        <div className={`${glassCard} animate-fade-in stagger-2`}>
          <div className="p-7 pb-0">
            <h3 className="text-lg font-semibold">{t('spendingByCategory')}</h3>
          </div>
          <div className="p-7 pt-4">
            <SpendingDonut
              categories={budget?.categories?.filter((c) => c.spent > 0) || []}
              symbol={sym}
            />
          </div>
        </div>

        {/* Cash Flow Waterfall — spans 2 columns on lg */}
        <div className={`${glassCard} animate-fade-in stagger-3 lg:col-span-2`}>
          <div className="p-7 pb-0">
            <h3 className="text-lg font-semibold">{t('cashFlow')}</h3>
          </div>
          <div className="p-7 pt-4">
            <CashFlowChart
              categories={budget?.categories || []}
              income={monthlyIncome}
              symbol={sym}
            />
          </div>
        </div>

        {/* Spending Heatmap */}
        <div className={`${glassCard} animate-fade-in stagger-4`}>
          <div className="p-7 pb-0">
            <h3 className="text-lg font-semibold">{t('spendingHeatmap')}</h3>
          </div>
          <div className="p-7 pt-4">
            {heatmapTx ? (
              <SpendingHeatmap transactions={heatmapTx.transactions} />
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className={`${glassCard} animate-fade-in stagger-5`}>
        <div className="p-7 pb-0 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('recentTransactions')}</h3>
          <Link href="/transactions" className="text-sm text-primary hover:underline">
            {t('viewAll')}
          </Link>
        </div>
        <div className="p-7 pt-4">
          {!recentTx ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : recentTx.transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {t('noTransactions')}{' '}
              <Link href="/transactions" className="text-primary hover:underline">
                {t('addFirst')}
              </Link>
            </p>
          ) : (
            <div className="space-y-1">
              {recentTx.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tx.category_color || '#94a3b8' }}
                    />
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {tx.description || tx.category_name || 'Uncategorized'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, sym)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
