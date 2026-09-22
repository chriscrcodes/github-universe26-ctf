function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost"
    || normalized === "::1"
    || normalized === "0.0.0.0"
    || normalized.startsWith("127.");
}

function resolveBoardConfig(env = process.env) {
  const rawUrl = env.BOARD_URL?.trim();
  if (!rawUrl) {
    throw new Error("BOARD_URL is required. Ask a facilitator for the shared progress board URL.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("BOARD_URL must be a valid HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("BOARD_URL must use HTTP or HTTPS.");
  }
  if (isLocalHostname(parsedUrl.hostname) && env.ALLOW_LOCAL_BOARD !== "1") {
    throw new Error("BOARD_URL must be the shared facilitator board, not localhost.");
  }

  const boardToken = env.BOARD_TOKEN?.trim();
  if (!boardToken) {
    throw new Error("BOARD_TOKEN is required. Ask a facilitator for the shared progress board token.");
  }

  return {
    boardUrl: parsedUrl.toString().replace(/\/$/, ""),
    boardToken,
  };
}

module.exports = { isLocalHostname, resolveBoardConfig };
