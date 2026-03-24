import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserId } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface MonthlySpending {
  month: string
  total: number
}

interface CategorySpending {
  category_id: number
  name: string
  total: number
}

interface PayCycleDay {
  day: number
  total: number
  count: number
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    const db = getDb()

    // Check for cached profile
    const cached = db.prepare(`
      SELECT *, (julianday('now') - julianday(computed_at)) * 24 as hours_old
      FROM intelligence_profiles WHERE user_id = ?
    `).get(userId) as any | undefined

    if (cached && cached.hours_old < 24) {
      // Check if fewer than 5 new transactions since last computation
      const newTxCount = db.prepare(`
        SELECT COUNT(*) as count FROM transactions
        WHERE user_id = ? AND created_at > ?
      `).get(userId, cached.computed_at) as { count: number }

      if (newTxCount.count < 5) {
        return NextResponse.json({
          health_score: cached.health_score,
          personality_type: cached.personality_type,
          burn_rate: {
            daily: cached.burn_rate_daily,
            weekly: Math.round(cached.burn_rate_daily * 7 * 100) / 100,
            monthly: cached.burn_rate_monthly,
            trend: cached.burn_rate_trend,
          },
          impulse_score: cached.impulse_score,
          subscription_burden: cached.subscription_burden,
          savings_rate: cached.savings_rate,
          category_fingerprint: JSON.parse(cached.category_fingerprint || '{}'),
          pay_cycle: JSON.parse(cached.pay_cycle_data || '{}'),
          cached: true,
        })
      }
    }

    const account = db.prepare('SELECT id, current_balance FROM accounts WHERE user_id = ? LIMIT 1').get(userId) as { id: number; current_balance: number } | undefined
    if (!account) {
      return NextResponse.json({ error: 'No account found for user' }, { status: 404 })
    }

    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]

    // ── 1. Burn Rate ──
    const monthlySpending = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ?
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month
    `).all(userId, threeMonthsAgoStr) as MonthlySpending[]

    const totalExpense3m = monthlySpending.reduce((s, m) => s + m.total, 0)
    const monthCount = Math.max(monthlySpending.length, 1)
    const burnRateMonthly = Math.round((totalExpense3m / monthCount) * 100) / 100
    const burnRateDaily = Math.round((burnRateMonthly / 30) * 100) / 100

    // Trend: compare most recent month to average of prior months
    let burnRateTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (monthlySpending.length >= 2) {
      const recent = monthlySpending[monthlySpending.length - 1].total
      const priorAvg = monthlySpending.slice(0, -1).reduce((s, m) => s + m.total, 0) / (monthlySpending.length - 1)
      if (recent > priorAvg * 1.1) burnRateTrend = 'increasing'
      else if (recent < priorAvg * 0.9) burnRateTrend = 'decreasing'
    }

    // ── 2. Pay-Cycle Analysis ──
    const payCycleRaw = db.prepare(`
      SELECT CAST(strftime('%d', date) AS INTEGER) as day,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ?
      GROUP BY strftime('%d', date)
      ORDER BY day
    `).all(userId, threeMonthsAgoStr) as PayCycleDay[]

    const avgDailySpend = payCycleRaw.length > 0
      ? payCycleRaw.reduce((s, d) => s + d.total, 0) / payCycleRaw.length
      : 0
    const spikeDays = payCycleRaw
      .filter(d => d.total > avgDailySpend * 1.5)
      .map(d => ({ day: d.day, amount: Math.round(d.total * 100) / 100 }))

    const payCycleData = {
      daily_distribution: payCycleRaw.map(d => ({
        day: d.day,
        avg_spending: Math.round((d.total / monthCount) * 100) / 100,
        transaction_count: d.count,
      })),
      spike_days: spikeDays,
    }

    // ── 3. Category Fingerprint ──
    const categorySpending = db.prepare(`
      SELECT c.id as category_id, c.name, COALESCE(SUM(t.amount), 0) as total
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = ? AND t.type = 'expense' AND t.date >= ?
      WHERE c.type = 'expense' AND (c.user_id IS NULL OR c.user_id = ?)
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `).all(userId, threeMonthsAgoStr, userId) as CategorySpending[]

    const totalCategorySpend = categorySpending.reduce((s, c) => s + c.total, 0)
    const categoryFingerprint: Record<string, { amount: number; percent: number }> = {}
    for (const cat of categorySpending) {
      const pct = totalCategorySpend > 0 ? Math.round((cat.total / totalCategorySpend) * 1000) / 10 : 0
      categoryFingerprint[cat.name] = {
        amount: Math.round((cat.total / monthCount) * 100) / 100,
        percent: pct,
      }
    }

    // 50/30/20 comparison: needs (50), wants (30), savings (20)
    const monthlyIncome = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) / ? as avg
      FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ?
    `).get(monthCount, userId, threeMonthsAgoStr) as { avg: number }

    const idealNeeds = (monthlyIncome.avg || 0) * 0.5
    const idealWants = (monthlyIncome.avg || 0) * 0.3
    const idealSavings = (monthlyIncome.avg || 0) * 0.2

    const rule503020 = {
      income: Math.round((monthlyIncome.avg || 0) * 100) / 100,
      ideal: { needs: Math.round(idealNeeds * 100) / 100, wants: Math.round(idealWants * 100) / 100, savings: Math.round(idealSavings * 100) / 100 },
      actual_spending: burnRateMonthly,
    }

    // ── 4. Impulse Score ──
    const totalSmallTx = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'expense' AND amount < 20 AND date >= ?
    `).get(userId, threeMonthsAgoStr) as { count: number }

    const totalTx = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE user_id = ? AND type = 'expense' AND date >= ?
    `).get(userId, threeMonthsAgoStr) as { count: number }

    const impulseRatio = totalTx.count > 0 ? totalSmallTx.count / totalTx.count : 0
    // Scale: high frequency of small transactions = higher impulse score
    const impulseScore = Math.min(100, Math.round(impulseRatio * 120))

    // ── 5. Subscription Burden ──
    const recurringExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'expense' AND recurring = 1
    `).get(userId) as { total: number }

    const billsTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM bills
      WHERE user_id = ? AND status = 'active' AND frequency = 'monthly'
    `).get(userId) as { total: number }

    const monthlyRecurring = recurringExpenses.total + billsTotal.total
    const subscriptionBurden = monthlyIncome.avg > 0
      ? Math.round((monthlyRecurring / monthlyIncome.avg) * 1000) / 10
      : 0

    // ── 6. Financial Health Score ──
    // Savings rate
    const monthlySavings = monthlyIncome.avg - burnRateMonthly
    const savingsRate = monthlyIncome.avg > 0
      ? Math.max(0, Math.round((monthlySavings / monthlyIncome.avg) * 1000) / 10)
      : 0
    const savingsRateScore = Math.min(100, savingsRate * 2.5) // 40% savings = 100

    // Debt-to-income
    const totalDebt = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as total FROM debts
      WHERE user_id = ? AND status = 'active'
    `).get(userId) as { total: number }

    const totalMonthlyDebtPayments = db.prepare(`
      SELECT COALESCE(SUM(minimum_payment), 0) as total FROM debts
      WHERE user_id = ? AND status = 'active'
    `).get(userId) as { total: number }

    const dtiRatio = monthlyIncome.avg > 0 ? totalMonthlyDebtPayments.total / monthlyIncome.avg : 0
    const dtiScore = Math.max(0, Math.min(100, 100 - (dtiRatio * 250))) // 0% DTI = 100, 40% = 0

    // Emergency fund coverage (months of expenses covered by savings goals)
    const totalSavings = db.prepare(`
      SELECT COALESCE(SUM(current_amount), 0) as total FROM savings_goals
      WHERE user_id = ? AND status = 'active'
    `).get(userId) as { total: number }

    const emergencyMonths = burnRateMonthly > 0 ? totalSavings.total / burnRateMonthly : 0
    const emergencyScore = Math.min(100, emergencyMonths * (100 / 6)) // 6 months = 100

    // Budget adherence
    const budgetData = db.prepare(`
      SELECT
        COALESCE(SUM(c.budget_amount), 0) as total_budget,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(t2.amount), 0) FROM transactions t2
           WHERE t2.category_id = c.id AND t2.user_id = ? AND t2.type = 'expense' AND t2.date >= ?)
        ), 0) as total_spent
      FROM categories c
      WHERE c.type = 'expense' AND c.budget_amount > 0 AND (c.user_id IS NULL OR c.user_id = ?)
    `).get(userId, oneMonthAgoStr, userId) as { total_budget: number; total_spent: number }

    let budgetAdherence = 100
    if (budgetData.total_budget > 0) {
      const overBudget = Math.max(0, budgetData.total_spent - budgetData.total_budget)
      budgetAdherence = Math.max(0, Math.min(100, 100 - (overBudget / budgetData.total_budget) * 100))
    }

    // Spending trend score
    const trendScore = burnRateTrend === 'decreasing' ? 80 : burnRateTrend === 'stable' ? 60 : 30

    // Subscription burden score (lower burden = higher score)
    const subBurdenScore = Math.max(0, Math.min(100, 100 - subscriptionBurden * 2))

    const healthScore = Math.round(
      savingsRateScore * 0.25 +
      dtiScore * 0.20 +
      emergencyScore * 0.20 +
      budgetAdherence * 0.15 +
      trendScore * 0.10 +
      subBurdenScore * 0.10
    )

    // ── 7. Personality Type ──
    const hasActiveDebts = totalDebt.total > 0
    const makingDebtPayments = totalMonthlyDebtPayments.total > 0

    let personalityType: string
    if (hasActiveDebts && makingDebtPayments && dtiRatio > 0.2) {
      personalityType = 'Debt Fighter'
    } else if (healthScore >= 80) {
      personalityType = 'Strategic Saver'
    } else if (healthScore >= 60) {
      personalityType = 'Balanced Manager'
    } else if (healthScore >= 40) {
      personalityType = 'Lifestyle Spender'
    } else {
      personalityType = 'At Risk'
    }

    // ── Store results ──
    db.prepare(`
      INSERT INTO intelligence_profiles
        (user_id, health_score, personality_type, burn_rate_daily, burn_rate_monthly,
         burn_rate_trend, impulse_score, subscription_burden, savings_rate,
         category_fingerprint, pay_cycle_data, computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        health_score = excluded.health_score,
        personality_type = excluded.personality_type,
        burn_rate_daily = excluded.burn_rate_daily,
        burn_rate_monthly = excluded.burn_rate_monthly,
        burn_rate_trend = excluded.burn_rate_trend,
        impulse_score = excluded.impulse_score,
        subscription_burden = excluded.subscription_burden,
        savings_rate = excluded.savings_rate,
        category_fingerprint = excluded.category_fingerprint,
        pay_cycle_data = excluded.pay_cycle_data,
        computed_at = excluded.computed_at
    `).run(
      userId, healthScore, personalityType, burnRateDaily, burnRateMonthly,
      burnRateTrend, impulseScore, subscriptionBurden, savingsRate,
      JSON.stringify(categoryFingerprint), JSON.stringify(payCycleData)
    )

    return NextResponse.json({
      health_score: healthScore,
      personality_type: personalityType,
      burn_rate: {
        daily: burnRateDaily,
        weekly: Math.round(burnRateDaily * 7 * 100) / 100,
        monthly: burnRateMonthly,
        trend: burnRateTrend,
      },
      impulse_score: impulseScore,
      subscription_burden: subscriptionBurden,
      savings_rate: savingsRate,
      category_fingerprint: categoryFingerprint,
      pay_cycle: payCycleData,
      rule_503020: rule503020,
      health_breakdown: {
        savings_rate: { score: Math.round(savingsRateScore), weight: 25 },
        debt_to_income: { score: Math.round(dtiScore), weight: 20, ratio: Math.round(dtiRatio * 1000) / 10 },
        emergency_fund: { score: Math.round(emergencyScore), weight: 20, months_covered: Math.round(emergencyMonths * 10) / 10 },
        budget_adherence: { score: Math.round(budgetAdherence), weight: 15 },
        spending_trend: { score: trendScore, weight: 10, direction: burnRateTrend },
        subscription_burden: { score: Math.round(subBurdenScore), weight: 10, percent: subscriptionBurden },
      },
      cached: false,
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/intelligence/profile')
  }
}
