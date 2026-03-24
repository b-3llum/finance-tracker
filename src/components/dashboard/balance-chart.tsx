'use client'

import { useApi } from '@/hooks/use-api'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface BalancePoint {
  recorded_at: string
  balance: number
}

interface BalanceChartProps {
  symbol: string
  emptyMessage?: string
}

export function BalanceChart({ symbol, emptyMessage = 'No balance history yet.' }: BalanceChartProps) {
  const { data: history, loading } = useApi<BalancePoint[]>('/api/balance?days=30')

  if (loading) {
    return (
      <div className="h-72 space-y-3 p-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  const chartData = history.map((h) => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    balance: h.balance,
  }))

  const minBalance = Math.min(...chartData.map((d) => d.balance))
  const maxBalance = Math.max(...chartData.map((d) => d.balance))
  const padding = (maxBalance - minBalance) * 0.1 || 100
  const isPositiveTrend =
    chartData.length >= 2 && chartData[chartData.length - 1].balance >= chartData[0].balance

  const gradientId = 'balanceGradient'
  const strokeColor = isPositiveTrend ? 'var(--color-emerald-500, #10b981)' : 'var(--color-red-500, #ef4444)'
  const gradientStart = isPositiveTrend ? '#10b981' : '#ef4444'

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientStart} stopOpacity={0.3} />
              <stop offset="60%" stopColor={gradientStart} stopOpacity={0.08} />
              <stop offset="100%" stopColor={gradientStart} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="var(--color-foreground)"
            opacity={0.5}
            dy={8}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="var(--color-foreground)"
            opacity={0.5}
            tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? 'k' : ''}`}
            domain={[minBalance - padding, maxBalance + padding]}
            width={54}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-xl border border-border/50 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl px-4 py-3 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(Number(payload[0].value), symbol)}
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={strokeColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: strokeColor,
              stroke: 'var(--color-card)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
