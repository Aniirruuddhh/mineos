const express = require("express");
const authController = require("../controllers/authController");

function createAuthRouter(allowedOrigins) {
  const router = express.Router();
  router.post("/auth/login", authController.login(allowedOrigins));
  router.post("/auth/logout", authController.logout);
  return router;
}

module.exports = { createAuthRouter };
