BEGIN;

ALTER TABLE violations
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS violations_resolved_at_idx
  ON violations (resolved_at DESC)
  WHERE resolved_at IS NOT NULL;

COMMIT;
