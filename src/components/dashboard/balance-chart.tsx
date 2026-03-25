'use client'

import { useApi } from '@/hooks/use-api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function BalanceChart({ symbol }: { symbol: string }) {
  const { data: history, loading } = useApi<any[]>('/api/balance?days=30')

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
  }

  if (!history || history.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No balance history yet. Add some transactions to see your trend.
      </div>
    )
  }

  const chartData = history.map((h: any) => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    balance: h.balance,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${symbol}${v.toLocaleString()}`}
            className="fill-muted-foreground"
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value), symbol), 'Balance']}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--color-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
