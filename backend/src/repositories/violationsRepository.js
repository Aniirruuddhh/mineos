const { pool } = require("../config/database");

const VIOLATION_SELECT = `SELECT v.*, m.name AS mine_name, m.subsidiary AS mine_subsidiary, m.latitude AS mine_latitude, m.longitude AS mine_longitude, u.name AS reported_by_name, evidence.id AS evidence_id, evidence.storage_path AS evidence_path, evidence.original_name AS evidence_name, evidence.mime_type AS evidence_mime_type, evidence.ocr_text AS evidence_ocr_text, evidence.captured_at AS evidence_captured_at FROM violations v JOIN mines m ON m.id = v.mine_id LEFT JOIN users u ON u.id = v.reported_by LEFT JOIN LATERAL (SELECT * FROM violation_evidence WHERE violation_id = v.id ORDER BY created_at DESC LIMIT 1) evidence ON TRUE`;

async function findAll({ mineId, status, category } = {}) {
  const values = []; const conditions = [];
  if (mineId) { values.push(mineId); conditions.push(`v.mine_id = $${values.length}`); }
  if (status) { values.push(status); conditions.push(`v.status = $${values.length}`); }
  if (category) { values.push(category); conditions.push(`v.category = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return pool.query(`${VIOLATION_SELECT} ${where} ORDER BY v.created_at DESC`, values);
}
function findById(id, client = pool) { return client.query(`${VIOLATION_SELECT} WHERE v.id = $1`, [id]); }
function findMineId(id, client = pool) { return client.query("SELECT mine_id FROM violations WHERE id = $1", [id]); }
function findForUpdate(id, client) { return client.query("SELECT id FROM violations WHERE id = $1 FOR UPDATE", [id]); }
function create(data, client) { return client.query(`INSERT INTO violations (mine_id, reported_by, category, description, status, risk_score, severity, area, latitude, longitude, gps_accuracy, device_timestamp, server_received_at, alert_manager, ocr_text, created_at) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, NOW()) RETURNING *`, data); }
function updateStatus(id, status, client) { return client.query(`UPDATE violations SET status = $1, resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN COALESCE(resolved_at, NOW()) ELSE NULL END WHERE id = $2 RETURNING *`, [status, id]); }

module.exports = { VIOLATION_SELECT, findAll, findById, findMineId, findForUpdate, create, updateStatus };
