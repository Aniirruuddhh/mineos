const express = require("express");
const evidenceController = require("../controllers/evidenceController");

const router = express.Router();
router.get("/violations/:id/evidence", evidenceController.list);
router.post("/violations/:id/evidence", evidenceController.create);

module.exports = router;
