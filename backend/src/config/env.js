const path = require("path");

function loadEnv() {
  require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
}

module.exports = { loadEnv };
