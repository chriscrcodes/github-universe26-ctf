const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../scripts/checkpoint.js");

function runCheckpoint(args) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-checkpoint-"));
  const stateFile = path.join(directory, ".team-state.json");
  fs.writeFileSync(stateFile, `${JSON.stringify({
    teamId: "participant-one",
    sessionId: "20260922",
    alias: "Purple Team",
    evidence: {},
    completedPhases: ["started", "red"],
  })}\n`);
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, TEAM_STATE_FILE: stateFile },
  });
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  fs.rmSync(directory, { recursive: true, force: true });
  return { result, state };
}

test("the understanding check records evidence after correct answers", () => {
  const { result, state } = runCheckpoint([
    "--answers=source-city:a,sink-execution:c,flow-unsafe:b",
  ]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /understanding confirmed/);
  assert.equal(state.evidence.purple.gradedBy, "mentor");
  assert.deepEqual(state.evidence.purple.topics.sort(), ["flow", "sink", "source"]);
});

test("the understanding check rejects an incorrect answer without revealing the right one", () => {
  const { result, state } = runCheckpoint([
    "--answers=source-city:a,sink-execution:b,flow-unsafe:b",
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Answer to sink-execution is incorrect/);
  assert.doesNotMatch(result.stderr, /`db.prepare/);
  assert.equal(state.evidence.purple, undefined);
});

test("the understanding check requires several distinct topics", () => {
  const { result } = runCheckpoint([
    "--answers=source-city:a,source-entry:b",
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Answer at least 3 questions/);

  const sameTopic = runCheckpoint([
    "--answers=source-city:a,source-entry:b,sink-execution:c",
  ]);
  assert.equal(sameTopic.result.status, 1);
  assert.match(sameTopic.result.stderr, /at least 3 different topics/);
});

test("the understanding check cannot be passed without Mentor grading the answers", () => {
  const { result } = runCheckpoint([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Ask Mentor/);
});

test("Mentor can list a randomized set of questions without the answers", () => {
  const { result } = runCheckpoint(["--list"]);
  assert.equal(result.status, 0);
  const lines = result.stdout.trim().split("\n").filter((line) => !line.startsWith("  "));
  assert.equal(lines.length, 3);
  assert.doesNotMatch(result.stdout, /answerHash/);
});
