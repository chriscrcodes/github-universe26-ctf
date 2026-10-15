import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runWorkshop(answer, entrypoint = "workshop", args = ["phase", "red"]) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "workshop-command-"));
  const stateFile = path.join(directory, "team-state.json");
  writeFileSync(stateFile, `${JSON.stringify({
    teamId: "participant-one",
    sessionId: "universe-2026",
    alias: "Purple Team",
    completedPhases: ["started"],
    approvals: {},
    evidence: { red: {
      kind: "initial-delivery",
      pushed: true,
      ref: "refs/heads/feature/city-search",
      exposure: {
        fixture: "synthetic-hotels-v1",
        input: "' OR 1=1 -- ",
        unpublishedCount: 4,
        syntheticReservationCount: 27400,
      },
    } },
  })}\n`);

  const result = spawnSync("npm", ["run", entrypoint, "--", ...args], {
    cwd: root,
    encoding: "utf8",
    input: answer,
    env: {
      ...process.env,
      BOARD_URL: "",
      BOARD_TOKEN: "",
      TEAM_STATE_FILE: stateFile,
    },
  });
  const saved = JSON.parse(readFileSync(stateFile, "utf8"));
  rmSync(directory, { recursive: true, force: true });
  return { result, saved };
}

test("workshop phase command leaves progress unchanged when publication is declined", () => {
  const { result, saved } = runWorkshop("n\n");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Publish phase red to the scoreboard\?/);
  assert.match(result.stdout, /Phase red was not published/);
  assert.deepEqual(saved.completedPhases, ["started"]);
});

test("legacy phase alias also requires confirmation", () => {
  const { result, saved } = runWorkshop("n\n", "phase", ["red"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Publish phase red to the scoreboard\?/);
  assert.deepEqual(saved.completedPhases, ["started"]);
});

test("workshop phase command publishes only after explicit confirmation", () => {
  const { result, saved } = runWorkshop("y\n");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Phase red recorded/);
  assert.deepEqual(saved.completedPhases, ["started", "red"]);
});