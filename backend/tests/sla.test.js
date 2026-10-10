const test = require("node:test");
const assert = require("node:assert/strict");
const { getEscalationStatus, SLA_HOURS } = require("../src/services/slaService");

test("resolved and closed violations are never escalated", () => {
  const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  assert.deepEqual(
    getEscalationStatus({ category: "safety", status: "resolved", created_at: createdAt }),
    { escalation_status: "closed", hours_remaining: null },
  );
  assert.deepEqual(
    getEscalationStatus({ category: "safety", status: "closed", created_at: createdAt }),
    { escalation_status: "closed", hours_remaining: null },
  );
});

test("SLA uses the established category durations and fallback", () => {
  assert.equal(SLA_HOURS.safety, 24);
  assert.equal(SLA_HOURS.environment, 72);
  assert.equal(SLA_HOURS.labour, 120);
  assert.equal(SLA_HOURS.production, 168);

  const result = getEscalationStatus({
    category: "unknown",
    status: "open",
    created_at: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
  });
  assert.equal(result.escalation_status, "escalated");
});
