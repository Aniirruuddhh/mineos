const express = require("express");
const healthRouter = require("./health");
const ocrRouter = require("./ocr");
const dashboardRouter = require("./dashboard");
const violationsRouter = require("./violations");
const evidenceRouter = require("./evidence");
const actionsRouter = require("./actions");
const auditLogRouter = require("./auditLog");
const minesRouter = require("./mines");

const router = express.Router();
router.use(healthRouter);
router.use(ocrRouter);
router.use(dashboardRouter);
router.use(violationsRouter);
router.use(evidenceRouter);
router.use(actionsRouter);
router.use(auditLogRouter);
router.use(minesRouter);

module.exports = router;
