const { spawnSync } = require("node:child_process");

const teamIdPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const sessionIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function normalizeCandidate(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function githubHandleFromCli() {
  const result = spawnSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8" });
  return result.status === 0 ? normalizeCandidate(result.stdout) : "";
}

function resolveTeamId(env = process.env, { lookupHandle = githubHandleFromCli } = {}) {
  const candidates = [env.BOARD_USER, env.BOARD_TEAM_ID, env.GITHUB_USER, env.GITHUB_ACTOR];
  let handle = candidates.map(normalizeCandidate).find(Boolean) || "";
  if (!handle) {
    handle = normalizeCandidate(lookupHandle());
  }
  if (!handle) {
    throw new Error(
      "BOARD_USER is required. Set it to your GitHub handle, or sign in with gh auth login."
    );
  }
  if (handle.length < 3 || handle.length > 80 || !teamIdPattern.test(handle)) {
    throw new Error(
      "BOARD_USER must be a GitHub handle of 3 to 80 characters using letters, digits, and hyphens."
    );
  }
  return handle;
}

function todaySessionId(now = new Date()) {
  const year = now.getUTCFullYear().toString().padStart(4, "0");
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = now.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function resolveSessionId(env = process.env, now = new Date()) {
  const configured = typeof env.BOARD_SESSION_ID === "string" ? env.BOARD_SESSION_ID.trim() : "";
  if (!configured) return todaySessionId(now);
  if (configured.length < 3 || configured.length > 80 || !sessionIdPattern.test(configured)) {
    throw new Error(
      "BOARD_SESSION_ID must be 3 to 80 characters using letters, digits, dots, hyphens, and underscores."
    );
  }
  return configured;
}

function resolveParticipantIdentity(env = process.env, options = {}) {
  return {
    teamId: resolveTeamId(env, options),
    sessionId: resolveSessionId(env, options.now),
  };
}

module.exports = {
  resolveParticipantIdentity,
  resolveSessionId,
  resolveTeamId,
  todaySessionId,
};
