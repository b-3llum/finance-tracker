'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Category {
  name: string
  spent: number
  color: string
}

export function SpendingDonut({ categories, symbol }: { categories: Category[]; symbol: string }) {
  if (categories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        No expenses this month yet.
      </div>
    )
  }

  const total = categories.reduce((s, c) => s + c.spent, 0)

  return (
    <div className="h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categories}
            dataKey="spent"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {categories.map((cat, i) => (
              <Cell key={i} fill={cat.color || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value), symbol), String(name)]}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold">{formatCurrency(total, symbol)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        {categories.slice(0, 6).map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-muted-foreground">{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
