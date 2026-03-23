# FinTrack Architecture

## System Overview

```mermaid
graph TB
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
            Reports["/reports"]
            Insights["/insights"]
            Settings["/settings"]
        end

        subgraph Components
            Sidebar["Sidebar"]
            Charts["Charts<br/>(Recharts)"]
            UIKit["UI Kit<br/>Card, Button, Input,<br/>Dialog, Toast, Skeleton"]
        end

        subgraph Hooks
            UseApi["useApi"]
            UseAuth["useAuth<br/>(AuthContext)"]
        end
    end

    subgraph Server["Server Layer (Next.js App Router)"]
        direction TB
        Middleware["Middleware<br/>JWT verify · CORS · Rate limit"]

        subgraph APIRoutes["API Routes"]
            AuthAPI["/api/auth/*<br/>login · register · logout · me"]
            DataAPI["/api/*<br/>accounts · transactions<br/>categories · balance<br/>budget · savings · reports"]
            AIAPI["/api/ai/*<br/>chat · optimize · profile · status"]
            CronAPI["/api/cron<br/>report generation"]
            SettingsAPI["/api/settings"]
        end
    end

    subgraph Services["Service Layer"]
        direction TB
        AuthLib["auth.ts<br/>bcrypt · JWT (jose)"]
        DBLib["db.ts<br/>SQLite (better-sqlite3)"]
        CryptoLib["crypto.ts<br/>AES-256-GCM"]
        AIClient["ai-client.ts<br/>Provider abstraction"]
        ReportGen["report-generator.ts<br/>Weekly/Monthly reports"]
        RateLimit["rate-limit.ts<br/>Sliding window"]
    end

    subgraph AI["AI Providers"]
        Ollama["Ollama<br/>(local, default)"]
        Claude["Claude API<br/>(Anthropic)"]
        OpenAI["OpenAI API"]
    end

    subgraph DB["Database (SQLite)"]
        Users[(users)]
        Accounts[(accounts)]
        Trans[(transactions)]
        Categories[(categories)]
        SavingsT[(savings_goals)]
        ReportsT[(reports)]
        SettingsT[(settings)]
        AIProfiles[(ai_profiles)]
    end

    %% Client connections
    PWA --> AppPages
    PWA --> AuthPages
    AppPages --> Components
    AppPages --> Hooks
    AuthPages --> Hooks
    UseApi -->|"fetch + Bearer token"| Middleware
    UseAuth -->|"login/register/logout"| AuthAPI

    %% Server connections
    Middleware -->|"x-user-id header"| APIRoutes
    AuthAPI --> AuthLib
    DataAPI --> DBLib
    AIAPI --> AIClient
    CronAPI --> ReportGen
    SettingsAPI --> DBLib
    SettingsAPI --> CryptoLib

    %% Service connections
    AuthLib --> DBLib
    ReportGen --> DBLib
    ReportGen --> AIClient
    DBLib --> CryptoLib
    AIClient --> Ollama
    AIClient --> Claude
    AIClient --> OpenAI

    %% Database connections
    DBLib --> DB
```

## Component Diagram

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string password_hash
        +string name
        +datetime created_at
    }

    class Account {
        +int id
        +int user_id
        +string name
        +float balance
    }

    class Transaction {
        +int id
        +int user_id
        +int account_id
        +int category_id
        +string type
        +float amount
        +string description
        +date date
        +bool is_recurring
    }

    class Category {
        +int id
        +int user_id
        +string name
        +string type
        +float budget_amount
    }

    class SavingsGoal {
        +int id
        +int user_id
        +string name
        +float target_amount
        +float current_amount
        +date deadline
        +string priority
        +string status
    }

    class Report {
        +int id
        +int user_id
        +string type
        +string period_start
        +string period_end
        +text data
        +text insights
    }

    class Settings {
        +int user_id
        +string key
        +string value
    }

    User "1" --> "*" Account
    User "1" --> "*" Transaction
    User "1" --> "*" Category
    User "1" --> "*" SavingsGoal
    User "1" --> "*" Report
    User "1" --> "*" Settings
    Account "1" --> "*" Transaction
    Category "1" --> "*" Transaction
```

## Authentication Flow

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant MW as Middleware
    participant API as Auth API
    participant DB as SQLite

    U->>C: Submit credentials
    C->>API: POST /api/auth/login
    API->>DB: Verify email + bcrypt
    DB-->>API: User record
    API->>API: Sign JWT (jose, 7d)
    API-->>C: { user, token } + Set-Cookie

    C->>C: Store token in localStorage
    C->>C: Redirect to /dashboard

    C->>MW: GET /dashboard (Cookie + Bearer)
    MW->>MW: Verify JWT
    MW->>MW: Set x-user-id header
    MW-->>C: Next.js page

    C->>MW: GET /api/data (Cookie + Bearer)
    MW->>MW: Verify JWT
    MW->>API: Forward with x-user-id
    API->>DB: Query WHERE user_id = ?
    DB-->>API: User-scoped data
    API-->>C: JSON response
```

## AI Integration

```mermaid
flowchart LR
    subgraph Client
        Chat["Chat UI"]
        Optimize["Optimize"]
        Profile["Profile"]
    end

    subgraph API["AI API Routes"]
        ChatR["/api/ai/chat"]
        OptR["/api/ai/optimize"]
        ProfR["/api/ai/profile"]
    end

    subgraph AIClient["ai-client.ts"]
        QA["queryAI()"]
        SA["streamAI()"]
        CS["checkAIStatus()"]
    end

    subgraph Providers
        O["Ollama<br/>localhost:11434"]
        CL["Claude<br/>API"]
        OA["OpenAI<br/>API"]
    end

    Chat --> ChatR
    Optimize --> OptR
    Profile --> ProfR

    ChatR --> SA
    OptR --> QA
    ProfR --> QA

    QA --> O
    QA --> CL
    QA --> OA
    SA --> O
    SA --> CL
    SA --> OA
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 16 (App Router), Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Database | SQLite (better-sqlite3) |
| Auth | bcryptjs + jose (JWT) |
| Encryption | AES-256-GCM (node:crypto) |
| AI | Multi-provider (Ollama / Claude / OpenAI) |
| Scheduling | node-cron |
| PWA | Service Worker + Web App Manifest |
