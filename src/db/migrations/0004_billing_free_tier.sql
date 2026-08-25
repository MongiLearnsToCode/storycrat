-- Task 5.2/5.4: lifetime script count + subscription state.

-- Cumulative count of scripts ever created by this account. NEVER decreases —
-- deleting a script does not restore free-tier allowance (PRD Req 34).
ALTER TABLE users ADD COLUMN lifetime_script_count INTEGER NOT NULL DEFAULT 0;

-- Subscription state is sourced exclusively from Polar webhooks
-- (security-doc.md § Billing): never from client-reported state.
CREATE TABLE subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  polar_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  plan TEXT NOT NULL DEFAULT '',
  current_period_end TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
