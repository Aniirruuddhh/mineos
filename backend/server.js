require('dotenv').config();
const { writeAuditLog, computeHash } = require('./auditlog');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());           // allows your frontend (different address) to call this API
app.use(express.json());   // lets the server understand JSON data sent to it

const multer = require('multer');
const Tesseract = require('tesseract.js');
const upload = multer({ dest: 'uploads/' });  // temporarily saves uploaded files to a local folder

// POST an image, get back extracted text
app.post('/api/ocr', upload.single('document'), async (req, res) => {
  try {
    const result = await Tesseract.recognize(req.file.path, 'eng');
    res.json({ extractedText: result.data.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong reading the document' });
  }
});

// Connection pool — manages multiple DB connections so several requests can be handled at once
const pool = new Pool({
  host: process.env
  .DB_HOST,
  port: process.env
  .DB_PORT,
  database: process.env
  .DB_NAME,
  user: process.env
  .DB_USER,
  password: process.env
  .DB_PASSWORD,
});

// GET all violations — joins in the mine's name so the frontend doesn't have to look it up separately
app.get('/api/violations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.category, v.description, v.status, v.risk_score, v.created_at,
             m.name AS mine_name
      FROM violations v
      JOIN mines m ON v.mine_id = m.id
      ORDER BY v.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching violations' });
  }
});

// GET one specific violation by its ID
app.get('/api/violations/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, m.name AS mine_name FROM violations v JOIN mines m ON v.mine_id = m.id WHERE v.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching this violation' });
  }
});
// GET — walks the ENTIRE chain and proves nothing was tampered with. Great live-demo moment.
app.get('/api/audit-log/verify', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_log ORDER BY id ASC');
    let expectedPrevious = '0'.repeat(64);

    for (const entry of result.rows) {
      const recomputed = computeHash({
        previous_hash: expectedPrevious,
        violation_id: entry.violation_id,
        action: entry.action,
        performed_by: entry.performed_by,
        details: entry.details,
        created_at: entry.created_at
      });
      if (recomputed !== entry.entry_hash) {
        return res.json({ valid: false, brokenAtEntryId: entry.id });
      }
      expectedPrevious = entry.entry_hash;
    }
    res.json({ valid: true, entriesChecked: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong verifying the audit log' });
  }
});
// POST — create a new violation (this is what your field report form will call later)
app.post('/api/violations', async (req, res) => {
  const { mine_id, reported_by, category, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO violations (mine_id, reported_by, category, description, status, created_at)
       VALUES ($1, $2, $3, $4, 'open', NOW()) RETURNING *`,
      [mine_id, reported_by, category, description]
    );
    await writeAuditLog(pool, {
      violation_id: result.rows[0].id,
      action: 'created',
      performed_by: reported_by,
      details: `Violation reported: ${category} - ${description}`
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the violation' });
  }
});
// GET the full audit history for one specific violation
app.get('/api/audit-log/:violation_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS performed_by_name
       FROM audit_log a
       LEFT JOIN users u ON a.performed_by = u.id
       WHERE a.violation_id = $1
       ORDER BY a.created_at ASC`,
      [req.params.violation_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching the audit log' });
  }
});
// PATCH — update a violation's status (e.g., mark it closed)
app.patch('/api/violations/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE violations SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    await writeAuditLog(pool, {
      violation_id: req.params.id,
      action: 'status_changed',
      performed_by: req.body.performed_by,
      details: `Status changed to ${status}`
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the violation' });
  }
});

// Bonus: GET all mines — your frontend form will need this for a dropdown
app.get('/api/mines', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM mines ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching mines' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});