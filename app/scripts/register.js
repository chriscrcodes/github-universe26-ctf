const fs = require("node:fs");
const crypto = require("node:crypto");
const { resolveBoardConfig } = require("../src/board-config");
const { publishEvent } = require("../src/board-client");
const { resolveParticipantIdentity } = require("../src/participant-identity");
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

function resolveTeamState(identity, existingTeamState) {
  if (!existingTeamState) {
    return {
      teamId: identity.teamId,
      sessionId: identity.sessionId,
      alias: createAlias(),
      approvals: {},
      evidence: {},
      completedPhases: ["started"],
    };
  }
  if (existingTeamState.teamId !== identity.teamId) {
    throw new Error(
      `Existing participant state belongs to ${existingTeamState.teamId}, not ${identity.teamId}.`
    );
  }
  // A Codespace resumed on another day keeps its evidence and only moves to
  // the current session identifier.
  return { ...existingTeamState, sessionId: identity.sessionId };
}

async function main() {
  const boardConfig = resolveBoardConfig();
  const identity = resolveParticipantIdentity();
  const teamState = resolveTeamState(identity, readExistingTeamState());
  writeWorkshopState(teamState);

  const payload = {
    sessionId: teamState.sessionId,
    teamId: teamState.teamId,
    alias: teamState.alias,
    phase: "started",
    source: "participant",
  };

  await publishEvent(payload, boardConfig);
  console.log(`Registered ${teamState.alias} (${teamState.teamId}) for session ${teamState.sessionId}.`);
  if (boardConfig.mode !== "board") {
    console.log("The scoreboard is unavailable; progress is saved locally. CodeQL review still requires GitHub access.");
  }
  console.log("Mentor guides each phase. Squad publishes after your evidence review, checkpoint and explicit agreement.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Registration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, readExistingTeamState, resolveTeamState };
