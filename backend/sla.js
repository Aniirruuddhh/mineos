const SLA_HOURS = {
  safety: 24,       // most urgent — matches our earlier risk-scoring example
  environment: 72,
  labour: 120,
  production: 168,
};

// Given a violation, returns how it stands against its SLA
function getEscalationStatus(violation) {
  // Already closed? No escalation applies — it's resolved.
  if (['resolved', 'closed'].includes(violation.status)) {
    return { escalation_status: 'closed', hours_remaining: null };
  }

  const slaHours = SLA_HOURS[violation.category] || 72; // fallback if category is unrecognized
  const createdAt = new Date(violation.created_at);
  const deadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  const now = new Date();

  const hoursRemaining = (deadline - now) / (1000 * 60 * 60);

  if (hoursRemaining < 0) {
    return { escalation_status: 'escalated', hours_remaining: Math.round(hoursRemaining) };
  }
  return { escalation_status: 'on_track', hours_remaining: Math.round(hoursRemaining) };
}

module.exports = { getEscalationStatus, SLA_HOURS };
