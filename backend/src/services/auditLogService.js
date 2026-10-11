const crypto = require("crypto");

function toIsoTimestamp(value) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.getTime())) throw new Error("Invalid audit timestamp");
  return timestamp.toISOString();
}
function computeHash({ previous_hash, violation_id, action, performed_by, details, created_at }) {
  return crypto.createHash("sha256").update(JSON.stringify({ previous_hash, violation_id, action, performed_by, details, created_at: toIsoTimestamp(created_at) })).digest("hex");
}
function computeLegacyHash({ previous_hash, violation_id, action, performed_by, details, created_at }) {
  return crypto.createHash("sha256").update(`${previous_hash}|${violation_id}|${action}|${performed_by}|${details}|${toIsoTimestamp(created_at)}`).digest("hex");
}
async function writeAuditLog(client, entry) {
  await client.query("SELECT pg_advisory_xact_lock($1)", [819120]);
  const lastEntry = await client.query("SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1");
  const previous_hash = lastEntry.rows.length ? lastEntry.rows[0].entry_hash : "0".repeat(64);
  const created_at = new Date().toISOString();
  const entry_hash = computeHash({ previous_hash, ...entry, created_at });
  const result = await client.query(`INSERT INTO audit_log (violation_id, action, performed_by, details, previous_hash, entry_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [entry.violation_id, entry.action, entry.performed_by, entry.details, previous_hash, entry_hash, created_at]);
  return result.rows[0];
}
module.exports = { writeAuditLog, computeHash, computeLegacyHash };
