const { pool } = require("../config/database");
function findAllForUser(user) { const mineClause = user.role === "manager" ? "WHERE m.id = $1" : ""; const values = user.role === "manager" ? [user.mine_id] : []; return pool.query(`SELECT m.id, m.name, m.subsidiary, m.latitude, m.longitude, (SELECT u.id FROM users u WHERE u.mine_id = m.id AND u.role = 'manager' ORDER BY u.id LIMIT 1) AS manager_id, (SELECT u.name FROM users u WHERE u.mine_id = m.id AND u.role = 'manager' ORDER BY u.id LIMIT 1) AS manager_name FROM mines m ${mineClause} ORDER BY m.name`, values); }
function findBasic() { return pool.query("SELECT id, name, subsidiary, latitude, longitude FROM mines ORDER BY name"); }
module.exports = { findAllForUser, findBasic };
