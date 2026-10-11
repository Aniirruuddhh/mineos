const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeHash,
  computeLegacyHash,
} = require("../src/services/auditLogService");

const entry = {
  previous_hash: "0".repeat(64),
  violation_id: 1,
  action: "created",
  performed_by: 1,
  details: '{"category":"safety","severity":"medium","area":null,"alert_manager":false}',
  created_at: "2026-09-06T00:00:00.000Z",
};

test("audit hashes are stable for equivalent entries", () => {
  assert.equal(computeHash(entry), computeHash({ ...entry }));
  assert.match(computeHash(entry), /^[a-f0-9]{64}$/);
});

test("stable and legacy audit representations remain distinct and deterministic", () => {
  assert.notEqual(computeHash(entry), computeLegacyHash(entry));
  assert.equal(computeLegacyHash(entry), computeLegacyHash({ ...entry }));
});
