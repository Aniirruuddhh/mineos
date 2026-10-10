const categories = new Set(["safety", "environment", "labour", "production"]);
const statuses = new Set(["open", "acknowledged", "in_progress", "resolved", "closed"]);
const severities = new Set(["low", "medium", "high", "critical"]);
const severityScores = { low: 25, medium: 50, high: 75, critical: 95 };

module.exports = { categories, statuses, severities, severityScores };
