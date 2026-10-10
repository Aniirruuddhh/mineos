function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function parseOptionalNumber(value, { min, max } = {}) {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  const number = Number(value);
  if (!Number.isFinite(number)) return { ok: false, value: null };
  if (min !== undefined && number < min) return { ok: false, value: null };
  if (max !== undefined && number > max) return { ok: false, value: null };
  return { ok: true, value: number };
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  return ["true", "1", "on", "yes"].includes(String(value || "").trim().toLowerCase());
}

module.exports = { toId, normalizeValue, parseOptionalNumber, parseBoolean };
