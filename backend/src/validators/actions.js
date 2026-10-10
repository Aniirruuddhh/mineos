const { toId, normalizeValue } = require("../helpers/values");
function validateCreate(id, body) { if (!toId(id) || !String(body.action_taken || "").trim()) return { error: "violation id and action_taken are required." }; return { value: { violationId: toId(id), actionTaken: body.action_taken.trim() } }; }
function validateStatus(id, status) { const normalized = normalizeValue(status); if (!toId(id) || !["open", "in_progress", "completed"].includes(normalized)) return { error: "A valid action id and status are required." }; return { value: { id: toId(id), status: normalized } }; }
module.exports = { validateCreate, validateStatus };
