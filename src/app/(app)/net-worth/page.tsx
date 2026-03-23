'use client'

import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank, ShieldCheck, AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { NetWorthData } from '@/lib/types'

const ASSET_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']
const DEBT_COLORS = ['#ef4444', '#f97316', '#ec4899', '#f43f5e', '#dc2626']

export default function NetWorthPage() {
  const { data } = useApi<NetWorthData>('/api/net-worth')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const sym = settings?.currency_symbol || '$'

  const isPositive = (data?.net_worth || 0) >= 0
  const assetPct = (data?.total_assets || 0) + (data?.total_liabilities || 0) > 0
    ? Math.round(((data?.total_assets || 0) / ((data?.total_assets || 0) + (data?.total_liabilities || 0))) * 100) : 100

  // Chart data
  const chartData = [
    ...(data?.accounts?.map((a, i) => ({ name: a.name, value: Math.max(0, a.balance), color: ASSET_COLORS[i % ASSET_COLORS.length], type: 'asset' })) || []),
    ...(data?.savings?.map((s, i) => ({ name: s.name, value: s.current, color: ASSET_COLORS[(i + 2) % ASSET_COLORS.length], type: 'asset' })) || []),
    ...(data?.debts?.map((d, i) => ({ name: d.name, value: d.balance, color: DEBT_COLORS[i % DEBT_COLORS.length], type: 'debt' })) || []),
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Net Worth</h1>
        <p className="text-muted-foreground">Your complete financial picture</p>
      </div>

      {/* Hero Card */}
      <Card className="overflow-hidden animate-scale-in">
        <CardContent className="p-0">
          <div className={`px-6 py-8 sm:px-8 text-center ${isPositive ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10' : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {isPositive ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
              <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
            </div>
            <p className={`text-4xl sm:text-5xl font-bold tracking-tight animate-count-up ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(data?.net_worth || 0, sym)}
            </p>

            {/* Asset/Debt Bar */}
            <div className="max-w-sm mx-auto mt-6">
              <div className="h-3 rounded-full overflow-hidden flex bg-red-200 dark:bg-red-900/40">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${assetPct}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Assets {formatCurrency(data?.total_assets || 0, sym)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Debts {formatCurrency(data?.total_liabilities || 0, sym)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        {chartData.length > 0 && (
          <Card className="lg:row-span-2">
            <CardHeader><CardTitle className="text-base">Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), sym)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate flex-1">{d.name}</span>
                    <span className={`font-medium tabular-nums ${d.type === 'debt' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {d.type === 'debt' ? '-' : ''}{formatCurrency(d.value, sym)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assets */}
        <Card className="animate-count-up stagger-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!data?.accounts?.length && !data?.savings?.length) ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assets tracked yet</p>
            ) : (
              <div className="space-y-3">
                {data?.accounts?.map((a, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-sm">{a.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(a.balance, sym)}</span>
                  </div>
                ))}
                {data?.savings?.map((s, i) => (
                  <div key={`s-${i}`} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <PiggyBank className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(s.current, sym)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(data?.total_assets || 0, sym)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card className="animate-count-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.debts?.length ? (
              <div className="text-center py-4">
                <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">Debt free!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.debts.map((d, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <span className="text-sm">{d.name}</span>
                        <p className="text-[10px] text-muted-foreground capitalize">{d.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-red-500 tabular-nums">-{formatCurrency(d.balance, sym)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold text-red-500 tabular-nums">-{formatCurrency(data?.total_liabilities || 0, sym)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
