"use client";

import React from "react";
import Link from "next/link";
import {
  Wallet,
  Brain,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Target,
  Upload,
  ShieldCheck,
  Sparkles,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { TextReveal } from "@/components/ui/text-reveal";
import { FloatingCard } from "@/components/ui/floating-cards";
import { AnimatedCounter } from "@/components/ui/animated-counter";

/* -------------------------------------------------------------------------- */
/*  Fake Dashboard (inside the 3D scroll card)                                */
/* -------------------------------------------------------------------------- */
function DashboardMockup() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 md:p-6">
      {/* Top row — stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { label: "Balance", value: "$24,812", color: "from-indigo-500 to-violet-500" },
          { label: "Income", value: "$8,430", color: "from-emerald-500 to-teal-500" },
          { label: "Expenses", value: "$3,219", color: "from-orange-500 to-amber-500" },
          { label: "Savings", value: "$5,211", color: "from-pink-500 to-rose-500" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {c.label}
            </p>
            <p
              className={`mt-1 bg-gradient-to-r ${c.color} bg-clip-text text-lg font-bold text-transparent md:text-xl`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="flex flex-1 gap-4">
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Spending Trend
          </p>
          <div className="flex h-full items-end gap-[6px] pb-8">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Side mini-cards */}
        <div className="hidden w-40 flex-col gap-3 md:flex">
          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Health Score
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-500">A+</p>
          </div>
          <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              AI Insight
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              You can save $320/mo by optimizing subscriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features data                                                              */
/* -------------------------------------------------------------------------- */
const features = [
  {
    icon: Sparkles,
    title: "Smart Categorization",
    description: "AI auto-tags every transaction so you never lift a finger.",
  },
  {
    icon: BarChart3,
    title: "Spending DNA",
    description: "Discover your unique spending fingerprint across every category.",
  },
  {
    icon: TrendingUp,
    title: "Cash Flow Forecast",
    description: "Predict upcoming balances with machine-learning projections.",
  },
  {
    icon: CreditCard,
    title: "Debt Tracker",
    description: "Visualize payoff timelines and optimize your repayment strategy.",
  },
  {
    icon: Brain,
    title: "AI Insights",
    description: "Receive personalized recommendations to grow your wealth.",
  },
  {
    icon: PiggyBank,
    title: "Net Worth",
    description: "Track assets and liabilities in one real-time dashboard.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Steps data                                                                 */
/* -------------------------------------------------------------------------- */
const steps = [
  {
    icon: Upload,
    title: "Import your bank data",
    description:
      "Securely connect accounts or upload CSV statements in seconds.",
  },
  {
    icon: Brain,
    title: "AI analyzes your patterns",
    description:
      "Our models categorize transactions and detect spending habits automatically.",
  },
  {
    icon: TrendingUp,
    title: "Get predictions & insights",
    description:
      "Receive cash-flow forecasts, health scores, and actionable recommendations.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* ---- ambient background orbs ---- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-500/20 blur-[128px] dark:bg-indigo-500/10" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-500/20 blur-[128px] dark:bg-violet-500/10" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-emerald-500/15 blur-[128px] dark:bg-emerald-500/8" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  NAV                                                                */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-indigo-500" />
            FinTrack
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/*  HERO — ContainerScroll                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center gap-5 px-4">
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Take Control of{" "}
                <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 bg-clip-text text-transparent">
                  Your Money
                </span>
              </h1>
              <p className="max-w-xl text-base text-zinc-500 dark:text-zinc-400 md:text-lg">
                AI-powered spending analysis, predictions, and financial health
                scoring — all in one beautiful dashboard.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Sign In
                </Link>
              </div>
            </div>
          }
        >
          <DashboardMockup />
        </ContainerScroll>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FEATURES GRID                                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <TextReveal className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              master your finances
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-500 dark:text-zinc-400">
            Six powerful tools working together to give you complete visibility
            and control over your financial life.
          </p>
        </TextReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FloatingCard
              key={f.title}
              direction={i % 2 === 0 ? "left" : "right"}
              delay={i * 0.08}
              className="group rounded-2xl border border-zinc-200 bg-white/60 p-6 backdrop-blur-sm transition hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-700"
            >
              <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {f.description}
              </p>
            </FloatingCard>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  STATS                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-zinc-200 bg-zinc-50/50 py-24 dark:border-zinc-800 dark:bg-zinc-900/30 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <TextReveal className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Built for the modern saver
            </h2>
          </TextReveal>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: 12, suffix: "+", label: "Financial Tools" },
              { value: 100, suffix: "%", label: "Private & Secure" },
              { value: 0, prefix: "AI", suffix: "", label: "Powered Engine" },
              { value: 0, prefix: "", suffix: "", label: "Dark Mode Ready", text: "Dark Mode" },
            ].map((s, i) => (
              <TextReveal key={s.label} delay={i * 0.1} className="text-center">
                <div className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400 md:text-5xl">
                  {s.text ? (
                    s.text
                  ) : s.prefix ? (
                    s.prefix
                  ) : (
                    <AnimatedCounter
                      value={s.value}
                      suffix={s.suffix}
                      duration={1.8}
                    />
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {s.label}
                </p>
              </TextReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  HOW IT WORKS                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <TextReveal className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Three steps to{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              financial clarity
            </span>
          </h2>
        </TextReveal>

        <div className="relative flex flex-col gap-16">
          {/* Connecting line */}
          <div
            aria-hidden
            className="absolute left-6 top-10 hidden h-[calc(100%-5rem)] w-px bg-gradient-to-b from-indigo-500/40 via-violet-500/40 to-transparent md:left-1/2 md:block"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent, transparent 8px, currentColor 8px, currentColor 16px)",
              color: "oklch(0.65 0.2 265 / 0.3)",
            }}
          />

          {steps.map((step, i) => (
            <TextReveal key={step.title} delay={i * 0.15}>
              <div className="relative flex items-start gap-6 md:items-center">
                {/* Step number bubble */}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
                  {i + 1}
                </div>

                <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-5">
                  <div className="inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </TextReveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  CTA FOOTER                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
          <TextReveal>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
              Start your financial journey today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-indigo-100/80">
              Join thousands of people who have already taken control of their
              money with FinTrack.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-indigo-700 shadow-xl transition hover:bg-indigo-50"
              >
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </TextReveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  FOOTER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-zinc-200 bg-white py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 dark:text-zinc-400 md:flex-row">
          <div className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
            <Wallet className="h-4 w-4 text-indigo-500" />
            FinTrack
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Sign In
            </Link>
            <Link href="/register" className="transition hover:text-zinc-900 dark:hover:text-zinc-100">
              Register
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} FinTrack. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
