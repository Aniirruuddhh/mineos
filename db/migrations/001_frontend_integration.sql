BEGIN;

ALTER TABLE violations
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS area VARCHAR(255),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS gps_accuracy NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS device_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS alert_manager BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ocr_text TEXT;

ALTER TABLE corrective_actions
  ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT;

CREATE TABLE IF NOT EXISTS violation_evidence (
  id SERIAL PRIMARY KEY,
  violation_id INTEGER NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  ocr_text TEXT,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS violations_mine_status_created_idx
  ON violations (mine_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS violation_evidence_violation_created_idx
  ON violation_evidence (violation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS corrective_actions_violation_idx
  ON corrective_actions (violation_id);

COMMIT;
