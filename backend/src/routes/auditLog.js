const express = require("express");
const auditLogController = require("../controllers/auditLogController");

const router = express.Router();

// Keep this static route before the parameterized route.
router.get("/audit-log/verify", auditLogController.verify);
router.get("/audit-log/:violationId", auditLogController.list);

module.exports = router;
