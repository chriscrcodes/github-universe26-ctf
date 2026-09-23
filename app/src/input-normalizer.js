const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const FORBIDDEN_FRAGMENTS = [";", "/*", "*/"];

// Shared hygiene for the public search inputs: collapse whitespace, drop
// control characters, and reject the fragments the analytics ingestion job
// refuses to store.
function normalizeSearchTerm(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (FORBIDDEN_FRAGMENTS.some((fragment) => cleaned.includes(fragment))) return "";
  return cleaned.slice(0, 120);
}

function escapeLikePattern(value) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function parsePositiveInteger(value, { max = 100000 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) return null;
  return parsed;
}

module.exports = { escapeLikePattern, normalizeSearchTerm, parsePositiveInteger };
