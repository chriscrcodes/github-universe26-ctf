const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const payload = {
  sessionId: "20260922",
  teamId: "participant-one",
  alias: "Purple Comet",
  phase: "red",
  source: "participant",
};

function withOutbox(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "board-outbox-"));
  const outbox = path.join(directory, ".board-outbox.log");
  const previous = process.env.BOARD_OUTBOX_FILE;
  process.env.BOARD_OUTBOX_FILE = outbox;
  const { publishEvent } = require("../src/board-client");
  return Promise.resolve(run(publishEvent, outbox)).finally(() => {
    if (previous === undefined) delete process.env.BOARD_OUTBOX_FILE;
    else process.env.BOARD_OUTBOX_FILE = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });
}

test("offline publication is logged locally without failing", async () => {
  await withOutbox(async (publishEvent, outbox) => {
    const result = await publishEvent(payload, {
      mode: "offline",
      reason: "BOARD_URL is not provisioned.",
    });
    assert.equal(result.delivered, false);
    const entry = JSON.parse(fs.readFileSync(outbox, "utf8").trim());
    assert.equal(entry.payload.phase, "red");
    assert.match(entry.outcome, /offline/);
  });
});

test("an unreachable board is logged locally without failing", async () => {
  await withOutbox(async (publishEvent, outbox) => {
    const result = await publishEvent(payload, {
      mode: "board",
      boardUrl: "http://127.0.0.1:1",
      boardToken: "token",
      reason: null,
    });
    assert.equal(result.delivered, false);
    assert.match(fs.readFileSync(outbox, "utf8"), /request failed/);
  });
});

test("a reachable board receives the participant event", async () => {
  const received = [];
  const server = require("node:http").createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      received.push({ url: request.url, token: request.headers["x-board-reporter-token"], body });
      response.writeHead(201, { "content-type": "application/json" });
      response.end("{}");
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    await withOutbox(async (publishEvent, outbox) => {
      const result = await publishEvent(payload, {
        mode: "board",
        boardUrl: `http://127.0.0.1:${port}`,
        boardToken: "token",
        reason: null,
      });
      assert.equal(result.delivered, true);
      assert.equal(fs.existsSync(outbox), false);
      assert.equal(received[0].url, "/api/events");
      assert.equal(received[0].token, "token");
      assert.equal(JSON.parse(received[0].body).phase, "red");
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
