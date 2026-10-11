const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { requireRoles } = require("../middlewares/auth");

const router = express.Router();
router.get("/dashboard/manager", requireRoles("manager"), dashboardController.manager);
router.get("/dashboard/corporate", requireRoles("corporate", "regulator"), dashboardController.corporate);

module.exports = router;
