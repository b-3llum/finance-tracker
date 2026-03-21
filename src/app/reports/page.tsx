'use client'

import { useState } from 'react'
import { useApi, apiPost } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Calendar, Download, RefreshCw, Brain } from 'lucide-react'
import type { Report, WeeklyReportData } from '@/lib/types'

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
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Opening</p>
                <p className="text-lg font-bold">{formatCurrency(reportData.opening_balance, sym)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold text-emerald-600">+{formatCurrency(reportData.total_income, sym)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-red-500">-{formatCurrency(reportData.total_expenses, sym)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Closing</p>
                <p className="text-lg font-bold">{formatCurrency(reportData.closing_balance, sym)}</p>
              </div>
            </div>

            {/* Top Categories */}
            {reportData.top_expense_categories.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Top Expense Categories</h4>
                <div className="space-y-2">
                  {reportData.top_expense_categories.map((cat, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{cat.name}</span>
                      <span className="font-medium">{formatCurrency(cat.amount, sym)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget Adherence */}
            {reportData.budget_adherence.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Budget Adherence</h4>
                <div className="space-y-2">
                  {reportData.budget_adherence.map((b, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{b.category}</span>
                      <Badge variant={b.percent > 100 ? 'destructive' : b.percent > 75 ? 'warning' : 'success'}>
                        {b.percent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {viewReport.ai_insights && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">AI Insights</h4>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewReport.ai_insights}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
