const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validatePhaseGate, validateSource } = require("../scripts/publish-phase");
const { loadQuestionBank, selectQuestions, seededRandom } = require("../src/quiz");
const { CATEGORY, REF } = require("../src/codeql-evidence");

const script = path.resolve(__dirname, "../scripts/publish-phase.js");
const bank = loadQuestionBank();

function checkpoint(phase, teamId = "participant-one") {
  const questions = selectQuestions(bank, phase, seededRandom(teamId));
  return {
    version: 1,
    phase,
    seed: teamId,
    questionIds: questions.map((question) => question.id),
    answerHashes: questions.map((question) => ({ questionId: question.id, answerHash: bank.questions.find((entry) => entry.id === question.id).answerHash })),
    topics: [...new Set(questions.map((question) => question.topic))].sort(),
    passed: true,
  };
}

function evidence(phase, overrides = {}) {
  const values = {
    red: {
      command: "npm run exploit",
      checks: { baselineCount: 2, baselinePublic: true, payloadCount: 24, unpublishedCount: 4, syntheticReservations: 27400, flagCaptured: true },
    },
    purple: { command: "npm run checkpoint", gradedBy: "checkpoint-program", topics: ["flow", "sink", "source"] },
    green: {
      command: "npm run verify",
      approvedStrategy: "parameter-binding",
      checks: { normalCount: 2, normalPublic: true, lowercaseMatches: true, unknownCount: 0, emptyCount: 0, payloadCount: 0, unpublishedCount: 0, flagCount: 0 },
    },
    blue: {
      command: "npm run regressions",
      checks: { parisCount: 2, parisPublic: true, lowercaseMatches: true, unknownCount: 0, emptyCount: 0, payloadCount: 0, flagCount: 0 },
      branch: "main",
      commit: "a".repeat(40),
      pushed: true,
    },
  };
  return { recordedAt: "now", ...values[phase], ...overrides };
}

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
  const workshopState = state({
    evidence: { red: evidence("red") },
    checkpoints: { red: checkpoint("red") },
  });
  const { result, saved } = runPhase("red", workshopState);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Board publish skipped/);
  assert.match(result.stdout, /Phase red recorded/);
  assert.deepEqual(saved.completedPhases, ["started", "red"]);
});

test("phase publisher rejects the removed actions source before sending", () => {
  const workshopState = state({
    evidence: { red: evidence("red") },
    checkpoints: { red: checkpoint("red") },
  });
  const { result } = runPhase("red", workshopState, { BOARD_EVENT_SOURCE: "actions" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected "participant"/);
  assert.doesNotMatch(result.stderr, /Board publish skipped/);
});

test("phase publisher keeps the round going when the board is not configured", () => {
  const workshopState = state({
    evidence: { red: evidence("red") },
    checkpoints: { red: checkpoint("red") },
  });
  const { result, saved } = runPhase("red", workshopState, { BOARD_URL: "", BOARD_TOKEN: "" });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Offline mode/);
  assert.match(result.stderr, /Local progress is preserved/);
  assert.match(result.stdout, /Phase red recorded/);
  assert.deepEqual(saved.completedPhases, ["started", "red"]);
});

test("green phase requires explicit participant approval", () => {
  const workshopState = state({
    completedPhases: ["started", "red", "purple"],
    evidence: { green: evidence("green") },
    checkpoints: { green: checkpoint("green") },
  });
  assert.match(validatePhaseGate(workshopState, "green"), /Missing participant approval/);
});

test("blue phase requires evidence tied to a pushed commit", () => {
  const workshopState = state({
    completedPhases: ["started", "red", "purple", "green"],
    evidence: { blue: evidence("blue", { pushed: false }) },
    checkpoints: { blue: checkpoint("blue") },
  });
  assert.match(validatePhaseGate(workshopState, "blue"), /pushed on main/);
});

test("phase publisher rejects Red evidence without canonical exploit checks", () => {
  const workshopState = state({ evidence: { red: { recordedAt: "now", result: "PASS" } } });
  assert.match(validatePhaseGate(workshopState, "red"), /canonical exploit invariants/);
});

test("phase publisher rejects a passing non-Red quiz receipt with modified answer proof", () => {
  const receipt = checkpoint("purple");
  receipt.answerHashes[0].answerHash = "0".repeat(64);
  const workshopState = state({
    completedPhases: ["started", "red"],
    evidence: { purple: evidence("purple") },
    checkpoints: { purple: receipt },
  });
  assert.match(validatePhaseGate(workshopState, "purple"), /incorrect or duplicate answer/);
});

test("canonical browser evidence publishes Red without a Red quiz receipt", () => {
  const workshopState = state({
    evidence: { red: evidence("red", { command: "participant-ui-canonical-payload" }) },
  });
  assert.equal(validatePhaseGate(workshopState, "red"), null);
});

test("Purple and Blue require a human-reviewed CodeQL report, independently of the quiz", () => {
  const initial = { phase: "purple", repository: "participant/workshop", ref: REF, category: CATEGORY,
    commit: "b".repeat(40), analysisId: 1, alertNumber: 7, alertState: "open", resultCount: 1,
    reviewedBy: "participant", reviewedAt: new Date().toISOString() };
  for (const phase of ["purple", "blue"]) {
    const workshopState = state({
      completedPhases: phase === "purple" ? ["started", "red"] : ["started", "red", "purple", "green"],
      evidence: { [phase]: evidence(phase) }, checkpoints: { [phase]: checkpoint(phase) },
    });
    assert.match(validatePhaseGate(workshopState, phase), /Missing participant CodeQL review/);
    const review = phase === "purple" ? initial : { ...initial, phase, commit: "a".repeat(40), analysisId: 2,
      alertState: "fixed", resultCount: 0 };
    workshopState.codeqlReviews = { purple: initial, [phase]: review };
    assert.equal(validatePhaseGate(workshopState, phase), null);
  }
});
