export const SYSTEM_FINANCIAL_ADVISOR = `You are a personal financial advisor AI. You analyze spending data and provide actionable, specific advice. Be direct and practical. Format your responses clearly with bullet points. Never recommend specific investment products. Focus on budgeting, spending optimization, and savings strategies. Always respond in valid JSON when asked.`

export function buildOptimizationPrompt(data: {
  income: number
  expenses: { category: string; amount: number; budget: number }[]
  savings_goals: { name: string; target: number; current: number; deadline: string }[]
  month: string
}): string {
  return `Analyze this monthly financial data and provide spending optimization suggestions.

Monthly Income: $${data.income.toFixed(2)}
Month: ${data.month}

Spending by Category:
${data.expenses.map(e => `- ${e.category}: $${e.amount.toFixed(2)} (budget: $${e.budget.toFixed(2)})`).join('\n')}

Savings Goals:
${data.savings_goals.map(g => `- ${g.name}: $${g.current.toFixed(2)}/$${g.target.toFixed(2)} (deadline: ${g.deadline})`).join('\n')}

Respond with valid JSON in this exact format:
{
  "suggestions": [
    {
      "category": "category name",
      "current_spending": number,
      "suggested_spending": number,
      "savings": number,
      "advice": "specific actionable advice"
    }
  ],
  "potential_monthly_savings": number,
  "priority_actions": ["action 1", "action 2", "action 3"],
  "overall_assessment": "brief 2-3 sentence assessment"
}`
}

export function buildProfilePrompt(data: {
  days: number
  total_income: number
  total_expenses: number
  category_breakdown: { category: string; total: number; count: number; avg_per_transaction: number }[]
  day_of_week_spending: { day: string; amount: number }[]
  recurring_expenses: number
  one_time_expenses: number
}): string {
  return `Analyze ${data.days} days of spending data and build a financial personality profile.

Total Income: $${data.total_income.toFixed(2)}
Total Expenses: $${data.total_expenses.toFixed(2)}
Net: $${(data.total_income - data.total_expenses).toFixed(2)}
Savings Rate: ${((1 - data.total_expenses / data.total_income) * 100).toFixed(1)}%

Spending by Category:
${data.category_breakdown.map(c => `- ${c.category}: $${c.total.toFixed(2)} (${c.count} transactions, avg $${c.avg_per_transaction.toFixed(2)})`).join('\n')}

Spending by Day of Week:
${data.day_of_week_spending.map(d => `- ${d.day}: $${d.amount.toFixed(2)}`).join('\n')}

Recurring Expenses: $${data.recurring_expenses.toFixed(2)}
One-time Expenses: $${data.one_time_expenses.toFixed(2)}

Respond with valid JSON in this exact format:
{
  "personality_type": "a descriptive type name (e.g., 'The Mindful Saver', 'The Social Spender')",
  "description": "2-3 sentence personality description",
  "good_habits": ["habit 1", "habit 2", "habit 3"],
  "bad_habits": ["habit 1", "habit 2", "habit 3"],
  "risk_factors": ["risk 1", "risk 2"],
  "recommended_budget": [
    {"category": "category name", "amount": number}
  ],
  "tips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
}`
}

export function buildReportInsightsPrompt(data: {
  type: 'weekly' | 'monthly'
  period: string
  income: number
  expenses: number
  net: number
  top_categories: { name: string; amount: number }[]
  budget_status: { category: string; percent: number }[]
  savings_progress: { name: string; percent: number }[]
}): string {
  return `Write a brief, insightful ${data.type} financial summary for ${data.period}.

Income: $${data.income.toFixed(2)}
Expenses: $${data.expenses.toFixed(2)}
Net: $${data.net.toFixed(2)}

Top Spending Categories:
${data.top_categories.map(c => `- ${c.name}: $${c.amount.toFixed(2)}`).join('\n')}

Budget Adherence:
${data.budget_status.map(b => `- ${b.category}: ${b.percent}% of budget used`).join('\n')}

Savings Progress:
${data.savings_progress.map(s => `- ${s.name}: ${s.percent}% complete`).join('\n')}

Write 3 short paragraphs:
1. What went well this ${data.type === 'weekly' ? 'week' : 'month'}
2. What needs attention
3. One specific action item for next ${data.type === 'weekly' ? 'week' : 'month'}

Keep it conversational and encouraging. Do not use JSON format for this response.`
}

export function buildChatPrompt(question: string, context: {
  balance: number
  monthly_income: number
  monthly_expenses: number
  savings_goals: { name: string; target: number; current: number }[]
}): string {
  return `The user has a financial question. Here is their current financial context:

Current Balance: $${context.balance.toFixed(2)}
Monthly Income: $${context.monthly_income.toFixed(2)}
Monthly Expenses: $${context.monthly_expenses.toFixed(2)}
Savings Goals:
${context.savings_goals.map(g => `- ${g.name}: $${g.current.toFixed(2)}/$${g.target.toFixed(2)}`).join('\n')}

User's Question: ${question}

Provide a helpful, specific answer based on their financial situation. Be concise and actionable.`
}
