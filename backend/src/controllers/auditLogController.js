const { toId } = require("../helpers/values");
const { computeHash, computeLegacyHash } = require("../services/auditLogService");
const auditLogRepository = require("../repositories/auditLogRepository");
const { allowViolation } = require("./violationsController");
async function verify(_request, response, next) { try { const result = await auditLogRepository.findAll(); let expectedPrevious = "0".repeat(64); for (const entry of result.rows) { const item = { previous_hash: expectedPrevious, violation_id: entry.violation_id, action: entry.action, performed_by: entry.performed_by, details: entry.details, created_at: entry.created_at }; if (entry.previous_hash !== expectedPrevious || ![computeHash(item), computeLegacyHash(item)].includes(entry.entry_hash)) return response.json({ valid: false, brokenAtEntryId: entry.id }); expectedPrevious = entry.entry_hash; } response.json({ valid: true, entriesChecked: result.rows.length }); } catch (error) { next(error); } }
async function list(request, response, next) { const id = toId(request.params.violationId); if (!id) return response.status(400).json({ error: "Violation id must be a positive integer." }); try { if (!(await allowViolation(request, response, id))) return; const result = await auditLogRepository.findByViolationId(id); response.json(result.rows); } catch (error) { next(error); } }
module.exports = { verify, list };
