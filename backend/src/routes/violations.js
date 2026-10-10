const express = require("express");
const violationsController = require("../controllers/violationsController");
const { requireRoles } = require("../middlewares/auth");

const router = express.Router();
router.get("/violations", violationsController.list);
router.post("/violations", violationsController.create);
router.get("/violations/:id", violationsController.detail);
router.patch("/violations/:id", requireRoles("manager", "corporate"), violationsController.updateStatus);

module.exports = router;
