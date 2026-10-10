const minesRepository = require("../repositories/minesRepository");
async function list(request, response, next) { try { const result = await minesRepository.findAllForUser(request.user); response.json(result.rows.map((mine) => ({ ...mine, id: Number(mine.id), manager_id: mine.manager_id ? Number(mine.manager_id) : null }))); } catch (error) { next(error); } }
module.exports = { list };
