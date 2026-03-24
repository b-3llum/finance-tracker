<p align="center">
  <img src="public/banner.svg" alt="FinTrack" width="100%"/>
</p>

<p align="center">
  <strong>Self-hosted personal finance tracker with AI intelligence, PDF import, and bilingual support.</strong>
</p>

<p align="center">
  <a href="#install-with-docker-recommended"><img src="https://img.shields.io/badge/Docker-One_Command-2496ED?logo=docker&logoColor=white" alt="Docker"/></a>
  <a href="#ai-setup"><img src="https://img.shields.io/badge/AI-Ollama_Built_In-a855f7?logo=meta&logoColor=white" alt="AI"/></a>
  <a href="#step-3-set-up-https"><img src="https://img.shields.io/badge/HTTPS-Included-22c55e?logo=letsencrypt&logoColor=white" alt="HTTPS"/></a>
  <img src="https://img.shields.io/badge/i18n-EN_|_FR-3b82f6" alt="i18n"/>
  <img src="https://img.shields.io/badge/Theme-Light_|_Dark_|_OLED-1e1b4b" alt="Themes"/>
</p>

---

## Features

| Category | What you get |
|---|---|
| **Dashboard** | KPI hero row (net worth, income, expenses, savings rate) with sparklines, gradient area chart, interactive donut, cash-flow waterfall, GitHub-style spending heatmap |
| **Intelligence Engine** | Financial health score (0–100), spending DNA profile, personality type, impulse score, subscription burden, category fingerprint (50/30/20), pay-cycle analysis |
| **Predictions** | Next-month category forecasts, cash shortfall detection, trend alerts (>15% increase), budget recommendations, savings potential |
| **Smart Categorization** | Auto-categorize imports via merchant rules, learn from manual corrections, fuzzy pattern matching |
| **PDF Import + OCR** | Parse bank statement PDFs — text-based and scanned/image-based via OCR (tesseract.js + poppler). Confidence scoring, inline editing before import |
| **CSV/TSV Import** | Drag-and-drop with auto column detection, preview table, bulk import |
| **Budgeting** | Per-category budgets, pace indicator (day-of-month progress line), flex mode (Needs/Wants/Savings), budget vs actual chart, rollover visualization |
| **Transactions** | Inline editing, bulk operations (select + categorize/delete), split transactions across categories, smart search with amount filters |
| **Bills & Debts** | Recurring bill reminders, debt tracking with interest rates and payment history |
| **Savings** | Goals with deadlines, contribution tracking, progress bars |
| **Net Worth** | Assets vs liabilities with history chart |
| **Forecasting** | Cash flow projections based on spending patterns |
| **Reports** | Auto-generated weekly/monthly reports with AI narrative |
| **AI Chat** | Streaming financial chat with Ollama, Claude, or OpenAI |
| **i18n** | Full English/French bilingual support with language switcher |
| **Themes** | Light, Dark (glassmorphism), OLED Dark (true black) |
| **Onboarding** | 4-step wizard for new users (name, import, currency, done) |
| **Mobile** | Bottom navigation bar on small screens, responsive layout |
| **Landing Page** | Scroll-animated marketing page with 3D container scroll, floating cards, animated counters |
| **Security** | AES-256-GCM encryption, HTTPS, JWT auth, bcrypt, rate limiting, user-scoped data |
| **PWA** | Installable as progressive web app |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 16 (App Router), Tailwind CSS 4, Recharts, Framer Motion, Lucide Icons |
| Database | SQLite (better-sqlite3) |
| Auth | bcryptjs + jose (JWT HS256, 7-day expiry) |
| Encryption | AES-256-GCM (node:crypto) |
| AI | Ollama (local, built in) / Claude / OpenAI |
| OCR | tesseract.js + poppler-utils (pdftoppm) |
| i18n | Custom context provider with JSON translation files |
| TLS | Nginx reverse proxy + mkcert or self-signed |
| Container | Docker Compose (3 services: app, nginx, ollama) |

---

## Installation

There are two ways to run FinTrack. **Docker is recommended** — it handles everything (app, database, AI, HTTPS) in one command.

---

### Install with Docker (Recommended)

Everything below is copy-paste. You don't need Node.js, npm, or any database — Docker handles it all.

#### Step 1: Install Docker

Pick your OS and run every command in order:

<details open>
<summary><strong>Ubuntu / Debian</strong></summary>

```bash
# 1. Install Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh

# 2. Let your user run Docker without sudo
sudo usermod -aG docker $USER

# 3. Apply the group change (or log out and back in)
newgrp docker

# 4. Verify both are installed
docker --version
docker compose version
```

You should see version numbers for both. If `docker compose version` says "command not found", run:
```bash
sudo apt update && sudo apt install -y docker-compose-plugin
```
</details>

<details>
<summary><strong>Arch Linux</strong></summary>

```bash
# 1. Install Docker and Compose
sudo pacman -S --noconfirm docker docker-compose

# 2. Start Docker and enable on boot
sudo systemctl enable --now docker

# 3. Let your user run Docker without sudo
sudo usermod -aG docker $USER

# 4. Apply the group change (or log out and back in)
newgrp docker

# 5. Verify
docker --version
docker compose version
```
</details>

<details>
<summary><strong>Fedora / RHEL / CentOS</strong></summary>

```bash
# 1. Install Docker
sudo dnf install -y dnf-plugins-core
sudo dnf-3 config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 2. Start Docker and enable on boot
sudo systemctl enable --now docker

# 3. Let your user run Docker without sudo
sudo usermod -aG docker $USER

# 4. Apply the group change (or log out and back in)
newgrp docker

# 5. Verify
docker --version
docker compose version
```
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
# 1. Install Docker Desktop (includes Compose)
brew install --cask docker

# 2. Open Docker Desktop — it must be running before you continue
open -a Docker

# 3. Wait for the whale icon to appear in the menu bar, then verify
docker --version
docker compose version
```

If you don't have Homebrew, install it first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
</details>

<details>
<summary><strong>Windows</strong></summary>

1. Download [Docker Desktop for Windows](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe)
2. Run the installer — check **"Use WSL 2"** when prompted
3. Restart your computer if asked
4. Open Docker Desktop from the Start menu
5. Open PowerShell and verify:

```powershell
docker --version
docker compose version
```
</details>

#### Step 2: Clone FinTrack

```bash
git clone https://github.com/b-3llum/finance-tracker.git
cd finance-tracker
```

#### Step 3: Set up HTTPS

```bash
# For localhost
sudo ./setup-https.sh

# For a LAN server (replace with your actual IP)
sudo ./setup-https.sh 10.1.0.3
```

> **Tip:** Install [mkcert](https://github.com/FiloSottile/mkcert) first for a green padlock with zero browser warnings. Without it, the script generates a self-signed cert that works but shows a browser warning.

#### Step 4: Start everything

```bash
docker compose up -d --build
```

This builds and starts 3 containers:

| Container | What it does |
|---|---|
| `fintrack` | The Next.js web app (internal port 3000) |
| `fintrack-nginx` | HTTPS reverse proxy (ports 80 and 443) |
| `fintrack-ollama` | Local AI model server (auto-downloads llama3 on first boot) |

> **First boot takes 3–5 minutes** while the AI model downloads (~4.7 GB). You'll see `pulling manifest...` in the logs. Subsequent starts are instant.

#### Step 5: Open the app

```
https://localhost
```

Or if you're running on a LAN server:
```
https://YOUR-SERVER-IP
```

**That's it.** Register an account and start tracking your finances. Your data is stored in Docker volumes and persists across restarts and rebuilds.

#### Checking if everything is running

```bash
# See container status
docker compose ps

# Watch app logs
docker compose logs -f fintrack

# Watch AI logs (useful during first boot)
docker compose logs -f fintrack-ollama
```

---

### Install without Docker (Manual)

Use this if you want to run FinTrack directly on your machine for development.

#### Prerequisites

- **Node.js 22+** — [download here](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
- **poppler-utils** (optional, for scanned PDF OCR)

#### Steps

```bash
# 1. Clone
git clone https://github.com/b-3llum/finance-tracker.git
cd finance-tracker

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

#### Add AI (optional)

FinTrack uses Ollama for local AI. Without it, everything works except AI Insights.

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (pick one based on your machine)
ollama pull llama3.2:1b    # Low-end (4-8 GB RAM)
ollama pull llama3.2:3b    # Mid-range (16 GB RAM)
ollama pull llama3          # High-end (32 GB+ or GPU)

# Ollama starts automatically — no further config needed
```

#### Add OCR for scanned PDFs (optional)

```bash
# Ubuntu / Debian
sudo apt install poppler-utils

# Arch
sudo pacman -S poppler

# macOS
brew install poppler
```

---

## AI Setup

### How it works

The Docker stack includes Ollama — a local AI server that runs open-source language models on your hardware. No API keys, no cloud, no costs. The model is downloaded automatically on first boot.

### Recommended model by hardware

| Your machine | Model to use | Download size | Notes |
|---|---|---|---|
| Weak (2-4 cores, 4-8 GB RAM, no GPU) | `llama3.2:1b` | ~1.3 GB | Fast responses, lower quality |
| Medium (4-8 cores, 16 GB RAM) | `llama3.2:3b` | ~2 GB | Good balance of speed and quality |
| Strong (8+ cores, 32 GB+ RAM or GPU) | `llama3` (8B) | ~4.7 GB | Best quality, default in Docker |

### Changing the AI model

**Option A — before first boot:**
```bash
OLLAMA_MODEL=llama3.2:1b docker compose up -d --build
```

**Option B — after the stack is running:**
```bash
docker exec fintrack-ollama ollama pull llama3.2:1b
```
Then go to **Settings → AI Configuration** in the app and change the **Model** field to `llama3.2:1b`.

### Using cloud AI instead (optional)

If you prefer cloud models over local Ollama, go to **Settings** in the app and switch the AI provider:

| Provider | Model | What you need |
|---|---|---|
| **Claude** (Anthropic) | claude-sonnet-4-6 | API key from [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | gpt-4o | API key from [platform.openai.com](https://platform.openai.com) |

Cloud providers are faster and produce better insights, but cost money per request.

---

## Day-to-day Usage

### Starting and stopping

```bash
docker compose up -d        # Start (runs in background)
docker compose down          # Stop
docker compose restart       # Restart all containers
```

### Updating to the latest version

```bash
cd finance-tracker
git pull
docker compose up -d --build
```

### Viewing logs

```bash
docker compose logs -f fintrack          # App logs
docker compose logs -f fintrack-ollama   # AI logs
docker compose logs -f fintrack-nginx    # HTTPS proxy logs
```

### Keeping sessions across restarts

By default, everyone gets logged out when the container restarts. To keep sessions:

```bash
# 1. Generate secrets
openssl rand -base64 32    # → copy this as JWT_SECRET
openssl rand -hex 32       # → copy this as ENCRYPTION_KEY

# 2. Add them to docker-compose.yml under fintrack > environment:
#    JWT_SECRET=your-jwt-secret-here
#    ENCRYPTION_KEY=your-encryption-key-here

# 3. Restart
docker compose up -d --build
```

### Importing bank transactions

1. Download a CSV or PDF statement from your bank's website
2. Go to **Import** in the sidebar
3. Drop the file — FinTrack auto-detects the format:
   - **CSV/TSV:** auto-maps columns → preview → import
   - **PDF (text-based):** extracts transactions via regex
   - **PDF (scanned/image):** converts to images via OCR → extracts transactions
4. Review and edit the extracted data
5. Click **Import**

### Getting started with a new account

1. Register at the app URL
2. The onboarding wizard walks you through: name → import → currency → done
3. Go to **Settings** to configure AI provider and currency
4. Import your first bank statement or add transactions manually
5. Set category budgets on the **Budget** page
6. Check **Intelligence** for your financial health score

---

## Architecture

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for full UML diagrams:

- System overview (browser → nginx → app → DB/AI)
- Database ER diagram (15 tables)
- API route map (40+ endpoints)
- Component hierarchy
- Intelligence engine data flow
- Authentication + security architecture

---

## Project Structure

```
finance-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Login, register pages
│   │   ├── (app)/                  # All authenticated pages
│   │   │   ├── dashboard/          # KPI cards, charts, heatmap
│   │   │   ├── transactions/       # Inline edit, bulk ops, split
│   │   │   ├── budget/             # Pace indicator, flex mode
│   │   │   ├── intelligence/       # Health score, predictions
│   │   │   ├── savings/            # Goals + contributions
│   │   │   ├── debts/              # Debt tracking + payments
│   │   │   ├── bills/              # Recurring reminders
│   │   │   ├── net-worth/          # Assets vs liabilities
│   │   │   ├── forecast/           # Cash flow projections
│   │   │   ├── reports/            # AI-generated reports
│   │   │   ├── insights/           # AI chat
│   │   │   ├── import/             # CSV + PDF import wizard
│   │   │   └── settings/           # Language, theme, AI, currency
│   │   ├── api/                    # 40+ REST API endpoints
│   │   │   ├── intelligence/       # Profile, predictions
│   │   │   ├── import/pdf/         # PDF + OCR extraction
│   │   │   └── categorize/         # Smart auto-categorization
│   │   └── page.tsx                # Framer Motion landing page
│   ├── components/
│   │   ├── dashboard/              # BalanceChart, SpendingDonut
│   │   ├── layout/                 # Sidebar, BottomNav
│   │   ├── ui/                     # Shared components (Button, Card, etc.)
│   │   ├── onboarding.tsx          # 4-step wizard
│   │   ├── language-switcher.tsx   # EN/FR toggle
│   │   └── theme-toggle.tsx        # Light/Dark/OLED
│   ├── messages/                   # en.json, fr.json (translations)
│   ├── hooks/                      # useApi data fetching hook
│   └── lib/                        # Auth, DB, AI client, crypto, i18n
├── migrations/                     # 5 SQL migration files (auto-run)
├── docker-compose.yml              # 3-service Docker stack
├── Dockerfile                      # Multi-stage production build
├── setup-https.sh                  # HTTPS certificate generator
├── ARCHITECTURE.md                 # UML diagrams (Mermaid)
└── README.md
```

---

## License

MIT
