const {
  readWorkshopState,
  recordCompletedPhase,
} = require("../src/workshop-progress");
const { resolveBoardConfig } = require("../src/board-config");

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

async function publishToBoard(state, phase, source, { boardUrl, boardToken }) {
  const payload = {
    sessionId: state.sessionId,
    teamId: state.teamId,
    alias: state.alias,
    phase,
    source,
  };

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
      console.warn(`Board phase publish returned HTTP ${response.status}; local progress is preserved.`);
    }
  } catch (error) {
    console.warn(`Board phase publish skipped: ${error.message}`);
  }
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
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Phase not published: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, publishToBoard, validatePhaseGate, validateSource };
