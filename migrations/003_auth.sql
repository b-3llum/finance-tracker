-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add user_id to existing tables
ALTER TABLE accounts ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

ALTER TABLE transactions ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

ALTER TABLE savings_goals ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

ALTER TABLE savings_contributions ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_savings_contributions_user ON savings_contributions(user_id);

ALTER TABLE reports ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

ALTER TABLE ai_profiles ADD COLUMN user_id INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_ai_profiles_user ON ai_profiles(user_id);

ALTER TABLE categories ADD COLUMN user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Recreate settings table with user_id in compound key
CREATE TABLE IF NOT EXISTS settings_new (
  user_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (user_id, key)
);
INSERT OR IGNORE INTO settings_new (user_id, key, value) SELECT 1, key, value FROM settings;
DROP TABLE IF EXISTS settings;
ALTER TABLE settings_new RENAME TO settings;
