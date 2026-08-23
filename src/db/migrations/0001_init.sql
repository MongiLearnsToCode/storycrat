-- Initial schema: users table only.
-- The full domain schema (projects, seasons, episodes, scripts,
-- script_elements, story_bibles, conversations, messages, subscriptions)
-- lands with Task 2.1; this migration establishes the accounts root that
-- every later table keys off, plus D1's recommended strict typing.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_users_email ON users (email);
