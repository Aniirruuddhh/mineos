const { loadEnv } = require("./src/config/env");

loadEnv();

const app = require("./app");
const PORT = Number(process.env.PORT || 5050);

app.listen(PORT, () => {
  console.log(`MineOS API running on http://localhost:${PORT}`);
});
