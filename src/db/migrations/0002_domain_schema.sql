-- Domain schema (Task 2.1) — PRD §7 data model.
--
-- A Project is `feature` (one Script attached directly to the project)
-- or `series` (Seasons → Episodes → one Script per Episode, plus exactly
-- one Story Bible per Season).
--
-- A Script is an ordered array of typed elements (script_elements) —
-- never a formatted string. Editor rendering and PDF export derive from
-- this structured data; never the reverse.

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feature', 'series')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_projects_owner ON projects (owner_user_id);

CREATE TABLE seasons (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (project_id, season_number)
) STRICT;

CREATE TABLE episodes (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (season_id, episode_number)
) STRICT;

CREATE INDEX idx_episodes_season ON episodes (season_id);

CREATE TABLE scripts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  -- NULL for feature-film scripts; set for series-episode scripts.
  episode_id TEXT UNIQUE REFERENCES episodes (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

-- A script belongs either directly to a feature project (episode_id NULL,
-- enforced one-per-project by this partial index) or to a series episode
-- (episode_id set, enforced unique by the column's UNIQUE). That the
-- project must be type='series' when episode_id is set cannot reference
-- another table in a CHECK; it is enforced in the API layer (Task 2.2).
CREATE UNIQUE INDEX idx_scripts_feature_per_project ON scripts (project_id) WHERE episode_id IS NULL;

CREATE TABLE story_bibles (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL UNIQUE REFERENCES seasons (id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE TABLE script_elements (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL REFERENCES scripts (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('scene_heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition')
  ),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (script_id, position)
) STRICT;

CREATE INDEX idx_elements_script_position ON script_elements (script_id, position);

-- Lifetime script count is tracked on users (Task 5.2 adds the column via
-- its own migration to keep billing changes reviewable in isolation).

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  -- NULL = project-level conversation; set = scoped to one episode.
  episode_id TEXT REFERENCES episodes (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_conversations_project ON conversations (project_id, episode_id);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  -- Citation chips: [{ elementId, scriptId, episodeId | null }...] (PRD Req 10).
  citations TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);
