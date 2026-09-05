const crypto = require('crypto');

// Computes a SHA-256 fingerprint from this entry's data + the previous entry's hash
function computeHash({ previous_hash, violation_id, action, performed_by, details, created_at }) {
  const raw = `${previous_hash}|${violation_id}|${action}|${performed_by}|${details}|${created_at}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Writes one new, correctly-chained audit log entry
async function writeAuditLog(pool, { violation_id, action, performed_by, details }) {
  const lastEntry = await pool.query(
    'SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1'
  );
  // If this is the very first entry ever, there's no previous hash — use a fixed "genesis" value
  const previous_hash = lastEntry.rows.length > 0 ? lastEntry.rows[0].entry_hash : '0'.repeat(64);

  const created_at = new Date().toISOString();
  const entry_hash = computeHash({ previous_hash, violation_id, action, performed_by, details, created_at });

  const result = await pool.query(
    `INSERT INTO audit_log (violation_id, action, performed_by, details, previous_hash, entry_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [violation_id, action, performed_by, details, previous_hash, entry_hash, created_at]
  );
  return result.rows[0];
}

module.exports = { writeAuditLog, computeHash };