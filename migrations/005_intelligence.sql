-- Merchant rules for smart auto-categorization
CREATE TABLE IF NOT EXISTS merchant_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pattern TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  source TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_rules_user ON merchant_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_rules_pattern ON merchant_rules(pattern);

-- Intelligence profiles (extends ai_profiles)
CREATE TABLE IF NOT EXISTS intelligence_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  health_score INTEGER NOT NULL DEFAULT 50,
  personality_type TEXT NOT NULL DEFAULT 'Balanced Manager',
  burn_rate_daily REAL DEFAULT 0,
  burn_rate_monthly REAL DEFAULT 0,
  burn_rate_trend TEXT DEFAULT 'stable',
  impulse_score INTEGER DEFAULT 0,
  subscription_burden REAL DEFAULT 0,
  savings_rate REAL DEFAULT 0,
  category_fingerprint TEXT DEFAULT '{}',
  pay_cycle_data TEXT DEFAULT '{}',
  predictions TEXT DEFAULT '{}',
  insights TEXT DEFAULT '[]',
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Onboarding tracking
ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;
