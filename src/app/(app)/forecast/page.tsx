'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight, AlertTriangle, Minus, Target } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { ForecastData } from '@/lib/types'

const MONTH_OPTIONS = [
  { value: '1', label: '1M' },
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '1Y' },
]

export default function ForecastPage() {
  const [months, setMonths] = useState('3')
  const { data } = useApi<ForecastData>(`/api/forecast?months=${months}`)
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const sym = settings?.currency_symbol || '$'

  const chartData = data?.dates.map((d, i) => ({
    date: formatDateShort(d),
    balance: data.projected_balance[i],
  })) || []

  const startBalance = chartData[0]?.balance || 0
  const endBalance = chartData[chartData.length - 1]?.balance || 0
  const change = endBalance - startBalance
  const changePct = startBalance !== 0 ? Math.round((change / Math.abs(startBalance)) * 100) : 0
  const minBalance = Math.min(...(data?.projected_balance || [0]))
  const goesNegative = minBalance < 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
          <p className="text-muted-foreground">See where your money is heading</p>
        </div>
        {/* Time Range Selector */}
        <div className="flex items-center bg-muted rounded-xl p-1 gap-0.5">
          {MONTH_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={months === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-3 text-xs font-medium rounded-lg ${months === opt.value ? '' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setMonths(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="animate-count-up">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${endBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Target className={`h-5 w-5 ${endBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projected Balance</p>
                <p className={`text-lg font-bold ${endBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(endBalance, sym)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-count-up stagger-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${change >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {change >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Change</p>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {change >= 0 ? '+' : ''}{formatCurrency(change, sym)}
                  </p>
                  {changePct !== 0 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${change >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {change >= 0 ? '+' : ''}{changePct}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`animate-count-up stagger-2 ${goesNegative ? 'ring-2 ring-red-500/20' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${goesNegative ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'}`}>
                {goesNegative ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lowest Point</p>
                <p className={`text-lg font-bold ${goesNegative ? 'text-red-500' : ''}`}>
                  {formatCurrency(minBalance, sym)}
                </p>
                {goesNegative && <p className="text-[10px] text-red-500 font-medium">Negative balance projected</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Balance Projection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={endBalance >= startBalance ? '#22c55e' : '#ef4444'} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={endBalance >= startBalance ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 || v <= -1000 ? `${sym}${(v/1000).toFixed(0)}k` : `${sym}${v}`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, sym), 'Balance']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                {goesNegative && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />}
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={endBalance >= startBalance ? '#22c55e' : '#ef4444'}
                  strokeWidth={2.5}
                  fill="url(#balanceGrad)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-16 text-center">
              <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Add recurring transactions or bills to see your forecast.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-count-up stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              Expected Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.income_events?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recurring income detected</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {data.income_events.slice(0, 12).map((e, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 px-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-14 shrink-0">{formatDateShort(e.date)}</span>
                      <span className="text-sm truncate">{e.label}</span>
                    </div>
                    <span className="text-emerald-600 font-semibold tabular-nums shrink-0">+{formatCurrency(e.amount, sym)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-count-up stagger-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              </div>
              Expected Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.expense_events?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recurring expenses detected</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {data.expense_events.slice(0, 12).map((e, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 px-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-14 shrink-0">{formatDateShort(e.date)}</span>
                      <span className="text-sm truncate">{e.label}</span>
                    </div>
                    <span className="text-red-500 font-semibold tabular-nums shrink-0">-{formatCurrency(e.amount, sym)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
