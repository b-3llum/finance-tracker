# FinTrack - Personal Finance Tracker

A personal financial tracker web app with AI-powered insights, running locally on your machine.

## Features

- **Balance Tracking** - Set and track your account balance over time
- **Transactions** - Log income and expenses with categories, filters, and recurring transaction support
- **Budget Management** - Set monthly budgets per category with visual progress bars
- **Savings Goals** - Create goals with deadlines, track contributions, see required daily/weekly savings rate
- **Charts** - Balance trend line chart, spending breakdown donut chart
- **AI Insights** (Ollama) - Spending optimization, 60-day profile builder, financial chat assistant
- **Reports** - Auto-generated weekly (Sunday) and monthly reports with AI narrative
- **Dark/Light Mode** - Follows system preference
- **Configurable Currency** - USD, EUR, GBP, and more

## Tech Stack

- **Next.js 15** (App Router + Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **SQLite** (via better-sqlite3)
- **Recharts** for data visualization
- **Ollama** (local LLM for AI features)
- **node-cron** for scheduled reports

## Prerequisites

- Node.js 22+ with npm
- [Ollama](https://ollama.ai) installed and running (for AI features)
- Pull a model: `ollama pull llama3`

## Setup

```bash
# Clone the repo
git clone https://github.com/b-3llum/finance-tracker.git
cd finance-tracker

# Install dependencies
npm install

# Create env file
cp .env.local.example .env.local
# Edit OLLAMA_BASE_URL if needed (default: http://localhost:11434)

# Run development server
npm run dev

# Open http://localhost:3000
```

## First Steps

1. Go to **Settings** and set your current account balance
2. Choose your currency
3. Test your Ollama connection
4. Start adding transactions
5. Set category budgets in the **Budget** page
6. Create savings goals in **Savings**

## Scheduled Reports

The app automatically generates:
- **Weekly Report** - Every Sunday at 8:00 AM
- **Monthly Report** - 1st of each month at 8:00 AM

Reports include AI-generated insights when Ollama is available. Desktop notifications via `notify-send` on Linux.

You can also generate reports manually from the Reports page.

## AI Features

All AI features require Ollama running locally:

- **Spending Profile** - After 14+ days of data, generates a personality profile with good/bad habits
- **Spending Optimization** - Analyzes current month and suggests specific cuts
- **Financial Chat** - Ask questions about your finances with streaming responses
- **Report Insights** - AI-written narrative summaries in weekly/monthly reports

## Project Structure

```
src/
├── app/           # Next.js pages and API routes
├── components/    # UI components (shadcn-style)
├── hooks/         # React data-fetching hooks
└── lib/           # Database, Ollama client, utilities
migrations/        # SQL migration files
data/              # SQLite database (gitignored)
```
