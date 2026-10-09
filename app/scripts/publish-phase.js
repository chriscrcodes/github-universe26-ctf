const {
  readWorkshopState,
  recordCompletedPhase,
} = require("../src/workshop-progress");
const { resolveBoardConfig } = require("../src/board-config");
const { publishEvent } = require("../src/board-client");
const { collectCodeqlEvidence, repositoryContext } = require("../src/codeql-evidence");

const phases = ["red", "purple", "green", "blue", "codeql"];

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
      red: "npm run delivery",
      purple: "npm run codeql:review -- baseline --reviewed",
      green: "npm run verify",
      blue: "npm run regressions",
      codeql: "npm run codeql:review -- fixed --reviewed",
    };
    return `Missing ${phase} evidence. Complete ${commands[phase]} first.`;
  }
  if (phase === "red" && (state.evidence.red.kind !== "initial-delivery" || !state.evidence.red.pushed
    || state.evidence.red.ref !== "refs/heads/feature/city-search")) {
    return "Initial delivery requires local acceptance checks and a commit pushed on feature/city-search.";
  }
  if (phase === "red" && (state.evidence.red.exposure?.fixture !== "synthetic-hotels-v1"
    || state.evidence.red.exposure?.input !== "' OR 1=1 -- "
    || state.evidence.red.exposure?.unpublishedCount !== 4
    || state.evidence.red.exposure?.syntheticReservationCount !== 27400)) {
    return "Initial delivery requires the supplied synthetic exposure receipt. Run npm run delivery again.";
  }
  if (phase === "purple" && (state.evidence.purple.kind !== "codeql-baseline"
    || state.evidence.purple.reviewedBy !== "participant"
    || state.evidence.purple.ref !== "refs/heads/feature/city-search")) {
    return "Purple requires a participant-reviewed CodeQL finding, not a quiz receipt.";
  }
  if (phase === "green" && state.approvals?.remediation?.strategy !== "parameter-binding") {
    return "Missing participant approval for parameter binding.";
  }
  if (phase === "blue" && state.evidence.blue?.pushed !== true) {
    return "Blue evidence must be tied to a correction pushed on main.";
  }
  if (phase === "blue" && (state.evidence.blue.ref !== "refs/heads/main" || state.evidence.blue.branch !== "main")) {
    return "Blue correction evidence must come from main.";
  }
  if (phase === "codeql" && (state.evidence.codeql.kind !== "codeql-fixed"
    || state.evidence.codeql.reviewedBy !== "participant" || state.evidence.codeql.alertState !== "fixed"
    || state.evidence.codeql.resultCount !== 0 || state.evidence.codeql.commit !== state.evidence.blue?.commit
    || state.evidence.codeql.ref !== "refs/heads/main"
    || state.evidence.codeql.repository !== state.evidence.purple?.repository
    || state.evidence.codeql.alertNumber !== state.evidence.purple?.alertNumber)) {
    return "Final completion requires the same CodeQL finding fixed on the corrected delivery commit.";
  }
  return null;
}

async function publishToBoard(state, phase, source, boardConfig) {
  const payload = phase === "codeql" ? {
    sessionId: state.sessionId,
    teamId: state.teamId,
    phase: "ci-clean",
    source: "codeql",
    repository: state.evidence.codeql.repository,
    commitSha: state.evidence.codeql.commit,
  } : {
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
  if (phase === "codeql") {
    const context = repositoryContext("fixed");
    const evidence = await collectCodeqlEvidence(context, "fixed", state.evidence.purple);
    if (evidence.commit !== state.evidence.codeql.commit || evidence.repository !== state.evidence.codeql.repository
      || JSON.stringify(repositoryContext("fixed")) !== JSON.stringify(context)) {
      throw new Error("Final evidence is stale; review CodeQL again before publishing.");
    }
  }

  await publishToBoard(state, phase, source, boardConfig);
  recordCompletedPhase(phase);
  console.log(`Phase ${phase} recorded. You advanced the squad after reviewing its evidence.`);
  if (phase === "codeql") {
    printLocalRecap();
  } else if (phase === "blue") {
    console.log("Delivery complete. CodeQL pending until the exact pushed commit is reviewed and fixed.");
  }
}

function printLocalRecap() {
  const state = readWorkshopState();
  console.log("");
  console.log(`WORKSHOP COMPLETE for ${state.alias} (${state.teamId}). CodeQL clean.`);
  console.log(`Phases: ${state.completedPhases.join(" -> ")}`);
  console.log("This local recap is authoritative even when the scoreboard is offline.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Phase not published: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main, printLocalRecap, publishToBoard, validatePhaseGate, validateSource };
