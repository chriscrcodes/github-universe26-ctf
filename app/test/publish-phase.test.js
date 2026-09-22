const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validatePhaseGate, validateSource } = require("../scripts/publish-phase");

const script = path.resolve(__dirname, "../scripts/publish-phase.js");

function state(overrides = {}) {
  return {
    teamId: "participant-one",
    sessionId: "universe-2026",
    alias: "Purple Team",
    completedPhases: ["started"],
    approvals: {},
    evidence: {},
    ...overrides,
  };
}

function runPhase(phase, workshopState, extraEnv = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-phase-"));
  const stateFile = path.join(directory, ".team-state.json");
  fs.writeFileSync(stateFile, `${JSON.stringify(workshopState, null, 2)}\n`);
  const result = spawnSync(process.execPath, [script, phase], {
    encoding: "utf8",
    env: {
      ...process.env,
      BOARD_URL: "http://127.0.0.1:1",
      BOARD_TOKEN: "test-token",
      ALLOW_LOCAL_BOARD: "1",
      TEAM_STATE_FILE: stateFile,
      ...extraEnv,
    },
  });
  const saved = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  fs.rmSync(directory, { recursive: true, force: true });
  return { result, saved };
}

test("phase publisher accepts only the participant source", () => {
  assert.equal(validateSource("participant"), null);
  assert.match(validateSource("actions"), /Invalid BOARD_EVENT_SOURCE/);
  assert.match(validateSource(""), /Invalid BOARD_EVENT_SOURCE/);
});

test("phase publisher rejects a command without its evidence receipt", () => {
  const { result, saved } = runPhase("red", state());
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing red evidence/);
  assert.deepEqual(saved.completedPhases, ["started"]);
});

test("phase publisher rejects skipping directly to a later phase", () => {
  const workshopState = state({ evidence: { purple: { recordedAt: "now" } } });
  const { result } = runPhase("purple", workshopState);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Expected red, received purple/);
});

test("participant phase command advances local progress after evidence", () => {
  const workshopState = state({ evidence: { red: { recordedAt: "now" } } });
  const { result, saved } = runPhase("red", workshopState);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Board phase publish skipped/);
  assert.match(result.stdout, /Phase red recorded/);
  assert.deepEqual(saved.completedPhases, ["started", "red"]);
});

test("phase publisher rejects the removed actions source before sending", () => {
  const workshopState = state({ evidence: { red: { recordedAt: "now" } } });
  const { result } = runPhase("red", workshopState, { BOARD_EVENT_SOURCE: "actions" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected "participant"/);
  assert.doesNotMatch(result.stderr, /Board phase publish skipped/);
});

test("phase publisher requires shared board configuration", () => {
  const workshopState = state({ evidence: { red: { recordedAt: "now" } } });
  const { result, saved } = runPhase("red", workshopState, { BOARD_URL: "", BOARD_TOKEN: "" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /BOARD_URL is required/);
  assert.deepEqual(saved.completedPhases, ["started"]);
});

test("green phase requires explicit participant approval", () => {
  const workshopState = state({
    completedPhases: ["started", "red", "purple"],
    evidence: { green: { recordedAt: "now" } },
  });
  assert.match(validatePhaseGate(workshopState, "green"), /Missing participant approval/);
});

test("blue phase requires evidence tied to a pushed commit", () => {
  const workshopState = state({
    completedPhases: ["started", "red", "purple", "green"],
    evidence: { blue: { recordedAt: "now", pushed: false } },
  });
  assert.match(validatePhaseGate(workshopState, "blue"), /pushed on main/);
});
