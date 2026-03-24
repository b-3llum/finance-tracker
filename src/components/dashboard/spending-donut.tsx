'use client'

import { useState, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Category {
  name: string
  spent: number
  color: string
}

interface SpendingDonutProps {
  categories: Category[]
  symbol: string
  emptyMessage?: string
}

function renderActiveShape(props: any) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
    symbol,
  } = props

  return (
    <g>
      {/* Center label */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground" fontSize={13} fontWeight={600}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground" fontSize={12}>
        {formatCurrency(value, symbol)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        {(percent * 100).toFixed(1)}%
      </text>
      {/* Expanded active slice */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
        cornerRadius={4}
      />
      {/* Inner ring highlight */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 6}
        outerRadius={innerRadius - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  )
}

export function SpendingDonut({ categories, symbol, emptyMessage = 'No expenses this month yet.' }: SpendingDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index)
  }, [])

  const onPieLeave = useCallback(() => {
    setActiveIndex(-1)
  }, [])

  if (categories.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  const total = categories.reduce((s, c) => s + c.spent, 0)

  return (
    <div className="h-72 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categories}
            dataKey="spent"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            cornerRadius={4}
            {...(activeIndex >= 0 ? { activeIndex } : {} as any)}
            activeShape={(props: any) => renderActiveShape({ ...props, symbol })}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {categories.map((cat, i) => (
              <Cell
                key={i}
                fill={cat.color || '#94a3b8'}
                opacity={activeIndex === -1 || activeIndex === i ? 1 : 0.4}
                className="transition-opacity duration-200 cursor-pointer"
                stroke="none"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center total (shown when no slice is active) */}
      {activeIndex === -1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '10%' }}>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold mt-0.5">{formatCurrency(total, symbol)}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
        {categories.slice(0, 8).map((cat, i) => (
          <button
            key={i}
            className="flex items-center gap-1.5 text-xs transition-opacity duration-150 hover:opacity-100"
            style={{ opacity: activeIndex === -1 || activeIndex === i ? 1 : 0.4 }}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(-1)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.color || '#94a3b8' }}
            />
            <span className="text-muted-foreground">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
