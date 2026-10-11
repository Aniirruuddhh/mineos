const { SLA_HOURS } = require("../constants/sla");

function getEscalationStatus(violation) {
  if (["resolved", "closed"].includes(violation.status)) return { escalation_status: "closed", hours_remaining: null };
  const slaHours = SLA_HOURS[violation.category] || 72;
  const deadline = new Date(new Date(violation.created_at).getTime() + slaHours * 60 * 60 * 1000);
  const hoursRemaining = (deadline - new Date()) / (1000 * 60 * 60);
  return hoursRemaining < 0 ? { escalation_status: "escalated", hours_remaining: Math.round(hoursRemaining) } : { escalation_status: "on_track", hours_remaining: Math.round(hoursRemaining) };
}

module.exports = { getEscalationStatus, SLA_HOURS };
