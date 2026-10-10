const { pool } = require("../config/database");
const violations = require("../repositories/violationsRepository");
const { publicViolation } = require("../models/violation");
async function getViolations(filters) { const result = await violations.findAll(filters); return result.rows.map(publicViolation); }
async function getViolation(id) { const result = await violations.findById(id); return result.rows[0] ? publicViolation(result.rows[0]) : null; }
async function accessMine(id) { const result = await violations.findMineId(id); return result.rows[0]?.mine_id || null; }
function withTransaction(work) { return pool.connect().then(async (client) => { try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); } }); }
module.exports = { getViolations, getViolation, accessMine, withTransaction };
