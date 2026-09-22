import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { MISSION_PHASES, avatarFor, displayNameFor, formationPositions, missionPhaseFor } from "./mission-progress.js";
import { ARCADE_LEVELS, flagProgress } from "./arcade-stage.js";

const boardHtml = await readFile(fileURLToPath(new URL("./index.html", import.meta.url)), "utf8");

test("Arcade route ends with Blue's verified victory", () => {
  assert.deepEqual(MISSION_PHASES, ["onboarding", "red", "purple", "green", "blue"]);
});

test("Blue distinguishes local verification from CodeQL CI completion", () => {
  assert.match(boardHtml, /Local verification \+ CI completion/);
  assert.match(boardHtml, /Verify locally, then CI/);
  assert.deepEqual(
    flagProgress([
      { phase: "blue", ciStatus: "pending" },
      { phase: "blue", ciStatus: "clean" },
    ]),
    { captured: 1, total: 2, ratio: 1 / 2 },
  );
});

test("the room board reports collective progress without a speed ranking", () => {
  assert.match(boardHtml, /id="collective-investigating"/);
  assert.match(boardHtml, /id="collective-fixing"/);
  assert.match(boardHtml, /id="collective-complete"/);
  assert.doesNotMatch(boardHtml, /Fastest three|id="podium"/);
});

test("the room board exposes only the Arcade theme", () => {
  assert.match(boardHtml, /href="board\.css"/);
  assert.match(boardHtml, /href="arcade\.css"/);
  assert.match(boardHtml, /src="board\.js"/);
  assert.doesNotMatch(boardHtml, /fort-mason|mission-map|theme-switch/i);
});

test("board phases retain the Arcade progression", () => {
  assert.equal(missionPhaseFor("started"), "onboarding");
  assert.equal(missionPhaseFor("red"), "red");
  assert.equal(missionPhaseFor("blue"), "blue");
  assert.equal(missionPhaseFor("unknown"), null);
});

test("team avatar and display name are deterministic", () => {
  assert.deepEqual(avatarFor("team-a"), avatarFor("team-a"));
  assert.equal(displayNameFor({ githubLogin: "octocat", alias: "Purple Team" }), "octocat");
});

test("a single Arcade level lays out sixty teams at distinct readable positions", () => {
  const teams = Array.from({ length: 60 }, (_, index) => ({
    teamId: `team-${String(index).padStart(2, "0")}`,
    phase: "red",
  }));
  const positions = [...formationPositions(teams, ARCADE_LEVELS).values()];

  assert.equal(positions.length, 60);
  assert.equal(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size, 60);
  assert.ok(positions.every(({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100));
});

test("every formation stays inside its Arcade level at full capacity", () => {
  for (const phase of MISSION_PHASES) {
    const details = ARCADE_LEVELS[phase];
    const teams = Array.from({ length: 60 }, (_, index) => ({
      teamId: `team-${String(index).padStart(2, "0")}`,
      phase,
    }));
    const positions = [...formationPositions(teams, ARCADE_LEVELS).values()];
    const columns = new Set(positions.map(({ x }) => x.toFixed(4)));

    assert.equal(positions.length, 60, `${phase} must place every team`);
    assert.ok(
      columns.size <= details.formation.maxColumns,
      `${phase} must not exceed ${details.formation.maxColumns} columns`,
    );
    assert.ok(
      positions.every(({ x, y }) =>
        Math.abs(x - details.x) <= details.formation.width / 2 + 1e-9 &&
        Math.abs(y - details.y) <= details.formation.height / 2 + 1e-9),
      `${phase} must keep every team inside its zone`,
    );
  }
});
