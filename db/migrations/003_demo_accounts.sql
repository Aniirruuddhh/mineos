BEGIN;

INSERT INTO users (name, email, role, mine_id)
VALUES ('Corporate Demo', 'corporate@mineos.local', 'corporate', NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, role, mine_id)
SELECT 'Manager Demo', 'manager@mineos.local', 'manager', id
FROM mines
ORDER BY id
LIMIT 1
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, role, mine_id)
VALUES ('Regulator Demo', 'regulator@mineos.local', 'regulator', NULL)
ON CONFLICT (email) DO NOTHING;

COMMIT;
