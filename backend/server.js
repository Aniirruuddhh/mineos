require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { Pool } = require('pg');
const { writeAuditLog, computeHash, computeLegacyHash } = require('./auditlog');
const { getEscalationStatus } = require('./sla');

const app = express();
const PORT = Number(process.env.PORT || 5050);
const uploadDirectory = path.join(__dirname, 'uploads');
const categories = new Set(['safety', 'environment', 'labour', 'production']);
const statuses = new Set(['open', 'acknowledged', 'in_progress', 'resolved', 'closed']);
const severities = new Set(['low', 'medium', 'high', 'critical']);
const severityScores = { low: 25, medium: 50, high: 75, critical: 95 };
const execFileAsync = promisify(execFile);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDirectory));

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await fs.mkdir(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      callback(null, true);
      return;
    }
    callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only images and PDFs are accepted'));
  },
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const VIOLATION_SELECT = `
  SELECT v.*, m.name AS mine_name, m.subsidiary AS mine_subsidiary,
         m.latitude AS mine_latitude, m.longitude AS mine_longitude,
         u.name AS reported_by_name,
         evidence.id AS evidence_id, evidence.storage_path AS evidence_path,
         evidence.original_name AS evidence_name, evidence.mime_type AS evidence_mime_type,
         evidence.ocr_text AS evidence_ocr_text, evidence.captured_at AS evidence_captured_at
  FROM violations v
  JOIN mines m ON m.id = v.mine_id
  LEFT JOIN users u ON u.id = v.reported_by
  LEFT JOIN LATERAL (
    SELECT * FROM violation_evidence
    WHERE violation_id = v.id
    ORDER BY created_at DESC
    LIMIT 1
  ) evidence ON TRUE
`;

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function caseId(row) {
  const year = new Date(row.created_at).getUTCFullYear();
  return `VIO-${year}-${String(row.id).padStart(4, '0')}`;
}

function publicViolation(row) {
  const escalation = getEscalationStatus(row);
  const severity = normalizeValue(row.severity) || 'medium';
  const evidenceUrl = row.evidence_path ? `/uploads/${path.basename(row.evidence_path)}` : null;

  return {
    id: Number(row.id),
    case_id: caseId(row),
    mine_id: Number(row.mine_id),
    mine_name: row.mine_name,
    mine_subsidiary: row.mine_subsidiary,
    mine_latitude: row.mine_latitude === null ? null : Number(row.mine_latitude),
    mine_longitude: row.mine_longitude === null ? null : Number(row.mine_longitude),
    reported_by: row.reported_by === null ? null : Number(row.reported_by),
    reported_by_name: row.reported_by_name || 'Field reporter',
    category: normalizeValue(row.category),
    description: row.description,
    status: normalizeValue(row.status),
    severity,
    risk_score: Number(row.risk_score || severityScores[severity]),
    area: row.area,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    gps_accuracy: row.gps_accuracy === null ? null : Number(row.gps_accuracy),
    device_timestamp: row.device_timestamp,
    server_received_at: row.server_received_at,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    alert_manager: Boolean(row.alert_manager),
    ocr_text: row.ocr_text || row.evidence_ocr_text || null,
    evidence: row.evidence_id ? {
      id: Number(row.evidence_id),
      url: evidenceUrl,
      name: row.evidence_name,
      mime_type: row.evidence_mime_type,
      captured_at: row.evidence_captured_at,
    } : null,
    ...escalation,
  };
}

async function getViolations({ mineId, status, category } = {}) {
  const values = [];
  const conditions = [];

  if (mineId) {
    values.push(mineId);
    conditions.push(`v.mine_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`v.status = $${values.length}`);
  }
  if (category) {
    values.push(category);
    conditions.push(`v.category = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`${VIOLATION_SELECT} ${where} ORDER BY v.created_at DESC`, values);
  return result.rows.map(publicViolation);
}

function dashboardMetrics(violations) {
  const active = violations.filter((violation) => !['resolved', 'closed'].includes(violation.status));
  const escalated = active.filter((violation) => violation.escalation_status === 'escalated');
  const dueSoon = active.filter((violation) => violation.escalation_status === 'on_track' && violation.hours_remaining !== null && violation.hours_remaining <= 24);
  const onTrack = active.filter((violation) => violation.escalation_status === 'on_track' && !dueSoon.includes(violation));
  const now = new Date();
  const resolvedThisMonth = violations.filter((violation) => {
    if (!['resolved', 'closed'].includes(violation.status)) return false;
    // Historical rows created before resolution tracking retain their prior
    // creation-date fallback; new status changes always set resolved_at.
    const resolvedAt = new Date(violation.resolved_at || violation.created_at);
    return resolvedAt.getFullYear() === now.getFullYear() && resolvedAt.getMonth() === now.getMonth();
  }).length;
  const slaCompliance = active.length ? Math.round((active.length - escalated.length) / active.length * 100) : 100;

  return {
    open: active.length,
    escalated: escalated.length,
    due_soon: dueSoon.length,
    on_track: onTrack.length,
    resolved_this_month: resolvedThisMonth,
    sla_compliance: slaCompliance,
  };
}

async function runUpload(req, res, fieldName) {
  await new Promise((resolve, reject) => {
    upload.single(fieldName)(req, res, (error) => error ? reject(error) : resolve());
  });
}

async function getPrimaryReporter(mineId, client) {
  const result = await client.query(
    `SELECT id FROM users WHERE mine_id = $1 AND role = 'manager' ORDER BY id LIMIT 1`,
    [mineId]
  );
  return result.rows[0]?.id || null;
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (_error) {
    res.status(503).json({ ok: false });
  }
});

app.post('/api/ocr', async (req, res, next) => {
  let renderedPdfPath;
  try {
    await runUpload(req, res, 'document');
    if (!req.file) return res.status(400).json({ error: 'Attach a document image or PDF.' });

    let sourcePath = req.file.path;
    if (req.file.mimetype === 'application/pdf') {
      const outputPrefix = `${req.file.path}-page`;
      await execFileAsync('pdftoppm', ['-f', '1', '-l', '1', '-png', '-singlefile', req.file.path, outputPrefix]);
      renderedPdfPath = `${outputPrefix}.png`;
      sourcePath = renderedPdfPath;
    }

    const result = await Tesseract.recognize(sourcePath, 'eng');
    res.json({ extractedText: result.data.text.trim(), confidence: result.data.confidence / 100 });
  } catch (error) {
    next(error);
  } finally {
    await Promise.all([
      req.file ? fs.unlink(req.file.path).catch(() => undefined) : undefined,
      renderedPdfPath ? fs.unlink(renderedPdfPath).catch(() => undefined) : undefined,
    ]);
  }
});

app.get('/api/dashboard/manager', async (req, res, next) => {
  try {
    const mineId = toId(req.query.mineId);
    if (!mineId) return res.status(400).json({ error: 'A valid mineId is required.' });
    const [violations, teamResult] = await Promise.all([
      getViolations({ mineId }),
      pool.query(
        `SELECT u.id, u.name,
                COUNT(c.id) FILTER (WHERE c.status <> 'completed')::INT AS active_actions,
                COUNT(c.id) FILTER (WHERE c.status <> 'completed' AND c.due_at::date = CURRENT_DATE)::INT AS due_today,
                CASE WHEN COUNT(c.id) = 0 THEN 0
                     ELSE ROUND(COUNT(c.id) FILTER (WHERE c.status = 'completed') * 100.0 / COUNT(c.id))::INT
                END AS completion
         FROM users u
         LEFT JOIN corrective_actions c ON c.owner_id = u.id
         WHERE u.mine_id = $1
         GROUP BY u.id, u.name
         ORDER BY active_actions DESC, u.name ASC`,
        [mineId],
      ),
    ]);
    res.json({ metrics: dashboardMetrics(violations), violations, team: teamResult.rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard/corporate', async (_req, res, next) => {
  try {
    const [violations, mineResult] = await Promise.all([
      getViolations(),
      pool.query('SELECT id, name, subsidiary, latitude, longitude FROM mines ORDER BY name'),
    ]);
    const mines = mineResult.rows.map((mine) => {
      const mineViolations = violations.filter((violation) => violation.mine_id === Number(mine.id));
      const metrics = dashboardMetrics(mineViolations);
      const risk = mineViolations.length ? Math.round(mineViolations.reduce((sum, violation) => sum + violation.risk_score, 0) / mineViolations.length) : 0;
      return {
        id: Number(mine.id), name: mine.name, subsidiary: mine.subsidiary,
        latitude: mine.latitude === null ? null : Number(mine.latitude),
        longitude: mine.longitude === null ? null : Number(mine.longitude),
        risk, ...metrics,
        status: risk >= 70 ? 'high' : risk >= 45 ? 'medium' : 'healthy',
      };
    }).sort((a, b) => b.risk - a.risk);

    const categoryBreakdown = [...categories].map((category) => ({
      category,
      count: violations.filter((violation) => violation.category === category).length,
    }));
    res.json({
      metrics: dashboardMetrics(violations),
      mines,
      escalations: violations.filter((violation) => violation.escalation_status === 'escalated').slice(0, 8),
      category_breakdown: categoryBreakdown,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/violations', async (req, res, next) => {
  try {
    const mineId = req.query.mineId ? toId(req.query.mineId) : null;
    if (req.query.mineId && !mineId) return res.status(400).json({ error: 'mineId must be a positive integer.' });
    const status = req.query.status ? normalizeValue(req.query.status) : null;
    const category = req.query.category ? normalizeValue(req.query.category) : null;
    res.json(await getViolations({ mineId, status, category }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/violations', async (req, res, next) => {
  const mineId = toId(req.body.mine_id);
  const category = normalizeValue(req.body.category);
  const severity = normalizeValue(req.body.severity || 'medium');
  const description = String(req.body.description || '').trim();
  const area = String(req.body.area || '').trim() || null;

  if (!mineId || !categories.has(category) || !severities.has(severity) || !description) {
    return res.status(400).json({ error: 'mine_id, category, severity, and description are required.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const reportedBy = toId(req.body.reported_by) || await getPrimaryReporter(mineId, client);
    if (!reportedBy) throw new Error('No reporter is available for this mine.');

    const result = await client.query(
      `INSERT INTO violations (
        mine_id, reported_by, category, description, status, risk_score, severity, area,
        latitude, longitude, gps_accuracy, device_timestamp, server_received_at,
        alert_manager, ocr_text, created_at
      ) VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, NOW())
      RETURNING *`,
      [mineId, reportedBy, category, description, severityScores[severity], severity, area,
        req.body.latitude ?? null, req.body.longitude ?? null, req.body.gps_accuracy ?? null,
        req.body.device_timestamp || null, Boolean(req.body.alert_manager), req.body.ocr_text || null]
    );
    const violation = result.rows[0];
    await writeAuditLog(client, {
      violation_id: violation.id,
      action: 'created',
      performed_by: reportedBy,
      details: JSON.stringify({ category, severity, area, alert_manager: Boolean(req.body.alert_manager) }),
    });
    await client.query('COMMIT');
    const created = (await getViolations({ mineId })).find((item) => item.id === Number(violation.id));
    res.status(201).json(created);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client?.release();
  }
});

app.get('/api/violations/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Violation id must be a positive integer.' });
  try {
    const result = await pool.query(`${VIOLATION_SELECT} WHERE v.id = $1`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Violation not found.' });
    res.json(publicViolation(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/violations/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  const status = normalizeValue(req.body.status);
  const performedBy = toId(req.body.performed_by);
  if (!id || !statuses.has(status) || !performedBy) {
    return res.status(400).json({ error: 'A valid violation id, status, and performed_by are required.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE violations
       SET status = $1,
           resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN NOW() ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Violation not found.' });
    }
    await writeAuditLog(client, {
      violation_id: id,
      action: 'status_changed',
      performed_by: performedBy,
      details: JSON.stringify({ status }),
    });
    await client.query('COMMIT');
    const detail = await pool.query(`${VIOLATION_SELECT} WHERE v.id = $1`, [id]);
    res.json(publicViolation(detail.rows[0]));
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client?.release();
  }
});

app.get('/api/violations/:id/evidence', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Violation id must be a positive integer.' });
  try {
    const result = await pool.query(
      `SELECT id, original_name, mime_type, file_size, ocr_text, captured_at, created_at, storage_path
       FROM violation_evidence WHERE violation_id = $1 ORDER BY created_at DESC`, [id]
    );
    res.json(result.rows.map((row) => ({ ...row, url: `/uploads/${path.basename(row.storage_path)}` })));
  } catch (error) {
    next(error);
  }
});

app.post('/api/violations/:id/evidence', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Violation id must be a positive integer.' });
  let client;
  try {
    await runUpload(req, res, 'evidence');
    if (!req.file) return res.status(400).json({ error: 'Attach an evidence file.' });
    client = await pool.connect();
    await client.query('BEGIN');
    const violationResult = await client.query('SELECT reported_by FROM violations WHERE id = $1 FOR UPDATE', [id]);
    if (!violationResult.rows.length) {
      const error = new Error('Violation not found.');
      error.status = 404;
      throw error;
    }
    const result = await client.query(
      `INSERT INTO violation_evidence (violation_id, storage_path, original_name, mime_type, file_size, ocr_text, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, req.file.path, req.file.originalname, req.file.mimetype, req.file.size, req.body.ocr_text || null, req.body.captured_at || null]
    );
    const performedBy = toId(req.body.performed_by) || violationResult.rows[0].reported_by;
    await writeAuditLog(client, {
      violation_id: id,
      action: 'evidence_uploaded',
      performed_by: performedBy,
      details: JSON.stringify({ filename: req.file.originalname }),
    });
    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], url: `/uploads/${path.basename(result.rows[0].storage_path)}` });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    if (req.file) await fs.unlink(req.file.path).catch(() => undefined);
    next(error);
  } finally {
    client?.release();
  }
});

app.get('/api/violations/:id/actions', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Violation id must be a positive integer.' });
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS owner_name FROM corrective_actions c
       LEFT JOIN users u ON u.id = c.owner_id WHERE c.violation_id = $1 ORDER BY c.id ASC`, [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/violations/:id/actions', async (req, res, next) => {
  const violationId = toId(req.params.id);
  const performedBy = toId(req.body.performed_by);
  if (!violationId || !performedBy || !String(req.body.action_taken || '').trim()) {
    return res.status(400).json({ error: 'violation id, action_taken, and performed_by are required.' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO corrective_actions (violation_id, action_taken, owner_id, due_at, status, notes)
       VALUES ($1, $2, $3, $4, 'open', $5) RETURNING *`,
      [violationId, req.body.action_taken.trim(), toId(req.body.owner_id) || performedBy, req.body.due_at || null, req.body.notes || null]
    );
    await writeAuditLog(client, {
      violation_id: violationId, action: 'corrective_action_created', performed_by: performedBy,
      details: JSON.stringify({ action_id: result.rows[0].id, action_taken: result.rows[0].action_taken }),
    });
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client?.release();
  }
});

app.patch('/api/actions/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  const performedBy = toId(req.body.performed_by);
  const status = normalizeValue(req.body.status);
  if (!id || !performedBy || !['open', 'in_progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'A valid action id, status, and performed_by are required.' });
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE corrective_actions SET status = $1, closed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
       WHERE id = $2 RETURNING *`, [status, id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Corrective action not found.' });
    }
    await writeAuditLog(client, {
      violation_id: result.rows[0].violation_id, action: 'corrective_action_updated', performed_by: performedBy,
      details: JSON.stringify({ action_id: id, status }),
    });
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client?.release();
  }
});

app.get('/api/audit-log/verify', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log ORDER BY id ASC');
    let expectedPrevious = '0'.repeat(64);
    for (const entry of result.rows) {
      const auditEntry = {
        previous_hash: expectedPrevious, violation_id: entry.violation_id, action: entry.action,
        performed_by: entry.performed_by, details: entry.details, created_at: entry.created_at,
      };
      const hashes = [computeHash(auditEntry), computeLegacyHash(auditEntry)];
      if (entry.previous_hash !== expectedPrevious || !hashes.includes(entry.entry_hash)) {
        return res.json({ valid: false, brokenAtEntryId: entry.id });
      }
      expectedPrevious = entry.entry_hash;
    }
    res.json({ valid: true, entriesChecked: result.rows.length });
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit-log/:violationId', async (req, res, next) => {
  const id = toId(req.params.violationId);
  if (!id) return res.status(400).json({ error: 'Violation id must be a positive integer.' });
  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS performed_by_name FROM audit_log a
       LEFT JOIN users u ON a.performed_by = u.id WHERE a.violation_id = $1 ORDER BY a.created_at ASC`, [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/mines', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.name, m.subsidiary, m.latitude, m.longitude,
              (SELECT u.id FROM users u WHERE u.mine_id = m.id AND u.role = 'manager' ORDER BY u.id LIMIT 1) AS manager_id,
              (SELECT u.name FROM users u WHERE u.mine_id = m.id AND u.role = 'manager' ORDER BY u.id LIMIT 1) AS manager_name
       FROM mines m ORDER BY m.name`
    );
    res.json(result.rows.map((mine) => ({ ...mine, id: Number(mine.id), manager_id: mine.manager_id ? Number(mine.manager_id) : null })));
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }
  res.status(500).json({ error: 'Something went wrong processing this request.' });
});

app.listen(PORT, () => {
  console.log(`MineOS API running on http://localhost:${PORT}`);
});
