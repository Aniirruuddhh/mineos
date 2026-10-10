const { pool } = require("../config/database");
function findByEmail(email) { return pool.query("SELECT id, name, email, role, mine_id FROM users WHERE email = $1", [email]); }
function findById(id, client = pool) { return client.query("SELECT id, mine_id FROM users WHERE id = $1", [id]); }
function findTeamMetrics(mineId) { return pool.query(`SELECT u.id, u.name, COUNT(c.id) FILTER (WHERE c.status <> 'completed')::INT AS active_actions, COUNT(c.id) FILTER (WHERE c.status <> 'completed' AND c.due_at::date = CURRENT_DATE)::INT AS due_today, CASE WHEN COUNT(c.id) = 0 THEN 0 ELSE ROUND(COUNT(c.id) FILTER (WHERE c.status = 'completed') * 100.0 / COUNT(c.id))::INT END AS completion FROM users u LEFT JOIN corrective_actions c ON c.owner_id = u.id WHERE u.mine_id = $1 GROUP BY u.id, u.name ORDER BY active_actions DESC, u.name ASC`, [mineId]); }
module.exports = { findByEmail, findById, findTeamMetrics };
