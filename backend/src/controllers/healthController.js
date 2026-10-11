const { checkHealth } = require("../monitoring/health");
async function health(_request, response) { try { response.json(await checkHealth()); } catch (_error) { response.status(503).json({ ok: false }); } }
module.exports = { health };
