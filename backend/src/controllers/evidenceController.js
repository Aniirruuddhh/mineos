const path = require("path");
const { toId } = require("../helpers/values");
const { runUpload } = require("../config/upload");
const { removeFile } = require("../storage/files");
const { withTransaction } = require("../services/violationService");
const { writeAuditLog } = require("../services/auditLogService");
const evidenceRepository = require("../repositories/evidenceRepository");
const violationsRepository = require("../repositories/violationsRepository");
const { allowViolation } = require("./violationsController");
async function list(request, response, next) { const id = toId(request.params.id); if (!id) return response.status(400).json({ error: "Violation id must be a positive integer." }); try { if (!(await allowViolation(request, response, id))) return; const result = await evidenceRepository.findByViolationId(id); response.json(result.rows.map((row) => ({ ...row, url: `/uploads/${path.basename(row.storage_path)}` }))); } catch (error) { next(error); } }
async function create(request, response, next) { const id = toId(request.params.id); if (!id) return response.status(400).json({ error: "Violation id must be a positive integer." }); try { if (!(await allowViolation(request, response, id))) return; await runUpload(request, response, "evidence"); if (!request.file) return response.status(400).json({ error: "Attach an evidence file." }); const evidence = await withTransaction(async (client) => { const locked = await violationsRepository.findForUpdate(id, client); if (!locked.rows.length) { const error = new Error("Violation not found."); error.status = 404; throw error; } const result = await evidenceRepository.create([id, request.file.path, request.file.originalname, request.file.mimetype, request.file.size, request.body.ocr_text || null, request.body.captured_at || null], client); await writeAuditLog(client, { violation_id: id, action: "evidence_uploaded", performed_by: request.user.id, details: JSON.stringify({ filename: request.file.originalname }) }); return result.rows[0]; }); response.status(201).json({ ...evidence, url: `/uploads/${path.basename(evidence.storage_path)}` }); } catch (error) { await removeFile(request.file?.path); next(error); } }
module.exports = { list, create };
