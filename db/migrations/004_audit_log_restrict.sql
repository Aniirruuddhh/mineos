BEGIN;

ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS audit_log_violation_id_fkey;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_violation_id_fkey
    FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE RESTRICT;

COMMIT;
