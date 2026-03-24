<p align="center">
  <img src="public/banner.svg" alt="FinTrack Banner" width="100%"/>
</p>

<p align="center">
  <strong>Self-hosted personal finance tracker with AI-powered insights, local LLM support, and HTTPS by default.</strong>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Docker-One_Command_Setup-2496ED?logo=docker&logoColor=white" alt="Docker"/></a>
  <a href="#ai-setup"><img src="https://img.shields.io/badge/AI-Ollama_Built_In-a855f7?logo=meta&logoColor=white" alt="AI"/></a>
  <a href="#https-setup"><img src="https://img.shields.io/badge/HTTPS-Included-22c55e?logo=letsencrypt&logoColor=white" alt="HTTPS"/></a>
</p>

---

## Features

| Category | What you get |
|---|---|
| **Core** | Balance tracking, transactions, categories, multi-currency, dark/light mode |
| **Budgeting** | Monthly budgets per category with visual progress bars |
| **Savings** | Goals with deadlines, contribution tracking, daily/weekly rates |
| **Debt Tracking** | Debts, interest rates, snowball/avalanche payoff strategies |
| **Bills** | Recurring bill reminders with due dates and auto-pay flags |
| **Net Worth** | Assets vs liabilities breakdown with donut chart |
| **Forecasting** | Cash flow projections based on spending patterns |
| **Data Import** | Bulk import from CSV/TSV bank exports with auto-column detection |
| **Reports** | Auto-generated weekly/monthly reports with AI narrative |
| **AI Insights** | Spending optimization, 60-day profiles, anomaly detection, financial chat |
| **Security** | AES-256-GCM encryption, HTTPS, JWT auth, isolated multi-user data |
| **PWA** | Installable as a progressive web app with offline caching |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 16 (App Router), Tailwind CSS 4, Recharts, Lucide Icons |
| Database | SQLite (better-sqlite3) |
| Auth | bcryptjs + jose (JWT HS256, 7-day expiry) |
| Encryption | AES-256-GCM (node:crypto) |
| AI | Ollama (local, built in) / Claude / OpenAI |
| TLS | Nginx reverse proxy + mkcert or self-signed |
| Container | Docker Compose (3 services: app, nginx, ollama) |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- That's it. No Node.js, no npm, no database setup.

### 1. Clone

```bash
git clone https://github.com/b-3llum/finance-tracker.git
cd finance-tracker
```

### 2. Generate HTTPS Certs

```bash
# Localhost only
sudo ./setup-https.sh

# LAN server (e.g., 10.1.0.3)
sudo ./setup-https.sh 10.1.0.3
```

The script uses mkcert if available (green padlock, zero warnings), otherwise falls back to self-signed with instructions on how to trust it.

### 3. Start

```bash
docker compose up -d --build
```

This starts 3 containers:

| Container | Purpose |
|---|---|
| `fintrack` | Next.js app on internal port 3000 |
| `fintrack-nginx` | Nginx reverse proxy on ports 80/443 |
| `fintrack-ollama` | Ollama AI server with llama3 (auto-pulled on first boot) |

First boot takes a few minutes while the llama3 model downloads (~4.7GB). Subsequent starts are instant.

### 4. Open

```
https://localhost        # local machine
https://10.1.0.3        # LAN access (use your server IP)
```

Register an account and start tracking. Your data persists in Docker volumes across restarts and rebuilds.

---

## Architecture

```
Browser ──HTTPS──> Nginx (443) ──HTTP──> Next.js (3000)
                                            │
                                            ├──> SQLite (file DB)
                                            │
                                            └──> Ollama (11434) ──> llama3
```

All three services run on an isolated Docker network. Only Nginx is exposed to the host.

---

## AI Setup

Ollama runs automatically as part of the Docker stack. The llama3 model is pulled on first boot — no manual setup needed.

### Using a Different Model

```bash
# Set the model before starting
OLLAMA_MODEL=mistral docker compose up -d --build

# Or pull additional models into the running container
docker exec fintrack-ollama ollama pull mistral
docker exec fintrack-ollama ollama pull codellama
```

Then change the model in **Settings > AI Configuration** in the app.

### AI Features

| Feature | Description |
|---|---|
| **Spending Profile** | After 14+ days of data, generates a personality profile with habits analysis |
| **Spending Optimization** | Analyzes current month and suggests specific cuts |
| **Financial Chat** | Ask questions about your finances with streaming responses |
| **Report Insights** | AI-written narrative summaries in weekly/monthly reports |
| **Anomaly Detection** | Flags unusual spending patterns |
| **Subscription Detection** | Identifies recurring charges from transaction history |

### Cloud AI (Optional)

If you prefer cloud models over local Ollama, go to **Settings** and enter API keys for:
- **Claude** (Anthropic) — claude-sonnet-4-6
- **OpenAI** — gpt-4o

---

## HTTPS Setup

The `setup-https.sh` script handles everything:

| Scenario | Command | Result |
|---|---|---|
| Localhost with mkcert | `sudo ./setup-https.sh` | Green padlock, zero warnings |
| LAN server with mkcert | `sudo ./setup-https.sh 10.1.0.3` | Green padlock on IP |
| Any machine without mkcert | `sudo ./setup-https.sh` | Self-signed (works, shows warning) |
| LAN without mkcert | `sudo ./setup-https.sh 10.1.0.3` | Self-signed for IP |

**To install mkcert** (recommended for zero browser warnings):

```bash
# Mac
brew install mkcert

# Linux (Ubuntu/Debian)
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

**Trust a self-signed cert in Chrome (Linux):**

```bash
certutil -d sql:$HOME/.pki/nssdb -A -t "CT,C,C" -n FinTrack -i certs/server.crt
# Then restart Chrome
```

---

## Management

```bash
docker compose up -d              # start
docker compose down               # stop
docker compose up -d --build      # rebuild after code changes
docker compose logs -f fintrack   # app logs
docker compose logs -f fintrack-ollama  # AI logs
docker compose restart            # restart all services
```

### Persistent Secrets

Sessions invalidate on container restart by default. To preserve sessions:

```yaml
# In docker-compose.yml, uncomment and set:
environment:
  - JWT_SECRET=your-secret-here
  - ENCRYPTION_KEY=your-encryption-key-here
```

Generate secrets: `openssl rand -base64 32`

### Updating

```bash
cd ~/finance-tracker
git pull
docker compose up -d --build
```

---

## Manual Setup (Without Docker)

```bash
# Prerequisites: Node.js 22+, npm
git clone https://github.com/b-3llum/finance-tracker.git
cd finance-tracker
npm install
npm run dev
# Open http://localhost:3000

# Optional: Install Ollama separately for AI
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3
```

---

## Data Import

FinTrack can import bank transaction data from CSV/TSV files.

### Supported Format

```csv
Date,Description,Amount,Type,Category
2026-03-01,Salary Deposit,4500.00,income,Income
2026-03-02,Starbucks Coffee,-6.75,expense,Food & Dining
2026-03-03,Netflix Subscription,-15.99,expense,Subscriptions
```

**Required columns:** Date, Amount
**Optional columns:** Description, Type (income/expense), Category

The import wizard auto-detects columns by header name. Supports multiple date formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY).

### How to Import

1. Export transactions from your bank as CSV
2. Go to **Import** in the sidebar
3. Drop the file or click to browse
4. Review the auto-mapped columns
5. Click Import

---

## Getting Started

1. Register at `/register`
2. Go to **Settings** — set your balance and currency
3. Import bank transactions via CSV (or add manually)
4. Set category budgets on the **Budget** page
5. Create savings goals in **Savings**
6. Check **Insights** for AI-powered spending analysis

---

## Project Structure

```
finance-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login and register pages
│   │   ├── (app)/              # Authenticated app pages
│   │   │   ├── dashboard/      # Main dashboard with charts
│   │   │   ├── transactions/   # Transaction management
│   │   │   ├── budget/         # Budget tracking
│   │   │   ├── savings/        # Savings goals
│   │   │   ├── debts/          # Debt tracking
│   │   │   ├── bills/          # Bill reminders
│   │   │   ├── net-worth/      # Net worth dashboard
│   │   │   ├── forecast/       # Financial forecasting
│   │   │   ├── reports/        # Generated reports
│   │   │   ├── insights/       # AI insights
│   │   │   ├── import/         # CSV import wizard
│   │   │   └── settings/       # Configuration
│   │   └── api/                # REST API routes
│   ├── components/             # UI components
│   ├── hooks/                  # Data-fetching hooks
│   └── lib/                    # Auth, DB, AI client, crypto
├── migrations/                 # SQL migrations (auto-run)
├── nginx/                      # Nginx reverse proxy config
├── certs/                      # TLS certificates (generated)
├── setup-https.sh              # HTTPS cert generator
├── ollama-entrypoint.sh        # Ollama auto-pull entrypoint
├── docker-compose.yml          # 3-service Docker stack
├── Dockerfile                  # Multi-stage production build
└── docker-entrypoint.sh        # Secret generation + app start
```

---

## License

MIT
