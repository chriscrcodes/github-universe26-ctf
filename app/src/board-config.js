function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost"
    || normalized === "::1"
    || normalized === "0.0.0.0"
    || normalized.startsWith("127.");
}

function offline(reason) {
  return { mode: "offline", boardUrl: null, boardToken: null, reason };
}

// The board is a scoreboard, never a gate: a missing or unreachable board
// downgrades the run to offline play instead of blocking the participant.
function resolveBoardConfig(env = process.env) {
  const rawUrl = env.BOARD_URL?.trim();
  const boardToken = env.BOARD_TOKEN?.trim();
  if (!rawUrl && !boardToken) {
    return offline("BOARD_URL and BOARD_TOKEN are not provisioned.");
  }
  if (!rawUrl) {
    return offline("BOARD_URL is not provisioned.");
  }
  if (!boardToken) {
    return offline("BOARD_TOKEN is not provisioned.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return offline("BOARD_URL is not a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return offline("BOARD_URL must use HTTP or HTTPS.");
  }
  if (isLocalHostname(parsedUrl.hostname) && env.ALLOW_LOCAL_BOARD !== "1") {
    return offline("BOARD_URL points at localhost instead of the shared board.");
  }

  return {
    mode: "board",
    boardUrl: parsedUrl.toString().replace(/\/$/, ""),
    boardToken,
    reason: null,
  };
}

module.exports = { isLocalHostname, resolveBoardConfig };
