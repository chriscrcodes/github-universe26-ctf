const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { createApp } = require("../src/server");
const { CANONICAL_PAYLOAD, canonicalChecks, publishCanonicalRedPhase } = require("../src/red-observation");

function listings() {
  const baseline = [
    { listingStatus: "PUBLIC" },
    { listingStatus: "PUBLIC" },
  ];
  const payload = Array.from({ length: 20 }, () => ({ listingStatus: "PUBLIC" }));
  payload.push(
    { listingStatus: "UNPUBLISHED", syntheticReservationCount: 6850, internalReference: "FLAG{workshop-test}" },
    { listingStatus: "UNPUBLISHED", syntheticReservationCount: 6850, internalReference: "INTERNAL-2" },
    { listingStatus: "UNPUBLISHED", syntheticReservationCount: 6850, internalReference: "INTERNAL-3" },
    { listingStatus: "UNPUBLISHED", syntheticReservationCount: 6850, internalReference: "INTERNAL-4" },
  );
  return { baseline, payload };
}

test("canonical browser payload records verified Red evidence and publishes the phase", async () => {
  const { baseline, payload } = listings();
  let recorded;
  let published;
  const result = await publishCanonicalRedPhase(` ${CANONICAL_PAYLOAD} `, payload, baseline, {
    readState: () => ({ completedPhases: ["started"] }),
    recordEvidence: (phase, evidence) => { recorded = { phase, evidence }; },
    publishPhase: async (args) => { published = args; return { boardDelivered: true }; },
  });

  assert.deepEqual(result, { status: "board" });
  assert.deepEqual(published, ["red"]);
  assert.equal(recorded.phase, "red");
  assert.equal(recorded.evidence.command, "participant-ui-canonical-payload");
  assert.equal(recorded.evidence.checks.payloadCount, 24);
  assert.equal(recorded.evidence.checks.unpublishedCount, 4);
  assert.equal(recorded.evidence.checks.syntheticReservations, 27400);
  assert.equal(recorded.evidence.checks.flagCaptured, true);
});

test("Red observation refuses other inputs, incomplete evidence, and out-of-order phases", async () => {
  const { baseline, payload } = listings();
  assert.equal(canonicalChecks("Paris", payload, baseline), null);
  assert.equal(canonicalChecks(CANONICAL_PAYLOAD, payload.slice(0, 2), baseline), null);

  let publications = 0;
  const dependencies = {
    readState: () => ({ completedPhases: ["started", "red"] }),
    recordEvidence: () => assert.fail("invalid or out-of-order evidence must not be recorded"),
    publishPhase: async () => { publications += 1; },
  };
  assert.deepEqual(await publishCanonicalRedPhase("Paris", payload, baseline, dependencies), { status: "not-confirmed" });
  assert.deepEqual(await publishCanonicalRedPhase(CANONICAL_PAYLOAD, payload, baseline, dependencies), { status: "already-recorded" });
  assert.equal(publications, 0);
});

test("canonical browser search records Red evidence and sends the board event", async (t) => {
  const { baseline, payload } = listings();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-red-ui-"));
  const stateFile = path.join(directory, "state.json");
  fs.writeFileSync(stateFile, JSON.stringify({
    sessionId: "workshop-session",
    teamId: "participant-one",
    alias: "Purple Team",
    completedPhases: ["started"],
  }));
  const environment = ["TEAM_STATE_FILE", "BOARD_URL", "BOARD_TOKEN", "ALLOW_LOCAL_BOARD"];
  const previousEnvironment = new Map(environment.map((name) => [name, process.env[name]]));
  process.env.TEAM_STATE_FILE = stateFile;
  process.env.BOARD_TOKEN = "test-token";
  process.env.ALLOW_LOCAL_BOARD = "1";

  const boardEvents = [];
  const boardApp = express();
  boardApp.use(express.json());
  boardApp.post("/api/events", (request, response) => {
    boardEvents.push(request.body);
    response.json({ accepted: true });
  });
  const boardServer = boardApp.listen(0);
  await new Promise((resolve) => boardServer.once("listening", resolve));
  process.env.BOARD_URL = `http://127.0.0.1:${boardServer.address().port}`;

  const app = createApp({
    search: (city) => city === "Paris" ? baseline : payload,
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await Promise.all([server, boardServer].map((activeServer) => new Promise((resolve, reject) => {
      activeServer.close((error) => error ? reject(error) : resolve());
    })));
    for (const [name, value] of previousEnvironment) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/hotels?city=${encodeURIComponent(CANONICAL_PAYLOAD)}`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.hotels.length, 24);
  assert.equal(body.workshop.status, "board");
  assert.equal(boardEvents.length, 1);
  assert.equal(boardEvents[0].phase, "red");
  assert.equal(boardEvents[0].teamId, "participant-one");
  assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, "utf8")).completedPhases, ["started", "red"]);
  assert.equal(JSON.parse(fs.readFileSync(stateFile, "utf8")).evidence.red.command,
    "participant-ui-canonical-payload");
});