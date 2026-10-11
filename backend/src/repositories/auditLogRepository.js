const { pool } = require("../config/database");
function findAll() { return pool.query("SELECT * FROM audit_log ORDER BY id ASC"); }
function findByViolationId(id) { return pool.query(`SELECT a.*, u.name AS performed_by_name FROM audit_log a LEFT JOIN users u ON a.performed_by = u.id WHERE a.violation_id = $1 ORDER BY a.created_at ASC`, [id]); }
module.exports = { findAll, findByViolationId };
