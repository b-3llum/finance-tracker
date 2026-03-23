'use client'

import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, getMonthStart, getMonthEnd } from '@/lib/utils'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { BalanceChart } from '@/components/dashboard/balance-chart'
import { SpendingDonut } from '@/components/dashboard/spending-donut'
import Link from 'next/link'

interface Account {
  current_balance: number
  name: string
}

interface TransactionsResponse {
  transactions: any[]
  total: number
}

interface BudgetResponse {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  categories: any[]
}

export default function DashboardPage() {
  const { data: account } = useApi<Account>('/api/accounts')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')

  const monthStart = getMonthStart()
  const monthEnd = getMonthEnd()

  const { data: incomeData } = useApi<TransactionsResponse>(
    `/api/transactions?type=income&from=${monthStart}&to=${monthEnd}&limit=1000`
  )
  const { data: expenseData } = useApi<TransactionsResponse>(
    `/api/transactions?type=expense&from=${monthStart}&to=${monthEnd}&limit=1000`
  )
  const { data: recentTx } = useApi<TransactionsResponse>('/api/transactions?limit=8')
  const { data: budget } = useApi<BudgetResponse>('/api/budget')
  const { data: goals } = useApi<any[]>('/api/savings')

  const sym = settings?.currency_symbol || '$'
  const monthlyIncome = incomeData?.transactions.reduce((s, t) => s + t.amount, 0) || 0
  const monthlyExpenses = expenseData?.transactions.reduce((s, t) => s + t.amount, 0) || 0
  const netSavings = monthlyIncome - monthlyExpenses

  const activeGoals = goals?.filter((g: any) => g.status === 'active') || []
  const totalSaved = activeGoals.reduce((s: number, g: any) => s + g.current_amount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(account?.current_balance || 0, sym)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {formatCurrency(monthlyIncome, sym)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-bold mt-1 text-red-500">
                  {formatCurrency(monthlyExpenses, sym)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Savings Goals</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {formatCurrency(totalSaved, sym)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net savings indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Net this month</span>
            <div className="flex items-center gap-2">
              <Badge variant={netSavings >= 0 ? 'success' : 'destructive'}>
                {netSavings >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {formatCurrency(netSavings, sym)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Balance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceChart symbol={sym} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingDonut
              categories={budget?.categories?.filter((c: any) => c.spent > 0) || []}
              symbol={sym}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Link href="/transactions" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentTx?.transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No transactions yet. <Link href="/transactions" className="text-primary hover:underline">Add your first one</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentTx?.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tx.category_color || '#94a3b8' }}
                    />
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.category_name || 'Uncategorized'}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, sym)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Goals Summary */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Savings Goals</CardTitle>
            <Link href="/savings" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGoals.slice(0, 3).map((goal: any) => {
                const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{goal.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(goal.current_amount, sym)} / {formatCurrency(goal.target_amount, sym)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
