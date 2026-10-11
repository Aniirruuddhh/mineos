const { pool } = require("../config/database");
function findByViolationId(id) { return pool.query(`SELECT c.*, u.name AS owner_name FROM corrective_actions c LEFT JOIN users u ON u.id = c.owner_id WHERE c.violation_id = $1 ORDER BY c.id ASC`, [id]); }
function findAccess(id, client) { return client.query("SELECT v.mine_id FROM corrective_actions c JOIN violations v ON v.id = c.violation_id WHERE c.id = $1", [id]); }
function create(values, client) { return client.query(`INSERT INTO corrective_actions (violation_id, action_taken, owner_id, due_at, status, notes) VALUES ($1, $2, $3, $4, 'open', $5) RETURNING *`, values); }
function updateStatus(id, status, client) { return client.query(`UPDATE corrective_actions SET status = $1, closed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END WHERE id = $2 RETURNING *`, [status, id]); }
module.exports = { findByViolationId, findAccess, create, updateStatus };
