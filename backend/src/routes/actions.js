const express = require("express");
const actionsController = require("../controllers/actionsController");
const { requireRoles } = require("../middlewares/auth");

const router = express.Router();
router.get("/violations/:id/actions", actionsController.list);
router.post("/violations/:id/actions", requireRoles("manager", "corporate"), actionsController.create);
router.patch("/actions/:id", requireRoles("manager", "corporate"), actionsController.update);

module.exports = router;
