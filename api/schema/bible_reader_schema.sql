-- Bible Reader persistence schema
-- Suitable for PostgreSQL / MySQL style relational databases

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  external_id VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bible_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_slug VARCHAR(64) NOT NULL,
  chapter_num INTEGER NOT NULL,
  verse_num INTEGER NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, book_slug, chapter_num, verse_num)
);

CREATE TABLE IF NOT EXISTS bible_reading_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_slug VARCHAR(64) NOT NULL,
  chapter_num INTEGER NOT NULL,
  verse_num INTEGER NULL,
  scroll_pct DECIMAL(5,2) NULL,
  last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, book_slug, chapter_num)
);

CREATE TABLE IF NOT EXISTS bible_reading_plans (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  total_days INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bible_reading_plan_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES bible_reading_plans(id) ON DELETE CASCADE,
  completed_days INTEGER NOT NULL DEFAULT 0,
  completed_chapters JSONB NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bible_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_last_read ON bible_reading_progress(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_progress_user ON bible_reading_plan_progress(user_id);
