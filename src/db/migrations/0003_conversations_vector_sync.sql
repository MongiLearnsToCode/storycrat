-- Task 4.x support: typed conversations + vector-sync bookkeeping.

-- 'chat' = interactive conversation mode; 'notes' = one-shot Get Notes run.
ALTER TABLE conversations ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat' CHECK (kind IN ('chat', 'notes'));

-- Tracks how many scene vectors exist in Vectorize for each script so
-- shrinking scripts can delete stale trailing vectors deterministically.
CREATE TABLE vector_sync (
  script_id TEXT PRIMARY KEY,
  scene_count INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;
