export const MAX_FORMATION_TEAMS = 60;

// Up to this many squads in one zone, the formation stays a single column so
// their name labels stack vertically instead of colliding side by side.
export const LABELLED_FORMATION_MAX = 3;

// Vertical pitch, in map percent, that clears a sprite plus its name plate.
const LABELLED_ROW_PITCH = 4.6;

export const MISSION_PHASES = [
  "onboarding",
  "red",
  "purple",
  "green",
  "blue",
];

export const PHASE_DETAILS = {
  onboarding: {
    squad: "Start",
    title: "Briefing",
    shortLabel: "Briefing",
    goal: "Repository is running and the squad is registered.",
  },
  red: {
    squad: "Red",
    title: "Break it",
    shortLabel: "Red · Break it",
    goal: "The SQL injection is reproduced safely and explained.",
  },
  purple: {
    squad: "Purple",
    title: "Prove it",
    shortLabel: "Purple · Prove it",
    goal: "Red and Blue agree: CodeQL confirms the same flaw.",
  },
  green: {
    squad: "Green",
    title: "Fix it",
    shortLabel: "Green · Fix it",
    goal: "The smallest parameterized-query fix is applied.",
  },
  blue: {
    squad: "Blue",
    title: "Confirm the fix",
    shortLabel: "Blue · Confirm the fix",
    goal: "Local verification passes; CodeQL CI completes the capture.",
  },
};

const LEGACY_PHASES = {
  started: "onboarding",
};

export function missionPhaseFor(phase) {
  const normalized = typeof phase === "string" ? phase.trim().toLowerCase() : "";
  return PHASE_DETAILS[normalized] ? normalized : LEGACY_PHASES[normalized] || null;
}

export function displayNameFor(team, index = 0) {
  const login = typeof team?.githubLogin === "string" ? team.githubLogin.trim() : "";
  const alias = typeof team?.alias === "string" ? team.alias.trim() : "";
  return login || alias || `Team ${index + 1}`;
}

export function stableNumber(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function avatarFor(teamId) {
  const hash = stableNumber(teamId);
  return {
    color: ["coral", "gold", "mint", "sky", "violet", "rose"][hash % 6],
    facing: hash % 2 ? "right" : "left",
    offsetX: ((hash >>> 4) % 7) - 3,
    offsetY: ((hash >>> 8) % 5) - 2,
  };
}

/**
 * Lays every squad out in a stable grid at its phase anchor.
 */
export function formationPositions(teams, details) {
  const positions = new Map();
  for (const phase of MISSION_PHASES) {
    const phaseTeams = teams
      .filter((team) => team.phase === phase)
      .slice()
      .sort((left, right) => left.teamId.localeCompare(right.teamId));
    const anchor = details[phase];
    // A wide, shallow zone — an arcade platform — fills its row before it
    // stacks a new one; a square zone grows as a square.
    const columns = phaseTeams.length <= LABELLED_FORMATION_MAX
      ? 1
      : Math.min(
        anchor.formation.maxColumns ?? Number.POSITIVE_INFINITY,
        anchor.formation.fillRows
          ? phaseTeams.length
          : Math.max(1, Math.ceil(Math.sqrt(phaseTeams.length))),
      );
    const rows = Math.ceil(phaseTeams.length / columns);
    // Spacing is a fixed pitch sized for a full house, so a handful of squads
    // clusters tightly instead of being stretched across the whole footprint.
    const maxColumns = Math.min(anchor.formation.maxColumns ?? MAX_FORMATION_TEAMS, MAX_FORMATION_TEAMS);
    const maxRows = Math.ceil(MAX_FORMATION_TEAMS / maxColumns);
    const columnPitch = maxColumns > 1 ? anchor.formation.width / (maxColumns - 1) : 0;
    // A single labelled column needs room for the name plate under each sprite.
    const rowPitch = columns === 1
      ? LABELLED_ROW_PITCH
      : (maxRows > 1 ? anchor.formation.height / (maxRows - 1) : 0);

    phaseTeams.forEach((team, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const xOffset = (column - (columns - 1) / 2) * columnPitch;
      const yOffset = (row - (rows - 1) / 2) * rowPitch;
      positions.set(team.teamId, { phase, x: anchor.x + xOffset, y: anchor.y + yOffset });
    });
  }
  return positions;
}
