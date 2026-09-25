const fs = require("node:fs");
const path = require("node:path");

function stateFilePath() {
  return path.resolve(process.env.TEAM_STATE_FILE || path.join(__dirname, "..", ".team-state.json"));
}

function readWorkshopState() {
  const stateFile = stateFilePath();
  if (!fs.existsSync(stateFile)) {
    throw new Error("Run npm run register first to create app/.team-state.json.");
  }
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  return {
    ...state,
    approvals: state.approvals && typeof state.approvals === "object" ? state.approvals : {},
    checkpoints: state.checkpoints && typeof state.checkpoints === "object" ? state.checkpoints : {},
    evidence: state.evidence && typeof state.evidence === "object" ? state.evidence : {},
    codeqlReviews: state.codeqlReviews && typeof state.codeqlReviews === "object" ? state.codeqlReviews : {},
    completedPhases: Array.isArray(state.completedPhases) ? state.completedPhases : ["started"],
  };
}

function writeWorkshopState(state) {
  const stateFile = stateFilePath();
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function recordEvidence(phase, details = {}) {
  const state = readWorkshopState();
  state.evidence[phase] = {
    recordedAt: new Date().toISOString(),
    ...details,
  };
  writeWorkshopState(state);
}

function recordCheckpoint(phase, receipt) {
  const state = readWorkshopState();
  state.checkpoints[phase] = receipt;
  writeWorkshopState(state);
}

function recordApproval(name, details = {}) {
  const state = readWorkshopState();
  state.approvals[name] = {
    recordedAt: new Date().toISOString(),
    ...details,
  };
  writeWorkshopState(state);
}

function recordCompletedPhase(phase) {
  const state = readWorkshopState();
  if (!state.completedPhases.includes(phase)) {
    state.completedPhases.push(phase);
  }
  writeWorkshopState(state);
}

function recordCodeqlReview(phase, review) {
  const state = readWorkshopState();
  state.codeqlReviews[phase] = review;
  writeWorkshopState(state);
}

module.exports = {
  readWorkshopState,
  recordCodeqlReview,
  recordApproval,
  recordCheckpoint,
  recordCompletedPhase,
  recordEvidence,
  stateFilePath,
  writeWorkshopState,
};
