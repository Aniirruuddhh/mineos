const express = require("express");
const minesController = require("../controllers/minesController");

const router = express.Router();
router.get("/mines", minesController.list);

module.exports = router;
