import { PHASE_DETAILS, MISSION_PHASES } from "./mission-progress.js";

/**
 * The five phases are five stacked levels and the flag is planted on top of
 * the last one.
 *
 * Levels are listed bottom-up: `onboarding` is the ground floor, `blue` is the
 * summit. Platforms narrow as they rise, so the climb reads as a pyramid and
 * the flag at the top is never crowded.
 */
export const ARCADE_LEVELS = {
  onboarding: {
    level: 0,
    label: "Briefing",
    cue: "Check in",
    platform: { left: 4, width: 74, top: 92.5 },
    x: 41, y: 86, formation: { width: 66, height: 9, maxColumns: 12, fillRows: true },
  },
  red: {
    level: 1,
    label: "Break it",
    cue: "Reproduce the flaw",
    platform: { left: 9, width: 66, top: 76 },
    x: 42, y: 69.5, formation: { width: 58, height: 9, maxColumns: 12, fillRows: true },
  },
  purple: {
    level: 2,
    label: "Prove it",
    cue: "CodeQL confirms it",
    platform: { left: 14, width: 58, top: 59.5 },
    x: 43, y: 53, formation: { width: 50, height: 9, maxColumns: 12, fillRows: true },
  },
  green: {
    level: 3,
    label: "Fix it",
    cue: "Ship the patch",
    platform: { left: 19, width: 50, top: 43 },
    x: 44, y: 36.5, formation: { width: 42, height: 9, maxColumns: 12, fillRows: true },
  },
  blue: {
    level: 4,
    label: "Capture",
    cue: "Verify locally, then CI",
    platform: { left: 24, width: 42, top: 26.5 },
    x: 45, y: 20, formation: { width: 34, height: 9, maxColumns: 12, fillRows: true },
  },
};

/**
 * Where the flag is planted: on a short summit block just past the last
 * platform, clear of the formation standing on it.
 */
export const ARCADE_FLAG = { x: 72, y: 11, platform: { left: 66, width: 12, top: 20 } };

/** Mission copy stays in one place; the arcade only adds its own labels. */
export function arcadeDetailsFor(phase) {
  return { ...PHASE_DETAILS[phase], ...ARCADE_LEVELS[phase] };
}

/** Levels bottom-up, the order a squad climbs them. */
export function arcadeLevelsAscending() {
  return MISSION_PHASES.map((phase) => ({ phase, ...ARCADE_LEVELS[phase] }));
}

/** Levels top-down, the order the stage is read on screen. */
export function arcadeLevelsDescending() {
  return arcadeLevelsAscending().slice().reverse();
}

/** Share of squads that have reached the Blue (LV4) phase. */
export function levelFourProgress(teams) {
  const levelFour = teams.filter((team) => team.phase === "blue").length;
  const total = teams.length;
  return { levelFour, total, ratio: total ? levelFour / total : 0 };
}

/**
 * How much of the flag the room has captured: the share of squads that reached
 * the summit. This is the headline the audience watches, not a ranking.
 */
export function flagProgress(teams) {
  const captured = teams.filter((team) => team.phase === "blue" && team.ciStatus === "clean").length;
  return { captured, total: teams.length, ratio: teams.length ? captured / teams.length : 0 };
}
