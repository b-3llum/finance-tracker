'use client'

import { useState } from 'react'
import { useApi, apiPost } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, RefreshCw, Brain, TrendingUp, TrendingDown } from 'lucide-react'
import type { Report, WeeklyReportData, MonthlyReportData } from '@/lib/types'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Legend,
} from 'recharts'

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

export default function ReportsPage() {
  const { data: reports, refetch } = useApi<Report[]>('/api/reports')
  const { data: settings } = useApi<Record<string, string>>('/api/settings')
  const [generating, setGenerating] = useState('')
  const [viewReport, setViewReport] = useState<Report | null>(null)

  const sym = settings?.currency_symbol || '$'

  async function generateReport(type: 'weekly' | 'monthly') {
    setGenerating(type)
    try {
      const report = await apiPost<Report>('/api/reports', { type })
      refetch()
      setViewReport(report)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGenerating('')
    }
  }

  async function viewReportDetail(id: number) {
    try {
      const res = await fetch(`/api/reports/${id}`)
      const report = await res.json()
      setViewReport(report)
    } catch (e: any) {
      alert(e.message)
    }
  }

  const reportData: WeeklyReportData | null = viewReport?.data ? JSON.parse(viewReport.data) : null
  const monthlyData = viewReport?.type === 'monthly' ? reportData as MonthlyReportData | null : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Weekly and monthly financial summaries</p>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Weekly Report</h3>
                <p className="text-sm text-muted-foreground">Current week summary</p>
              </div>
              <Button onClick={() => generateReport('weekly')} disabled={!!generating}>
                {generating === 'weekly' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Monthly Report</h3>
                <p className="text-sm text-muted-foreground">Current month summary</p>
              </div>
              <Button onClick={() => generateReport('monthly')} disabled={!!generating}>
                {generating === 'monthly' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Detail View */}
      {viewReport && reportData && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {viewReport.type === 'weekly' ? 'Weekly' : 'Monthly'} Report
                  </CardTitle>
                  <CardDescription>
                    {formatDate(reportData.period.start)} - {formatDate(reportData.period.end)}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setViewReport(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Opening</p>
                  <p className="text-lg font-bold">{formatCurrency(reportData.opening_balance, sym)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-lg font-bold text-emerald-600">+{formatCurrency(reportData.total_income, sym)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold text-red-500">-{formatCurrency(reportData.total_expenses, sym)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Closing</p>
                  <p className="text-lg font-bold">{formatCurrency(reportData.closing_balance, sym)}</p>
                </div>
              </div>

              {/* Net Change Banner */}
              <div className={`flex items-center gap-2 rounded-lg p-3 ${
                reportData.net_change >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
              }`}>
                {reportData.net_change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="font-semibold">
                  Net Change: {reportData.net_change >= 0 ? '+' : ''}{formatCurrency(reportData.net_change, sym)}
                </span>
                <span className="text-sm opacity-75">
                  ({reportData.transactions_count} transactions)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income vs Expenses Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Income', value: reportData.total_income, fill: '#22c55e' },
                      { name: 'Expenses', value: reportData.total_expenses, fill: '#ef4444' },
                      { name: 'Net', value: Math.abs(reportData.net_change), fill: reportData.net_change >= 0 ? '#3b82f6' : '#f59e0b' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${sym}${v}`} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value), sym), '']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[
                          { fill: '#22c55e' },
                          { fill: '#ef4444' },
                          { fill: reportData.net_change >= 0 ? '#3b82f6' : '#f59e0b' },
                        ].map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Spending Breakdown Donut */}
            {reportData.top_expense_categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spending Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.top_expense_categories.map((cat, i) => ({
                            name: cat.name,
                            value: cat.amount,
                            fill: CHART_COLORS[i % CHART_COLORS.length],
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {reportData.top_expense_categories.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCurrency(Number(value), sym), '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Budget Adherence Chart */}
          {reportData.budget_adherence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget Adherence</CardTitle>
                <CardDescription>Actual spending vs budgeted amount per category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData.budget_adherence.map(b => ({
                        category: b.category,
                        Budgeted: b.budgeted,
                        Actual: b.actual,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${sym}${v}`} />
                      <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value), sym), '']} />
                      <Legend />
                      <Bar dataKey="Budgeted" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                      <Bar dataKey="Actual" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly-only: Income Sources + Savings Progress */}
          {monthlyData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Income by Source */}
              {monthlyData.income_by_source && monthlyData.income_by_source.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Income Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={monthlyData.income_by_source.map((s, i) => ({
                              name: s.source,
                              value: s.amount,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {monthlyData.income_by_source.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [formatCurrency(Number(value), sym), '']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Savings Goal Progress */}
              {monthlyData.savings_goal_progress && monthlyData.savings_goal_progress.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Savings Goal Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyData.savings_goal_progress.map(g => ({
                            name: g.name,
                            Current: g.current,
                            Remaining: Math.max(0, g.target - g.current),
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${sym}${v}`} />
                          <Tooltip formatter={(value) => [formatCurrency(Number(value), sym), '']} />
                          <Legend />
                          <Bar dataKey="Current" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="Remaining" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Savings Contributions */}
          {reportData.savings_contributions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Savings Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportData.savings_contributions.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{c.goal}</span>
                      <span className="font-medium text-emerald-600">+{formatCurrency(c.amount, sym)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {viewReport.ai_insights && (
            <Card>
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">AI Insights</h4>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewReport.ai_insights}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No reports generated yet. Click a generate button above.
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((report: any) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => viewReportDetail(report.id)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium capitalize">{report.type} Report</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(report.period_start)} - {formatDate(report.period_end)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.ai_insights && <Brain className="h-3 w-3 text-primary" />}
                    <span className="text-xs text-muted-foreground">{formatDate(report.created_at.split('T')[0])}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
