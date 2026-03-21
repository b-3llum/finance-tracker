export interface Account {
  id: number
  name: string
  current_balance: number
  created_at: string
  updated_at: string
}

export interface BalanceHistory {
  id: number
  account_id: number
  balance: number
  recorded_at: string
  note: string | null
}

export interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  color: string | null
  icon: string | null
  budget_amount: number | null
  created_at: string
}

export interface Transaction {
  id: number
  account_id: number
  category_id: number | null
  type: 'income' | 'expense'
  amount: number
  description: string | null
  date: string
  recurring: number
  recurring_interval: string | null
  created_at: string
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null
  category_color: string | null
  category_icon: string | null
}

export interface SavingsGoal {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  priority: number
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

export interface SavingsContribution {
  id: number
  goal_id: number
  amount: number
  date: string
  note: string | null
}

export interface Report {
  id: number
  type: 'weekly' | 'monthly'
  period_start: string
  period_end: string
  data: string
  ai_insights: string | null
  created_at: string
}

export interface AIProfile {
  id: number
  profile_data: string
  generated_at: string
  data_days: number
  version: number
}

export interface WeeklyReportData {
  period: { start: string; end: string }
  opening_balance: number
  closing_balance: number
  total_income: number
  total_expenses: number
  net_change: number
  top_expense_categories: { name: string; amount: number; budget: number }[]
  transactions_count: number
  savings_contributions: { goal: string; amount: number }[]
  budget_adherence: { category: string; budgeted: number; actual: number; percent: number }[]
}

export interface MonthlyReportData extends WeeklyReportData {
  income_by_source: { source: string; amount: number }[]
  expense_trend_vs_last_month: number
  savings_goal_progress: { name: string; target: number; current: number; deadline: string }[]
}

export interface SpendingProfile {
  personality_type: string
  description: string
  good_habits: string[]
  bad_habits: string[]
  risk_factors: string[]
  recommended_budget: { category: string; amount: number }[]
  tips: string[]
}

export interface OptimizationSuggestion {
  category: string
  current_spending: number
  suggested_spending: number
  savings: number
  advice: string
}

export interface Settings {
  currency: string
  currency_symbol: string
  ollama_url: string
  ollama_model: string
  notifications_enabled: boolean
  theme: 'system' | 'light' | 'dark'
}
