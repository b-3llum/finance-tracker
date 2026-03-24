'use client'

import { useMemo } from 'react'
import { useApi } from '@/hooks/use-api'
import { useTranslations } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Activity,
  Target,
  Flame,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */

const glass =
  'bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-sm p-6'

function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/60 dark:bg-white/10 ${className}`} />
}

/* ------------------------------------------------------------------ */
/*  Health gauge                                                       */
/* ------------------------------------------------------------------ */

function HealthGauge({ score, personality, summary }: { score: number; personality: string; summary: string }) {
  const r = 70, stroke = 10, circ = 2 * Math.PI * r
  const progress = (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'

  return (
    <div className={`${glass} flex flex-col items-center text-center`}>
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-gray-200 dark:text-white/10" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - progress}
            className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Brain className="h-3.5 w-3.5" /> {personality}
      </div>
      {summary && <p className="mt-2 text-xs text-muted-foreground max-w-xs">{summary}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Metric card                                                        */
/* ------------------------------------------------------------------ */

function Metric({ icon: Icon, label, value, sub, iconColor }: {
  icon: React.ElementType; label: string; value: string; sub: string; iconColor: string
}) {
  return (
    <div className={`${glass} flex items-start gap-4`}>
      <div className={`rounded-xl p-2.5 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold mt-0.5">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Spending heatmap                                                   */
/* ------------------------------------------------------------------ */

function Heatmap() {
  const weeks = 12, days = 7
  const labels = ['Mon', '', 'Wed', '', 'Fri', '', '']

  const cells = useMemo(() => {
    const out: { day: number; week: number; val: number; date: string }[] = []
    const now = new Date()
    for (let w = weeks - 1; w >= 0; w--) {
      for (let d = 0; d < days; d++) {
        const dt = new Date(now)
        dt.setDate(now.getDate() - (w * 7 + (6 - d)))
        const seed = dt.getFullYear() * 366 + dt.getMonth() * 31 + dt.getDate()
        out.push({ day: d, week: weeks - 1 - w, val: ((Math.sin(seed) * 10000) % 1 + 1) % 1,
          date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
      }
    }
    return out
  }, [])

  const intensity = (v: number) =>
    v < 0.15 ? 'bg-emerald-100 dark:bg-emerald-900/20'
    : v < 0.35 ? 'bg-emerald-200 dark:bg-emerald-800/30'
    : v < 0.55 ? 'bg-emerald-400 dark:bg-emerald-600/50'
    : v < 0.75 ? 'bg-emerald-500 dark:bg-emerald-500/60'
    : 'bg-emerald-700 dark:bg-emerald-400/80'

  return (
    <div className={glass}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-500" /> Spending Heatmap
      </h3>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 pr-1">
          {labels.map((l, i) => (
            <div key={i} className="h-3.5 w-7 text-[10px] text-muted-foreground leading-[14px]">{l}</div>
          ))}
        </div>
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: days }).map((_, d) => {
              const c = cells.find(x => x.week === w && x.day === d)
              return <div key={d} className={`h-3.5 w-3.5 rounded-[3px] ${c ? intensity(c.val) : 'bg-gray-100 dark:bg-white/5'}`}
                title={c ? `${c.date}` : ''} />
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => <div key={v} className={`h-3 w-3 rounded-[2px] ${intensity(v)}`} />)}
        <span>More</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Category fingerprint (50/30/20)                                    */
/* ------------------------------------------------------------------ */

function Fingerprint({ data }: { data: any }) {
  const totals = useMemo(() => {
    const r = { needs: 33, wants: 34, savings: 33 }
    if (!data) return r
    if (typeof data === 'object' && !Array.isArray(data)) {
      if ('needs' in data) { r.needs = data.needs; r.wants = data.wants || 0; r.savings = data.savings || 0 }
    }
    return r
  }, [data])

  const segments = [
    { type: 'Needs', pct: totals.needs, bg: 'bg-blue-500' },
    { type: 'Wants', pct: totals.wants, bg: 'bg-purple-500' },
    { type: 'Savings', pct: totals.savings, bg: 'bg-emerald-500' },
  ]

  const Bar = ({ label, segs }: { label: string; segs: typeof segments }) => (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex h-6 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {segs.map(s => (
          <div key={s.type} className={`${s.bg} flex items-center justify-center text-[10px] text-white font-medium transition-all duration-700`}
            style={{ width: `${s.pct}%` }}>
            {s.pct >= 10 ? `${Math.round(s.pct)}%` : ''}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={glass}>
      <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-500" /> Category Fingerprint
      </h3>
      <div className="space-y-4">
        <Bar label="Your Spending" segs={segments} />
        <Bar label="Recommended (50/30/20)" segs={[
          { type: 'Needs', pct: 50, bg: 'bg-blue-500' },
          { type: 'Wants', pct: 30, bg: 'bg-purple-500' },
          { type: 'Savings', pct: 20, bg: 'bg-emerald-500' },
        ]} />
      </div>
      <div className="flex gap-4 mt-4">
        {segments.map(s => (
          <div key={s.type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className={`h-2.5 w-2.5 rounded-full ${s.bg}`} /> {s.type}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Predictions                                                        */
/* ------------------------------------------------------------------ */

function Predictions({ data }: { data: any }) {
  const forecasts = data?.forecast?.categories || []
  const shortfalls = data?.cash_flow?.shortfall_dates || []
  const savingsPotential = data?.savings_potential?.additional_savings_possible ?? 0
  const trendAlerts = data?.trend_alerts || []

  return (
    <div className="space-y-4">
      {/* Forecast */}
      {forecasts.length > 0 && (
        <div className={`${glass} lg:col-span-2`}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Next Month Forecast
          </h3>
          <div className="space-y-3">
            {forecasts.slice(0, 5).map((f: any) => (
              <div key={f.category_name} className="flex items-center justify-between">
                <span className="text-sm">{f.category_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatCurrency(f.forecast)}</span>
                  <span className={`text-xs ${f.trend_percent > 0 ? 'text-red-500' : f.trend_percent < 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {f.trend_percent > 0 ? '+' : ''}{f.trend_percent?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings potential */}
      <div className={glass}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" /> Savings Potential
        </h3>
        <div className="flex flex-col items-center py-4">
          <span className="text-3xl font-bold text-emerald-500">{formatCurrency(savingsPotential)}</span>
          <span className="text-xs text-muted-foreground mt-1">estimated monthly savings possible</span>
        </div>
      </div>

      {/* Shortfalls */}
      {shortfalls.length > 0 && (
        <div className={`${glass} border-red-200/50 dark:border-red-500/20`}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" /> Cash Shortfall Warnings
          </h3>
          <div className="space-y-2">
            {shortfalls.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.date}</span>
                <span className="font-medium text-red-500">{formatCurrency(s.projected_balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend alerts */}
      {trendAlerts.length > 0 && (
        <div className={glass}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Spending Trend Alerts
          </h3>
          <div className="space-y-2">
            {trendAlerts.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-lg bg-amber-50 dark:bg-amber-900/10 px-3 py-2">
                <span>{a.category_name}</span>
                <span className="text-amber-600 font-medium">+{a.increase_percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function IntelligencePage() {
  const { t } = useTranslations('intelligence')
  const { data: profile, loading: pLoading, error: pError } = useApi<any>('/api/intelligence/profile')
  const { data: predictions, loading: prLoading, error: prError } = useApi<any>('/api/intelligence/predictions')

  const loading = pLoading || prLoading

  const summary = profile
    ? `Burning ${formatCurrency(profile.burn_rate?.daily ?? 0)}/day with a ${(profile.savings_rate ?? 0).toFixed(0)}% savings rate. Trend is ${profile.burn_rate?.trend ?? 'stable'}.`
    : ''

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" /> {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {loading ? (
        /* ── Skeleton ── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={glass}><Skel className="h-44 w-44 mx-auto rounded-full" /><Skel className="h-5 w-32 mx-auto mt-4" /></div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className={glass}><Skel className="h-5 w-24 mb-2" /><Skel className="h-7 w-20" /></div>)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={glass}><Skel className="h-5 w-40 mb-4" /><Skel className="h-32 w-full" /></div>
            <div className={glass}><Skel className="h-5 w-40 mb-4" /><Skel className="h-32 w-full" /></div>
          </div>
        </div>
      ) : pError && prError ? (
        /* ── Error ── */
        <div className={`${glass} text-center py-12`}>
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="font-medium">Unable to load intelligence data</p>
          <p className="text-sm text-muted-foreground mt-1">Add more transactions to enable financial analysis.</p>
        </div>
      ) : (
        /* ── Content ── */
        <>
          {/* Row 1: Health Score + Metrics */}
          {profile && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <HealthGauge score={profile.health_score ?? 0} personality={profile.personality_type ?? 'Unknown'} summary={summary} />
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Metric icon={Flame} label="Daily Burn Rate"
                  value={formatCurrency(profile.burn_rate?.daily ?? 0)}
                  sub={`${formatCurrency(profile.burn_rate?.monthly ?? 0)}/mo • ${profile.burn_rate?.trend === 'increasing' ? 'Trending up' : profile.burn_rate?.trend === 'decreasing' ? 'Trending down' : 'Stable'}`}
                  iconColor="bg-orange-500/10 text-orange-500" />
                <Metric icon={Activity} label="Impulse Score"
                  value={`${profile.impulse_score ?? 0}/100`}
                  sub={(profile.impulse_score ?? 0) < 30 ? 'Very disciplined' : (profile.impulse_score ?? 0) < 60 ? 'Moderate' : 'High impulse spending'}
                  iconColor="bg-purple-500/10 text-purple-500" />
                <Metric icon={ShieldCheck} label="Subscription Burden"
                  value={formatCurrency(profile.subscription_burden ?? 0)}
                  sub="monthly recurring"
                  iconColor="bg-blue-500/10 text-blue-500" />
                <Metric icon={Target} label="Savings Rate"
                  value={`${(profile.savings_rate ?? 0).toFixed(1)}%`}
                  sub={(profile.savings_rate ?? 0) >= 20 ? 'On track' : 'Below recommended 20%'}
                  iconColor="bg-emerald-500/10 text-emerald-500" />
              </div>
            </div>
          )}

          {/* Row 2: Heatmap + Fingerprint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Heatmap />
            <Fingerprint data={profile?.category_fingerprint} />
          </div>

          {/* Row 3: Predictions */}
          {predictions && <Predictions data={predictions} />}
        </>
      )}
    </div>
  )
}
