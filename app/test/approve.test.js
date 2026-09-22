const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../scripts/approve.js");

function runApproval(state, strategy = "parameter-binding") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "workshop-approval-"));
  const stateFile = path.join(directory, ".team-state.json");
  fs.writeFileSync(stateFile, `${JSON.stringify(state)}\n`);
  const result = spawnSync(process.execPath, [script, strategy], {
    encoding: "utf8",
    env: { ...process.env, TEAM_STATE_FILE: stateFile },
  });
  const updated = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  fs.rmSync(directory, { recursive: true, force: true });
  return { result, updated };
}

test("participant can approve parameter binding after the CodeQL phase", () => {
  const { result, updated } = runApproval({
    teamId: "participant-one",
    sessionId: "universe-2026",
    alias: "Purple Team",
    evidence: { purple: { result: "source-flow-sink" } },
    completedPhases: ["started", "red", "purple"],
  });
  assert.equal(result.status, 0);
  assert.equal(updated.approvals.remediation.strategy, "parameter-binding");
  assert.equal(updated.approvals.remediation.approvedBy, "participant");
});

test("approval is rejected before the CodeQL phase", () => {
  const { result, updated } = runApproval({
    teamId: "participant-one",
    sessionId: "universe-2026",
    alias: "Purple Team",
    evidence: {},
    completedPhases: ["started", "red"],
  });
  assert.equal(result.status, 1);
  assert.equal(updated.approvals, undefined);
});
