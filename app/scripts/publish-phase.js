const {
  readWorkshopState,
  recordCompletedPhase,
} = require("../src/workshop-progress");
const { resolveBoardConfig } = require("../src/board-config");
const { publishEvent } = require("../src/board-client");

const phases = ["red", "purple", "green", "blue"];

function validateSource(source) {
  return source === "participant"
    ? null
    : 'Invalid BOARD_EVENT_SOURCE: expected "participant".';
}

function validatePhaseGate(state, phase) {
  const completed = Array.isArray(state.completedPhases) ? state.completedPhases : ["started"];
  if (completed.includes(phase)) return `Phase ${phase} is already complete locally.`;

  const expected = phases[completed.length - 1];
  if (phase !== expected) {
    return `Complete phases in order. Expected ${expected || "no further phase"}, received ${phase}.`;
  }
  if (!state.evidence?.[phase]) {
    const commands = {
      red: "npm run exploit",
      purple: "npm run checkpoint",
      green: "npm run verify",
      blue: "npm run regressions",
    };
    return `Missing ${phase} evidence. Complete ${commands[phase]} first.`;
  }
  if (phase === "green" && state.approvals?.remediation?.strategy !== "parameter-binding") {
    return "Missing participant approval for parameter binding.";
  }
  if (phase === "blue" && state.evidence.blue?.pushed !== true) {
    return "Blue evidence must be tied to a correction pushed on main.";
  }
  return null;
}

async function publishToBoard(state, phase, source, boardConfig) {
  const payload = {
    sessionId: state.sessionId,
    teamId: state.teamId,
    alias: state.alias,
    phase,
    source,
  };

  return publishEvent(payload, boardConfig);
}

async function main() {
  const phase = process.argv[2];
  if (!phases.includes(phase)) {
    throw new Error(`Expected one of ${phases.join(", ")}.`);
  }

  const source = process.env.BOARD_EVENT_SOURCE || "participant";
  const sourceError = validateSource(source);
  if (sourceError) throw new Error(sourceError);

  const boardConfig = resolveBoardConfig();
  const state = readWorkshopState();
  const gateError = validatePhaseGate(state, phase);
  if (gateError) throw new Error(gateError);

  await publishToBoard(state, phase, source, boardConfig);
  recordCompletedPhase(phase);
  console.log(`Phase ${phase} recorded. You advanced the squad after reviewing its evidence.`);
  if (phase === "blue") {
    printLocalRecap();
  }
}

function printLocalRecap() {
  const state = readWorkshopState();
  const captured = Object.values(state.evidence)
    .map((entry) => entry?.flag)
    .filter(Boolean);
  console.log("");
  console.log(`CAPTURE COMPLETE for ${state.alias} (${state.teamId}).`);
  console.log(`Phases: ${state.completedPhases.join(" -> ")}`);
  console.log(`Flags captured: ${captured.length ? captured.join(", ") : "none recorded"}`);
  console.log("This local recap is authoritative even when the scoreboard is offline.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Phase not published: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, printLocalRecap, publishToBoard, validatePhaseGate, validateSource };
