BEGIN;

CREATE TABLE IF NOT EXISTS mines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subsidiary VARCHAR(128) NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('manager', 'corporate', 'regulator')),
  mine_id INTEGER REFERENCES mines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  mine_id INTEGER NOT NULL REFERENCES mines(id),
  reported_by INTEGER NOT NULL REFERENCES users(id),
  category VARCHAR(32) NOT NULL CHECK (category IN ('safety', 'environment', 'labour', 'production')),
  description TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corrective_actions (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  action_taken TEXT NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  action VARCHAR(128) NOT NULL,
  performed_by INTEGER REFERENCES users(id),
  details TEXT NOT NULL DEFAULT '{}',
  previous_hash CHAR(64) NOT NULL,
  entry_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_mine_role_idx ON users (mine_id, role);
CREATE INDEX IF NOT EXISTS violations_created_idx ON violations (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_violation_created_idx ON audit_log (violation_id, created_at ASC);

COMMIT;
