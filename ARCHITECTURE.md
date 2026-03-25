# FinTrack Architecture

## System Overview

```mermaid
graph TB
    subgraph Internet["Network Boundary"]
        Browser["Browser<br/>(Chrome / Safari / Firefox)"]
    end

    subgraph Docker["Docker Compose"]
        subgraph Nginx["Nginx (port 443/80)"]
            TLS["TLS Termination<br/>mkcert certs"]
            Redirect["HTTP → HTTPS<br/>Redirect"]
        end

        subgraph App["FinTrack Container"]
            subgraph Client["Client Layer (React 19 + Next.js 16)"]
                direction TB
                PWA["PWA Shell<br/>manifest.json + sw.js"]

                subgraph AuthPages["(auth) Route Group"]
                    Login["/login"]
                    Register["/register"]
                end

                subgraph AppPages["(app) Route Group"]
                    Dashboard["/dashboard"]
                    Transactions["/transactions"]
                    Budget["/budget"]
                    Savings["/savings"]
                    Debts["/debts"]
                    Bills["/bills"]
                    NetWorth["/net-worth"]
                    Forecast["/forecast"]
                    Reports["/reports"]
                    Insights["/insights"]
                    Import["/import"]
                    Settings["/settings"]
                end

                subgraph Components
                    Sidebar["Sidebar"]
                    Charts["Charts<br/>(Recharts)"]
                    UIKit["UI Kit<br/>Card, Button, Input,<br/>Dialog, Toast, Skeleton,<br/>Badge, Progress, Select"]
                end

                subgraph Hooks
                    UseApi["useApi<br/>(fetch + Bearer token)"]
                    UseAuth["useAuth<br/>(AuthContext)"]
                end
            end

            subgraph Server["Server Layer (Next.js App Router)"]
                direction TB
                Middleware["Middleware (Edge Runtime)<br/>JWT verify · CORS · Route protection"]

                subgraph APIRoutes["API Routes (Node.js Runtime)"]
                    AuthAPI["/api/auth/*<br/>login · register · logout · me"]
                    DataAPI["/api/*<br/>accounts · transactions · categories<br/>balance · budget · savings · debts<br/>bills · net-worth · forecast · import"]
                    AIAPI["/api/ai/*<br/>chat · optimize · profile<br/>status · anomalies · subscriptions"]
                    ReportsAPI["/api/reports"]
                    SettingsAPI["/api/settings"]
                end
            end

            subgraph Services["Service Layer"]
                direction TB
                AuthLib["auth.ts<br/>bcrypt · JWT (jose)"]
                DBLib["db.ts<br/>SQLite (better-sqlite3)"]
                CryptoLib["crypto.ts<br/>AES-256-GCM"]
                AIClient["ai-client.ts<br/>Provider abstraction"]
                AIPrompts["ai-prompts.ts<br/>Prompt templates"]
                ReportGen["report-generator.ts<br/>Weekly/Monthly reports"]
                RateLimit["rate-limit.ts<br/>Sliding window"]
                ApiUtils["api-utils.ts<br/>Shared helpers"]
            end

            subgraph DB["SQLite Database"]
                Users[(users)]
                Accounts[(accounts)]
                Trans[(transactions)]
                Categories[(categories)]
                SavingsT[(savings_goals)]
                DebtsT[(debts)]
                BillsT[(bills)]
                ReportsT[(reports)]
                SettingsT[(settings)]
                AIProfiles[(ai_profiles)]
            end
        end
    end

    subgraph AI["AI Providers (External)"]
        Ollama["Ollama<br/>(local, default)"]
        Claude["Claude API<br/>(Anthropic)"]
        OpenAI["OpenAI API"]
    end

    %% Network flow
    Browser -->|"HTTPS :443"| TLS
    Browser -->|"HTTP :80"| Redirect
    Redirect -->|"301"| TLS
    TLS -->|"HTTP :3000<br/>(internal)"| Middleware

    %% Client connections
    PWA --> AppPages
    PWA --> AuthPages
    AppPages --> Components
    AppPages --> Hooks
    AuthPages --> Hooks
    UseApi --> Middleware
    UseAuth -->|"login/register/logout"| AuthAPI

    %% Server connections
    Middleware -->|"x-user-id header"| APIRoutes
    AuthAPI --> AuthLib
    DataAPI --> DBLib
    AIAPI --> AIClient
    AIAPI --> AIPrompts
    ReportsAPI --> ReportGen
    SettingsAPI --> DBLib
    SettingsAPI --> CryptoLib

    %% Service connections
    AuthLib --> DBLib
    ReportGen --> DBLib
    ReportGen --> AIClient
    AIClient --> Ollama
    AIClient --> Claude
    AIClient --> OpenAI
    DBLib --> CryptoLib
    DBLib --> DB
```

## Data Model

```mermaid
erDiagram
    users {
        int id PK
        text email UK
        text password_hash
        text name
        text created_at
        text updated_at
    }

    accounts {
        int id PK
        int user_id FK
        text name
        real current_balance
        text created_at
        text updated_at
    }

    transactions {
        int id PK
        int user_id FK
        int account_id FK
        int category_id FK
        text type
        real amount
        text description
        text date
        int recurring
        text recurring_interval
        text created_at
    }

    categories {
        int id PK
        int user_id FK
        text name
        text type
        text color
        text icon
        real budget_amount
        text created_at
    }

    savings_goals {
        int id PK
        int user_id FK
        text name
        real target_amount
        real current_amount
        text deadline
        int priority
        text status
        text created_at
    }

    savings_contributions {
        int id PK
        int goal_id FK
        int user_id FK
        real amount
        text date
        text note
    }

    debts {
        int id PK
        int user_id FK
        text name
        real original_amount
        real current_balance
        real interest_rate
        real minimum_payment
        text due_date
        text status
    }

    debt_payments {
        int id PK
        int debt_id FK
        int user_id FK
        real amount
        text date
        text note
    }

    bills {
        int id PK
        int user_id FK
        text name
        real amount
        text frequency
        text next_due_date
        int category_id FK
        text status
    }

    reports {
        int id PK
        int user_id FK
        text type
        text period_start
        text period_end
        text data
        text ai_insights
        text created_at
    }

    settings {
        int user_id PK
        text key PK
        text value
    }

    ai_profiles {
        int id PK
        int user_id FK
        text profile_data
        text generated_at
        int data_days
        int version
    }

    balance_history {
        int id PK
        int account_id FK
        real balance
        text recorded_at
        text note
    }

    users ||--o{ accounts : owns
    users ||--o{ transactions : creates
    users ||--o{ categories : defines
    users ||--o{ savings_goals : sets
    users ||--o{ debts : tracks
    users ||--o{ bills : manages
    users ||--o{ reports : generates
    users ||--o{ settings : configures
    users ||--o{ ai_profiles : has
    accounts ||--o{ transactions : contains
    accounts ||--o{ balance_history : records
    categories ||--o{ transactions : classifies
    categories ||--o{ bills : categorizes
    savings_goals ||--o{ savings_contributions : receives
    debts ||--o{ debt_payments : receives
```

## Authentication Flow

```mermaid
sequenceDiagram
    actor U as User
    participant B as Browser
    participant N as Nginx
    participant MW as Middleware (Edge)
    participant API as Auth API (Node)
    participant DB as SQLite

    Note over B,N: All traffic encrypted via TLS

    U->>B: Submit credentials
    B->>N: POST /api/auth/login (HTTPS)
    N->>API: Proxy to :3000 (HTTP internal)
    API->>DB: Verify email + bcrypt hash
    DB-->>API: User record
    API->>API: Sign JWT (jose, HS256, 7d expiry)
    API-->>B: { user, token } + Set-Cookie (httpOnly, secure, sameSite=lax)

    B->>B: Store token in localStorage (fallback)
    B->>B: Navigate to /dashboard

    U->>B: View dashboard
    B->>N: GET /dashboard (Cookie + Bearer)
    N->>MW: Proxy
    MW->>MW: Verify JWT (cookie or Authorization header)
    MW->>MW: Set x-user-id header
    MW-->>B: Next.js page

    U->>B: Fetch data
    B->>N: GET /api/transactions (Cookie + Bearer)
    N->>MW: Proxy
    MW->>MW: Verify JWT
    MW->>API: Forward with x-user-id header
    API->>DB: SELECT ... WHERE user_id = ?
    DB-->>API: User-scoped data
    API-->>B: JSON response
```

## HTTPS Architecture

```mermaid
flowchart LR
    subgraph Host["Host Machine"]
        mkcert["mkcert<br/>(one-time setup)"]
        Certs["certs/<br/>localhost.pem<br/>localhost-key.pem"]
        mkcert -->|generates| Certs
    end

    subgraph Docker["Docker Compose Network"]
        subgraph NginxC["nginx container"]
            N443["Listen :443 (TLS)"]
            N80["Listen :80"]
        end
        subgraph AppC["fintrack container"]
            App3000[":3000 (HTTP)"]
        end

        N80 -->|"301 redirect"| N443
        N443 -->|"proxy_pass"| App3000
    end

    Certs -->|"volume mount<br/>(read-only)"| NginxC

    User["Browser"] -->|"https://localhost"| N443
    User -->|"http://localhost"| N80

    style N443 fill:#22c55e,color:#fff
    style N80 fill:#f59e0b,color:#fff
```

## AI Integration

```mermaid
flowchart LR
    subgraph Client
        Chat["Chat UI"]
        Optimize["Optimize"]
        Profile["Profile"]
        Anomalies["Anomalies"]
        Subs["Subscriptions"]
    end

    subgraph API["AI API Routes"]
        ChatR["/api/ai/chat"]
        OptR["/api/ai/optimize"]
        ProfR["/api/ai/profile"]
        AnoR["/api/ai/anomalies"]
        SubR["/api/ai/subscriptions"]
    end

    subgraph AIClient["ai-client.ts"]
        QA["queryAI()"]
        SA["streamAI()"]
        CS["checkAIStatus()"]
    end

    subgraph Prompts["ai-prompts.ts"]
        PT["Prompt Templates<br/>Context injection"]
    end

    subgraph Providers
        O["Ollama<br/>localhost:11434"]
        CL["Claude API"]
        OA["OpenAI API"]
    end

    Chat --> ChatR
    Optimize --> OptR
    Profile --> ProfR
    Anomalies --> AnoR
    Subs --> SubR

    ChatR --> SA
    OptR --> QA
    ProfR --> QA
    AnoR --> QA
    SubR --> QA

    QA --> PT
    SA --> PT
    PT --> O
    PT --> CL
    PT --> OA
```

## Request Lifecycle

```mermaid
flowchart TD
    A[Incoming Request] --> B{Static Asset?}
    B -->|Yes| C[Serve directly]
    B -->|No| D{Public Path?<br/>/login, /register,<br/>/api/auth/*}
    D -->|Yes| E[Add CORS headers<br/>Pass through]
    D -->|No| F{Has Token?<br/>Cookie or Bearer}
    F -->|No, Page| G[Redirect to /login]
    F -->|No, API| H[401 Unauthorized]
    F -->|Yes| I{JWT Valid?}
    I -->|No, Page| J[Clear cookie<br/>Redirect to /login]
    I -->|No, API| H
    I -->|Yes| K[Set x-user-id header]
    K --> L{API Route?}
    L -->|Yes| M[Clone request with<br/>x-user-id header<br/>+ CORS]
    L -->|No| N[Serve page<br/>+ CORS]
```

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, Next.js 16 (App Router), Tailwind CSS 4 | UI rendering, routing, styling |
| Charts | Recharts | Balance trends, spending breakdown |
| Icons | Lucide React | Consistent iconography |
| Database | SQLite (better-sqlite3) | Embedded relational storage |
| Auth | bcryptjs (cost 12) + jose (JWT HS256) | Password hashing + stateless sessions |
| Encryption | AES-256-GCM (node:crypto) | API key encryption at rest |
| AI | Ollama / Claude / OpenAI | Financial insights and chat |
| Rate Limiting | Sliding window (in-memory) | Brute-force protection on auth routes |
| TLS | Nginx + mkcert | HTTPS on localhost with trusted certs |
| Container | Docker + Docker Compose | Isolated, reproducible deployment |
| Scheduling | node-cron | Automated weekly/monthly reports |
| PWA | Service Worker + Manifest | Offline caching, installability |
