const test = require('node:test');
const assert = require('node:assert/strict');
const { getEscalationStatus } = require('./sla');
const { computeHash } = require('./auditlog');

test('resolved and closed violations are never escalated', () => {
  const created_at = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  assert.deepEqual(getEscalationStatus({ category: 'safety', status: 'resolved', created_at }), { escalation_status: 'closed', hours_remaining: null });
  assert.deepEqual(getEscalationStatus({ category: 'safety', status: 'closed', created_at }), { escalation_status: 'closed', hours_remaining: null });
});

test('audit hashes are stable for equivalent entries', () => {
  const entry = { previous_hash: '0'.repeat(64), violation_id: 1, action: 'created', performed_by: 1, details: '{}', created_at: '2026-09-06T00:00:00.000Z' };
  assert.equal(computeHash(entry), computeHash({ ...entry }));
});
