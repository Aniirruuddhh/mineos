const test = require("node:test");
const assert = require("node:assert/strict");
const {
  toId,
  normalizeValue,
  parseOptionalNumber,
  parseBoolean,
} = require("../src/helpers/values");
const {
  categories,
  statuses,
  severities,
  severityScores,
} = require("../src/constants/violations");

test("helpers normalize route and form values", () => {
  assert.equal(toId("12"), 12);
  assert.equal(toId("0"), null);
  assert.equal(normalizeValue(" In Progress "), "in_progress");
  assert.deepEqual(parseOptionalNumber("", { min: 0 }), { ok: true, value: null });
  assert.deepEqual(parseOptionalNumber("-1", { min: 0 }), { ok: false, value: null });
  assert.equal(parseBoolean("yes"), true);
  assert.equal(parseBoolean("false"), false);
});

test("violation constants expose the existing allowed values and scores", () => {
  assert.deepEqual([...categories], ["safety", "environment", "labour", "production"]);
  assert.deepEqual([...statuses], ["open", "acknowledged", "in_progress", "resolved", "closed"]);
  assert.deepEqual([...severities], ["low", "medium", "high", "critical"]);
  assert.deepEqual(severityScores, { low: 25, medium: 50, high: 75, critical: 95 });
});
