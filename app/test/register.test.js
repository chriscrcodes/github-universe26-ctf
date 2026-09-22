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
      BOARD_TEAM_ID: "participant-one",
      BOARD_SESSION_ID: "universe-2026",
      ALLOW_LOCAL_BOARD: "1",
      TEAM_STATE_FILE: stateFile,
      ...extraEnv,
    },
  });
}

test("registration fails before creating state when board configuration is missing", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "facilitator-register-config-"));
  const stateFile = path.join(directory, ".team-state.json");
  try {
    const result = runRegister(stateFile, { BOARD_URL: "", BOARD_TOKEN: "" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /BOARD_URL is required/);
    assert.equal(fs.existsSync(stateFile), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("registration reuses one participant identity across repeated facilitator calls", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "facilitator-register-"));
  const stateFile = path.join(directory, ".team-state.json");
  try {
    assert.equal(runRegister(stateFile).status, 0);
    const first = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    first.evidence.red = { recordedAt: "2026-09-21T12:00:00.000Z" };
    first.completedPhases.push("red");
    fs.writeFileSync(stateFile, `${JSON.stringify(first, null, 2)}\n`);

    assert.equal(runRegister(stateFile).status, 0);
    const second = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    assert.deepEqual(second, first);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("registration uses a provisioned board team id for CI correlation", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "facilitator-register-team-id-"));
  const stateFile = path.join(directory, ".team-state.json");
  try {
    const result = runRegister(stateFile, { BOARD_TEAM_ID: "participant-repository-42" });
    assert.equal(result.status, 0);
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    assert.equal(state.teamId, "participant-repository-42");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
