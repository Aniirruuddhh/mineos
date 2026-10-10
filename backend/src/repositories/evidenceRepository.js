const { pool } = require("../config/database");
function findByViolationId(id) { return pool.query(`SELECT id, original_name, mime_type, file_size, ocr_text, captured_at, created_at, storage_path FROM violation_evidence WHERE violation_id = $1 ORDER BY created_at DESC`, [id]); }
function create(values, client) { return client.query(`INSERT INTO violation_evidence (violation_id, storage_path, original_name, mime_type, file_size, ocr_text, captured_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, values); }
module.exports = { findByViolationId, create };
