const fs = require("node:fs");
const crypto = require("node:crypto");
const { resolveBoardConfig } = require("../src/board-config");
const { stateFilePath, writeWorkshopState } = require("../src/workshop-progress");

const stateFile = stateFilePath();
const adjectives = ["Purple", "Crimson", "Azure", "Emerald", "Golden", "Silver", "Velvet", "Obsidian"];
const nouns = ["Comet", "Falcon", "Circuit", "Voyager", "Beacon", "Aurora", "Pulse", "Nova"];
const aliasPattern = /^[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*$/;

function randomItem(items) {
  return items[crypto.randomInt(items.length)];
}

function createAlias() {
  return `${randomItem(adjectives)} ${randomItem(nouns)}`;
}

function createTeamId() {
  const configured = process.env.BOARD_TEAM_ID?.trim();
  if (!configured) {
    throw new Error("BOARD_TEAM_ID is required. Ask a facilitator to provision this repository.");
  }
  if (configured.length < 3 || configured.length > 80) {
    throw new Error("BOARD_TEAM_ID must contain between 3 and 80 characters.");
  }
  return configured;
}

function readExistingTeamState() {
  if (!fs.existsSync(stateFile)) return null;
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (
      state &&
      typeof state.teamId === "string" &&
      state.teamId.length >= 3 &&
      state.teamId.length <= 80 &&
      typeof state.sessionId === "string" &&
      state.sessionId.length >= 3 &&
      state.sessionId.length <= 80 &&
      typeof state.alias === "string" &&
      state.alias.length >= 3 &&
      state.alias.length <= 40 &&
      aliasPattern.test(state.alias)
    ) {
      return {
        teamId: state.teamId,
        sessionId: state.sessionId,
        alias: state.alias,
        approvals: state.approvals && typeof state.approvals === "object" ? state.approvals : {},
        evidence: state.evidence && typeof state.evidence === "object" ? state.evidence : {},
        completedPhases: Array.isArray(state.completedPhases) ? state.completedPhases : ["started"],
      };
    }
  } catch (error) {
    console.warn(`Existing team state could not be read; creating a new identity: ${error.message}`);
  }
  return null;
}

async function publishStarted(payload, { boardUrl, boardToken }) {
  try {
    const response = await fetch(`${boardUrl}/api/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-board-reporter-token": boardToken,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      console.warn(`Board registration returned HTTP ${response.status}.`);
    }
  } catch (error) {
    console.warn(`Board registration skipped: ${error.message}`);
  }
}

async function main() {
  const boardConfig = resolveBoardConfig();
  const sessionId = process.env.BOARD_SESSION_ID?.trim();
  if (!sessionId) {
    throw new Error("BOARD_SESSION_ID is required. Ask a facilitator to provision this repository.");
  }
  const provisionedTeamId = createTeamId();
  const existingTeamState = readExistingTeamState();
  if (
    existingTeamState
    && (existingTeamState.teamId !== provisionedTeamId || existingTeamState.sessionId !== sessionId)
  ) {
    throw new Error("Existing participant state does not match the provisioned board identity.");
  }
  const teamState = existingTeamState || {
    teamId: provisionedTeamId,
    sessionId,
    alias: createAlias(),
    approvals: {},
    evidence: {},
    completedPhases: ["started"],
  };
  writeWorkshopState(teamState);

  const payload = {
    sessionId: teamState.sessionId,
    teamId: teamState.teamId,
    alias: teamState.alias,
    phase: "started",
    source: "participant",
  };

  await publishStarted(payload, boardConfig);
  console.log(`Registered ${teamState.alias} (${teamState.teamId}).`);
  console.log("You publish each later board phase yourself after its evidence command passes.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Registration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { createTeamId, main, publishStarted, readExistingTeamState };
