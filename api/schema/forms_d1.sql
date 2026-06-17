-- D1 schema for small church form data
-- Apply with:
--   npx wrangler d1 execute zion_ministry_db --remote --file=./schema/forms_d1.sql

CREATE TABLE IF NOT EXISTS small_group_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  area TEXT,
  phone TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_small_group_created_at
  ON small_group_registrations (created_at DESC);

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  ministry TEXT,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_volunteer_created_at
  ON volunteer_signups (created_at DESC);
