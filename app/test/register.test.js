const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../scripts/register.js");

function runRegister(stateFile, extraEnv = {}) {
  return spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      BOARD_URL: "http://127.0.0.1:1",
      BOARD_TOKEN: "test-token",
      BOARD_USER: "participant-one",
      BOARD_SESSION_ID: "20260922",
      ALLOW_LOCAL_BOARD: "1",
      TEAM_STATE_FILE: stateFile,
      BOARD_OUTBOX_FILE: path.join(path.dirname(stateFile), ".board-outbox.log"),
      ...extraEnv,
    },
  });
}

function withTemporaryDirectory(prefix, run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("registration succeeds and stays local when the board is not provisioned", () => {
  withTemporaryDirectory("facilitator-register-offline-", (directory) => {
    const stateFile = path.join(directory, ".team-state.json");
    const result = runRegister(stateFile, { BOARD_URL: "", BOARD_TOKEN: "" });
    assert.equal(result.status, 0);
    assert.match(result.stderr + result.stdout, /Offline mode/);
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.equal(state.teamId, "participant-one");
    assert.equal(state.sessionId, "20260922");
    const outbox = fs.readFileSync(path.join(directory, ".board-outbox.log"), "utf8").trim();
    assert.match(outbox, /"phase":"started"/);
  });
});

test("registration reuses one participant identity across repeated calls", () => {
  withTemporaryDirectory("facilitator-register-", (directory) => {
    const stateFile = path.join(directory, ".team-state.json");
    assert.equal(runRegister(stateFile).status, 0);
    const first = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    first.evidence.red = { recordedAt: "2026-09-21T12:00:00.000Z" };
    first.completedPhases.push("red");
    fs.writeFileSync(stateFile, `${JSON.stringify(first, null, 2)}\n`);

    assert.equal(runRegister(stateFile).status, 0);
    const second = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    assert.deepEqual(second, first);
  });
});

test("registration derives the team id from the participant handle", () => {
  withTemporaryDirectory("facilitator-register-handle-", (directory) => {
    const stateFile = path.join(directory, ".team-state.json");
    const result = runRegister(stateFile, { BOARD_USER: "Octo-Cat", BOARD_TEAM_ID: "" });
    assert.equal(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.equal(state.teamId, "octo-cat");
  });
});

test("a resumed Codespace keeps its evidence and moves to the current event day", () => {
  withTemporaryDirectory("facilitator-register-day-", (directory) => {
    const stateFile = path.join(directory, ".team-state.json");
    assert.equal(runRegister(stateFile, { BOARD_SESSION_ID: "20260921" }).status, 0);
    const first = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    first.evidence.red = { recordedAt: "2026-09-21T12:00:00.000Z" };
    fs.writeFileSync(stateFile, `${JSON.stringify(first, null, 2)}\n`);

    assert.equal(runRegister(stateFile, { BOARD_SESSION_ID: "20260922" }).status, 0);
    const second = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.equal(second.sessionId, "20260922");
    assert.equal(second.alias, first.alias);
    assert.deepEqual(second.evidence, first.evidence);
  });
});

test("registration refuses to take over another participant state", () => {
  withTemporaryDirectory("facilitator-register-conflict-", (directory) => {
    const stateFile = path.join(directory, ".team-state.json");
    assert.equal(runRegister(stateFile).status, 0);
    const result = runRegister(stateFile, { BOARD_USER: "someone-else" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /belongs to participant-one/);
  });
});
