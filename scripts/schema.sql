-- Database schema for the blog.
-- Apply it with: npm run db:schema
-- Safe to run more than once, because every table is only created if it's missing.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The cookie holds a random token. Only its SHA-256 hash is stored here,
-- so a leaked database can't be used to log in.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('Film', 'AI', 'Art')),
  body         TEXT NOT NULL,
  cover_url    TEXT NOT NULL,
  cover_alt    TEXT,
  keyword      TEXT NOT NULL,
  video_url    TEXT,
  summary      TEXT,
  author_id    INTEGER REFERENCES users(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
