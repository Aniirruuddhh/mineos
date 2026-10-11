const { pool } = require("../config/database");
async function checkHealth() { await pool.query("SELECT 1"); return { ok: true }; }
module.exports = { checkHealth };
