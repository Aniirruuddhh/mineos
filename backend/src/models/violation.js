const path = require("path");
const { getEscalationStatus } = require("../services/slaService");
const { normalizeValue } = require("../helpers/values");
const { severityScores } = require("../constants/violations");

function caseId(row) {
  const year = new Date(row.created_at).getUTCFullYear();
  return `VIO-${year}-${String(row.id).padStart(4, "0")}`;
}

function publicViolation(row) {
  const severity = normalizeValue(row.severity) || "medium";
  return {
    id: Number(row.id), case_id: caseId(row), mine_id: Number(row.mine_id), mine_name: row.mine_name,
    mine_subsidiary: row.mine_subsidiary, mine_latitude: row.mine_latitude === null ? null : Number(row.mine_latitude),
    mine_longitude: row.mine_longitude === null ? null : Number(row.mine_longitude),
    reported_by: row.reported_by === null ? null : Number(row.reported_by), reported_by_name: row.reported_by_name || "Field reporter",
    category: normalizeValue(row.category), description: row.description, status: normalizeValue(row.status), severity,
    risk_score: Number(row.risk_score || severityScores[severity]), area: row.area,
    latitude: row.latitude === null ? null : Number(row.latitude), longitude: row.longitude === null ? null : Number(row.longitude),
    gps_accuracy: row.gps_accuracy === null ? null : Number(row.gps_accuracy), device_timestamp: row.device_timestamp,
    server_received_at: row.server_received_at, created_at: row.created_at, resolved_at: row.resolved_at,
    alert_manager: Boolean(row.alert_manager), ocr_text: row.ocr_text || row.evidence_ocr_text || null,
    evidence: row.evidence_id ? { id: Number(row.evidence_id), url: `/uploads/${path.basename(row.evidence_path)}`, name: row.evidence_name, mime_type: row.evidence_mime_type, captured_at: row.evidence_captured_at } : null,
    ...getEscalationStatus(row),
  };
}

module.exports = { caseId, publicViolation };
