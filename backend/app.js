const express = require("express");
const cors = require("cors");
const apiRouter = require("./src/routes");
const { createAuthRouter } = require("./src/routes/auth");
const authController = require("./src/controllers/authController");
const uploadsController = require("./src/controllers/uploadsController");
const { requireAuth } = require("./src/middlewares/auth");
const { notFound, errorHandler } = require("./src/middlewares/errorHandler");
const { requestLogger } = require("./src/middlewares/requestLogger");

const allowedOrigins = new Set(
  (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5050,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003,http://127.0.0.1:5050"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function isAllowedOrigin(origin) {
  return (
    allowedOrigins.has(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
}

function protectApi(request, response, next) {
  if (["/health", "/auth/login", "/auth/logout"].includes(request.path)) {
    return next();
  }
  return requireAuth(request, response, next);
}

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      const error = new Error("Origin is not allowed by CORS.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

app.get("/login", authController.loginPage(allowedOrigins));
app.get("/uploads/:filename", requireAuth, uploadsController.get);
app.use("/api", createAuthRouter(allowedOrigins));
app.use("/api", protectApi);
app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
