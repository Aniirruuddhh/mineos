const crypto = require('crypto');

function toIsoTimestamp(value) {
  const timestamp = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Invalid audit timestamp');
  }

  return timestamp.toISOString();
}

// Computes a SHA-256 fingerprint from a stable representation of an entry.
function computeHash({ previous_hash, violation_id, action, performed_by, details, created_at }) {
  const payload = JSON.stringify({
    previous_hash,
    violation_id,
    action,
    performed_by,
    details,
    created_at: toIsoTimestamp(created_at),
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Supports records created before the stable JSON representation was introduced.
function computeLegacyHash({ previous_hash, violation_id, action, performed_by, details, created_at }) {
  const raw = `${previous_hash}|${violation_id}|${action}|${performed_by}|${details}|${toIsoTimestamp(created_at)}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Call this with a PostgreSQL client that already has an open transaction.
async function writeAuditLog(client, { violation_id, action, performed_by, details }) {
  // Serializes chain writes so concurrent reports cannot use the same previous hash.
  await client.query('SELECT pg_advisory_xact_lock($1)', [819120]);

  const lastEntry = await client.query(
    'SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1'
  );
  // If this is the very first entry ever, there's no previous hash — use a fixed "genesis" value
  const previous_hash = lastEntry.rows.length > 0 ? lastEntry.rows[0].entry_hash : '0'.repeat(64);

  const created_at = new Date().toISOString();
  const entry_hash = computeHash({ previous_hash, violation_id, action, performed_by, details, created_at });

  const result = await client.query(
    `INSERT INTO audit_log (violation_id, action, performed_by, details, previous_hash, entry_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [violation_id, action, performed_by, details, previous_hash, entry_hash, created_at]
  );
  return result.rows[0];
}

module.exports = { writeAuditLog, computeHash, computeLegacyHash };
