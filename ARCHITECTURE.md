# FinTrack v2 — Architecture

## System Overview

```mermaid
graph TB
    subgraph Client
        Browser["Browser / PWA"]
    end

    subgraph Docker["Docker Compose Stack"]
        Nginx["Nginx<br/>Reverse Proxy<br/>:80 / :443"]
        NextJS["Next.js 16<br/>App Router<br/>:3000"]
        SQLite["SQLite<br/>better-sqlite3<br/>/app/data/finance.db"]
        Ollama["Ollama<br/>Local LLM<br/>:11434"]
    end

    Browser -->|HTTPS| Nginx
    Nginx -->|HTTP| NextJS
    NextJS -->|SQL| SQLite
    NextJS -->|HTTP| Ollama

    style Browser fill:#818cf8,stroke:#6366f1,color:#fff
    style Nginx fill:#22c55e,stroke:#16a34a,color:#fff
    style NextJS fill:#0ea5e9,stroke:#0284c7,color:#fff
    style SQLite fill:#f59e0b,stroke:#d97706,color:#fff
    style Ollama fill:#a855f7,stroke:#9333ea,color:#fff
```

## Request Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as Middleware
    participant API as API Route
    participant DB as SQLite
    participant AI as Ollama / Claude / OpenAI

    B->>M: Request (Cookie / Bearer token)
    M->>M: Verify JWT (jose)
    alt Unauthenticated
        M-->>B: 401 / Redirect to /login
    end
    M->>API: Forward with x-user-id header
    API->>DB: Query (better-sqlite3)
    DB-->>API: Result
    opt AI-powered endpoint
        API->>AI: queryAI() / streamAI()
        AI-->>API: Response / Stream
    end
    API-->>B: JSON / Stream response
```

## Database Schema (ER Diagram)

```mermaid
erDiagram
    users {
        int id PK
        string email UK
        string password_hash
        string name
        int onboarding_complete
    }

    accounts {
        int id PK
        string name
        float current_balance
        int user_id FK
    }

    transactions {
        int id PK
        float amount
        string type "income | expense"
        string date
        string description
        int category_id FK
        int user_id FK
        int is_recurring
        string recurring_interval
        string created_at
    }

    categories {
        int id PK
        string name
        string type "income | expense"
        string color
        string icon
        float budget_amount
        int user_id FK
    }

    bills {
        int id PK
        string name
        float amount
        int due_day
        string frequency
        int auto_pay
        int reminder_days
        int user_id FK
    }

    debts {
        int id PK
        string name
        string type "loan | credit_card | other"
        float balance
        float interest_rate
        float minimum_payment
        int user_id FK
    }

    debt_payments {
        int id PK
        int debt_id FK
        float amount
        string date
    }

    savings_goals {
        int id PK
        string name
        float target_amount
        float current_amount
        string deadline
        string status "active | completed"
        string priority
        int user_id FK
    }

    savings_contributions {
        int id PK
        int goal_id FK
        float amount
        string date
        int user_id FK
    }

    balance_history {
        int id PK
        float balance
        string date
        int account_id FK
    }

    reports {
        int id PK
        string type "weekly | monthly"
        string period_start
        string period_end
        string content
        string ai_insights
        int user_id FK
    }

    intelligence_profiles {
        int id PK
        int user_id FK "UNIQUE"
        int health_score
        string personality_type
        float burn_rate_daily
        float burn_rate_monthly
        string burn_rate_trend
        int impulse_score
        float subscription_burden
        float savings_rate
        string category_fingerprint "JSON"
        string pay_cycle_data "JSON"
        string computed_at
    }

    merchant_rules {
        int id PK
        int user_id FK
        string pattern
        int category_id FK
        float confidence
        string source "system | user"
    }

    settings {
        int id PK
        int user_id FK
        string key
        string value
    }

    users ||--o{ accounts : has
    users ||--o{ transactions : creates
    users ||--o{ categories : defines
    users ||--o{ bills : tracks
    users ||--o{ debts : owes
    users ||--o{ savings_goals : targets
    users ||--o{ reports : generates
    users ||--|| intelligence_profiles : has
    users ||--o{ merchant_rules : configures
    users ||--o{ settings : configures
    categories ||--o{ transactions : classifies
    categories ||--o{ merchant_rules : maps_to
    debts ||--o{ debt_payments : receives
    savings_goals ||--o{ savings_contributions : receives
    accounts ||--o{ balance_history : records
```

## API Route Map

```mermaid
graph LR
    subgraph Auth
        A1["POST /api/auth/login"]
        A2["POST /api/auth/register"]
        A3["POST /api/auth/logout"]
        A4["GET /api/auth/me"]
        A5["POST /api/auth/onboarding"]
    end

    subgraph Core
        B1["GET|PUT /api/accounts"]
        B2["GET|POST /api/transactions"]
        B3["GET|PUT|DELETE /api/transactions/:id"]
        B4["GET /api/categories"]
        B5["GET /api/balance"]
        B6["GET /api/budget"]
        B7["GET|PUT /api/settings"]
    end

    subgraph Financial
        C1["GET|POST /api/bills"]
        C2["GET|POST /api/debts"]
        C3["POST /api/debts/:id/payments"]
        C4["GET|POST /api/savings"]
        C5["POST /api/savings/:id/contribute"]
        C6["GET /api/net-worth"]
        C7["GET /api/forecast"]
        C8["GET|POST /api/reports"]
    end

    subgraph Import
        D1["POST /api/import — CSV/TSV"]
        D2["POST /api/import/pdf — PDF"]
    end

    subgraph Intelligence
        E1["GET /api/intelligence/profile"]
        E2["GET /api/intelligence/predictions"]
        E3["GET|POST /api/categorize"]
    end

    subgraph AI
        F1["POST /api/ai/chat — Streaming"]
        F2["GET /api/ai/profile"]
        F3["GET /api/ai/optimize"]
        F4["GET /api/ai/anomalies"]
        F5["GET /api/ai/subscriptions"]
        F6["GET /api/ai/status"]
    end
```

## Component Architecture

```mermaid
graph TD
    subgraph Root["Root Layout"]
        AuthProvider
        I18nProvider
        ToastProvider
    end

    subgraph AppLayout["(app) Layout"]
        Sidebar
        BottomNav["BottomNav — mobile"]
        Onboarding["Onboarding Wizard"]
    end

    subgraph Pages
        Dashboard
        Transactions
        Budget
        Intelligence
        Settings
        Import
    end

    subgraph Landing["Landing Page — public"]
        ContainerScroll
        FloatingCards
        TextReveal
        AnimatedCounter
    end

    Root --> AppLayout
    Root --> Landing
    AppLayout --> Pages

    Dashboard --> BalanceChart
    Dashboard --> SpendingDonut
    Dashboard --> CashFlowChart
    Dashboard --> SpendingHeatmap

    Intelligence --> HealthGauge
    Intelligence --> Heatmap
    Intelligence --> Fingerprint
    Intelligence --> Predictions

    Sidebar --> LanguageSwitcher
    Sidebar --> ThemeToggle
```

## Intelligence Engine

```mermaid
flowchart TD
    TX["Transactions"] --> Profile["GET /api/intelligence/profile"]
    ACC["Account Balance"] --> Profile
    DEBTS["Active Debts"] --> Profile
    BILLS["Recurring Bills"] --> Profile
    BUDGET["Category Budgets"] --> Profile

    Profile --> HS["Health Score 0-100"]
    Profile --> BR["Burn Rate"]
    Profile --> IS["Impulse Score"]
    Profile --> SB["Subscription Burden"]
    Profile --> SR["Savings Rate"]
    Profile --> CF["Category Fingerprint"]
    Profile --> PT["Personality Type"]

    HS -->|80+| Strategic["Strategic Saver"]
    HS -->|60-80| Balanced["Balanced Manager"]
    HS -->|40-60| Lifestyle["Lifestyle Spender"]
    HS -->|under 40| AtRisk["At Risk"]

    TX --> Predict["GET /api/intelligence/predictions"]
    Predict --> Forecast["Category Forecasts"]
    Predict --> Shortfall["Cash Shortfall Detection"]
    Predict --> Trends["Trend Alerts"]
    Predict --> Potential["Savings Potential"]
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant MW as Middleware
    participant API as Auth API
    participant DB as SQLite

    U->>FE: Register / Login
    FE->>API: POST /api/auth/register or /login
    API->>API: bcrypt hash (cost 12)
    API->>DB: INSERT or SELECT user
    API->>API: Sign JWT (HS256, 7d expiry)
    API-->>FE: HttpOnly cookie + token
    FE->>FE: localStorage.setItem auth_token
    FE-->>U: Redirect to dashboard

    Note over U,DB: Authenticated requests
    FE->>MW: Cookie or Bearer token
    MW->>MW: jwtVerify()
    MW->>API: x-user-id header
    API->>DB: WHERE user_id = ?
    API-->>FE: Scoped response
```

## Security

```mermaid
graph TB
    subgraph Transport
        TLS["TLS via Nginx"]
    end

    subgraph Auth
        JWT["JWT HS256 — 7 day"]
        BCrypt["bcrypt cost 12"]
        Rate["Rate Limiting"]
    end

    subgraph Encryption
        AES["AES-256-GCM — API keys at rest"]
    end

    subgraph Isolation
        Scope["User-scoped queries"]
        CORS["CORS headers"]
    end

    TLS --> Auth --> Encryption --> Isolation
```
