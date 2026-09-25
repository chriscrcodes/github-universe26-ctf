const {
  readWorkshopState,
  recordCompletedPhase,
} = require("../src/workshop-progress");
const { resolveBoardConfig } = require("../src/board-config");
const { publishEvent } = require("../src/board-client");
const { QUIZ_PHASES, loadQuestionBank, validateCheckpoint } = require("../src/quiz");
const { revalidateCodeqlReview, validateCodeqlReview } = require("../src/codeql-evidence");

const phases = QUIZ_PHASES;

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
  if (phase !== "red") {
    const checkpointError = validateCheckpoint(
      loadQuestionBank(),
      phase,
      state.teamId,
      state.checkpoints?.[phase]
    );
    if (checkpointError) return `Invalid ${phase} quiz receipt: ${checkpointError}`;
  }

  if (phase === "blue" && state.evidence.blue?.pushed !== true) {
    return "Blue evidence must be tied to a correction pushed on main.";
  }
  const evidenceError = validatePhaseEvidence(phase, state.evidence[phase]);
  if (evidenceError) return evidenceError;
  if (phase === "green" && state.approvals?.remediation?.strategy !== "parameter-binding") {
    return "Missing participant approval for parameter binding.";
  }
  if (phase === "purple" || phase === "blue") {
    return validateCodeqlReview(state.codeqlReviews?.[phase], phase, state.codeqlReviews?.purple, state.evidence?.blue);
  }
  return null;
}

function validatePhaseEvidence(phase, evidence) {
  const checks = evidence.checks;
  if (phase === "red" && (
    !["npm run exploit", "participant-ui-canonical-payload"].includes(evidence.command)
    || checks?.baselineCount !== 2
    || checks?.baselinePublic !== true
    || checks?.payloadCount !== 24
    || checks?.unpublishedCount !== 4
    || checks?.syntheticReservations !== 27400
    || checks?.flagCaptured !== true
  )) {
    return "Red evidence does not satisfy the canonical exploit invariants.";
  }
  if (phase === "purple" && (
    evidence.command !== "npm run checkpoint"
    || evidence.gradedBy !== "checkpoint-program"
    || !Array.isArray(evidence.topics)
    || evidence.topics.length !== 3
  )) {
    return "Purple evidence does not contain the passing checkpoint result.";
  }
  if (phase === "green" && (
    evidence.command !== "npm run verify"
    || evidence.approvedStrategy !== "parameter-binding"
    || checks?.normalCount !== 2
    || checks?.normalPublic !== true
    || checks?.lowercaseMatches !== true
    || checks?.unknownCount !== 0
    || checks?.emptyCount !== 0
    || checks?.payloadCount !== 0
    || checks?.unpublishedCount !== 0
    || checks?.flagCount !== 0
  )) {
    return "Green evidence does not satisfy the approved runtime verification invariants.";
  }
  if (phase === "blue" && (
    evidence.command !== "npm run regressions"
    || checks?.parisCount !== 2
    || checks?.parisPublic !== true
    || checks?.lowercaseMatches !== true
    || checks?.unknownCount !== 0
    || checks?.emptyCount !== 0
    || checks?.payloadCount !== 0
    || checks?.flagCount !== 0
    || evidence.branch !== "main"
    || !/^[a-fA-F0-9]{40,64}$/.test(evidence.commit || "")
    || evidence.pushed !== true
  )) {
    return "Blue evidence does not satisfy the participant regression invariants.";
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
    ...(phase === "blue" ? {
      repository: state.codeqlReviews.blue.repository,
      commitSha: state.codeqlReviews.blue.commit,
    } : {}),
  };

  return publishEvent(payload, boardConfig);
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const phase = argv[0];
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
  if (phase === "purple" || phase === "blue") await revalidateCodeqlReview(state, phase, dependencies);

  const publication = await publishToBoard(state, phase, source, boardConfig);
  recordCompletedPhase(phase);
  console.log(`Phase ${phase} recorded. You advanced the squad after reviewing its evidence.`);
  if (phase === "blue") {
    printLocalRecap();
  }
  return { phase, boardDelivered: publication.delivered };
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

module.exports = { main, printLocalRecap, publishToBoard, validatePhaseEvidence, validatePhaseGate, validateSource };
