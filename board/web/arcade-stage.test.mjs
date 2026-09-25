import test from "node:test";
import assert from "node:assert/strict";
import { MISSION_PHASES, MAX_FORMATION_TEAMS, formationPositions } from "./mission-progress.js";
import {
  ARCADE_LEVELS,
  ARCADE_FLAG,
  arcadeLevelsAscending,
  arcadeLevelsDescending,
  arcadeDetailsFor,
  flagProgress,
  levelFourProgress,
} from "./arcade-stage.js";

test("the arcade stage covers exactly the mission phases", () => {
  assert.deepEqual(Object.keys(ARCADE_LEVELS).sort(), [...MISSION_PHASES].sort());
  assert.deepEqual(arcadeLevelsAscending().map((entry) => entry.phase), MISSION_PHASES);
  assert.deepEqual(arcadeLevelsDescending().map((entry) => entry.phase), [...MISSION_PHASES].reverse());
});

test("levels are numbered and stacked from the briefing floor up to the flag", () => {
  const levels = arcadeLevelsAscending();
  levels.forEach((entry, index) => assert.equal(entry.level, index));
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(
      levels[index].y < levels[index - 1].y,
      `${levels[index].phase} must sit above ${levels[index - 1].phase}`,
    );
  }
});

test("platforms narrow as the climb rises and the flag crowns the summit", () => {
  const levels = arcadeLevelsAscending();
  for (let index = 1; index < levels.length; index += 1) {
    assert.ok(
      levels[index].platform.width < levels[index - 1].platform.width,
      `${levels[index].phase} must be narrower than ${levels[index - 1].phase}`,
    );
  }
  assert.ok(ARCADE_FLAG.y < levels.at(-1).y, "the flag must sit above the summit platform");
});

test("a full house stays on its platform at every level", () => {
  for (const phase of MISSION_PHASES) {
    const teams = Array.from({ length: MAX_FORMATION_TEAMS }, (_, index) => ({
      teamId: `team-${String(index).padStart(2, "0")}`,
      phase,
    }));
    const level = ARCADE_LEVELS[phase];
    const positions = [...formationPositions(teams, ARCADE_LEVELS).values()];
    assert.equal(positions.length, MAX_FORMATION_TEAMS);
    const left = level.platform.left;
    const right = level.platform.left + level.platform.width;
    for (const position of positions) {
      assert.ok(position.x >= left && position.x <= right, `${phase} sprite left the platform at x=${position.x}`);
      assert.ok(Math.abs(position.y - level.y) <= level.formation.height / 2 + 0.001, `${phase} sprite left its band`);
    }
    // A wide platform fills its row before stacking, so the crowd stays shallow.
    const columns = new Set(positions.map((position) => position.x.toFixed(3)));
    assert.equal(columns.size, level.formation.maxColumns);
  }
});

test("a current 25-squad cohort lays out dynamically without waiting for capacity", () => {
  const teams = Array.from({ length: 25 }, (_, index) => ({
    teamId: `current-${String(index).padStart(2, "0")}`,
    phase: MISSION_PHASES[index % MISSION_PHASES.length],
    ciStatus: MISSION_PHASES[index % MISSION_PHASES.length] === "blue" ? "clean" : "pending",
  }));
  const positions = formationPositions(teams, ARCADE_LEVELS);

  assert.equal(positions.size, 25);
  for (const [teamId, position] of positions) {
    const level = ARCADE_LEVELS[position.phase];
    assert.ok(position.x >= level.platform.left, `${teamId} left its platform`);
    assert.ok(position.x <= level.platform.left + level.platform.width, `${teamId} left its platform`);
  }
  assert.deepEqual(flagProgress(teams), { captured: 5, total: 25, ratio: 0.2 });
});

test("mission copy is shared with the board instead of duplicated", () => {
  const details = arcadeDetailsFor("purple");
  assert.equal(details.squad, "Purple");
  assert.equal(details.label, "Prove it");
});

test("flag progress counts the squads whose CodeQL CI completed", () => {
  const teams = [
    { teamId: "a", phase: "blue", ciStatus: "clean" },
    { teamId: "b", phase: "blue", ciStatus: "clean" },
    { teamId: "c-pending", phase: "blue", ciStatus: "pending" },
    { teamId: "c", phase: "green" },
    { teamId: "d", phase: "onboarding" },
  ];
  assert.deepEqual(flagProgress(teams), { captured: 2, total: 5, ratio: 0.4 });
  assert.deepEqual(flagProgress([]), { captured: 0, total: 0, ratio: 0 });
});

test("level-four progress counts all Blue squads, including those with pending CI", () => {
  assert.deepEqual(
    levelFourProgress([
      { phase: "blue", ciStatus: "clean" },
      { phase: "blue", ciStatus: "pending" },
      { phase: "green" },
      { phase: "red" },
    ]),
    { levelFour: 2, total: 4, ratio: 0.5 },
  );
  assert.deepEqual(levelFourProgress([]), { levelFour: 0, total: 0, ratio: 0 });
});
