const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../scripts/checkpoint.js");

function runCheckpoint(answers) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-checkpoint-"));
  const stateFile = path.join(directory, ".team-state.json");
  fs.writeFileSync(stateFile, `${JSON.stringify({
    teamId: "participant-one",
    sessionId: "universe-2026",
    alias: "Purple Team",
    evidence: {},
    completedPhases: ["started", "red"],
  })}\n`);
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, TEAM_STATE_FILE: stateFile, CHECKPOINT_ANSWERS: answers },
  });
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  fs.rmSync(directory, { recursive: true, force: true });
  return { result, state };
}

test("CodeQL checkpoint records evidence after correct answers", () => {
  const { result, state } = runCheckpoint("1,1,1");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /source, sink, and unsafe data flow confirmed/);
  assert.ok(state.evidence.purple);
});

test("CodeQL checkpoint rejects an incorrect answer", () => {
  const { result, state } = runCheckpoint("1,2,1");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /answer 2 is incorrect/);
  assert.equal(state.evidence.purple, undefined);
});
