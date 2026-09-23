const fs = require("node:fs");
const path = require("node:path");

function outboxPath() {
  return path.resolve(
    process.env.BOARD_OUTBOX_FILE || path.join(__dirname, "..", ".board-outbox.log")
  );
}

function logLocally(payload, outcome) {
  const entry = {
    loggedAt: new Date().toISOString(),
    outcome,
    payload,
  };
  try {
    fs.appendFileSync(outboxPath(), `${JSON.stringify(entry)}\n`);
  } catch (error) {
    console.warn(`Local board log skipped: ${error.message}`);
  }
}

// Phase progress is always recorded locally first. Board delivery is a
// best-effort side effect: it is logged, never retried, and never blocking.
async function publishEvent(payload, boardConfig) {
  if (boardConfig.mode !== "board") {
    logLocally(payload, `offline: ${boardConfig.reason}`);
    console.warn(`Offline mode: ${boardConfig.reason} Local progress is preserved.`);
    return { delivered: false, reason: boardConfig.reason };
  }

  try {
    const response = await fetch(`${boardConfig.boardUrl}/api/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-board-reporter-token": boardConfig.boardToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      const reason = `board returned HTTP ${response.status}`;
      logLocally(payload, "board rejected the event");
      console.warn(`Board publish skipped: ${reason}. Local progress is preserved.`);
      return { delivered: false, reason };
    }
    return { delivered: true, reason: null };
  } catch (error) {
    logLocally(payload, `request failed: ${error.message}`);
    console.warn(`Board publish skipped: ${error.message}. Local progress is preserved.`);
    return { delivered: false, reason: error.message };
  }
}

module.exports = { outboxPath, publishEvent };
