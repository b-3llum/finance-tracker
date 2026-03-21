CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT 'Main Account',
  current_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS balance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  balance REAL NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  budget_amount REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount REAL NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  deadline TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES savings_goals(id),
  amount REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  data TEXT NOT NULL,
  ai_insights TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_data TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  data_days INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id, date);
CREATE INDEX IF NOT EXISTS idx_balance_history_recorded ON balance_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(goal_id);

-- Seed default categories
INSERT OR IGNORE INTO categories (name, type, color, icon) VALUES
  ('Salary', 'income', '#22c55e', 'banknote'),
  ('Freelance', 'income', '#3b82f6', 'laptop'),
  ('Other Income', 'income', '#8b5cf6', 'plus-circle'),
  ('Food & Groceries', 'expense', '#ef4444', 'shopping-cart'),
  ('Bills & Charges', 'expense', '#f97316', 'file-text'),
  ('Rent/Mortgage', 'expense', '#dc2626', 'home'),
  ('Transport', 'expense', '#eab308', 'car'),
  ('Entertainment', 'expense', '#ec4899', 'gamepad-2'),
  ('Health', 'expense', '#14b8a6', 'heart-pulse'),
  ('Shopping', 'expense', '#6366f1', 'shopping-bag'),
  ('Subscriptions', 'expense', '#f43f5e', 'repeat'),
  ('Savings Transfer', 'expense', '#10b981', 'piggy-bank');

-- Seed default account
INSERT OR IGNORE INTO accounts (id, name, current_balance) VALUES (1, 'Main Account', 0);

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('currency', 'USD'),
  ('currency_symbol', '$'),
  ('ollama_url', 'http://localhost:11434'),
  ('ollama_model', 'llama3'),
  ('notifications_enabled', 'true'),
  ('theme', 'system');
