const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { readWorkshopState, recordEvidence } = require("../src/workshop-progress");

(async () => {
  const state = readWorkshopState();
  if (state.approvals?.remediation?.strategy !== "parameter-binding") {
    throw new Error('participant approval is missing; run "npm run approve -- parameter-binding" first');
  }
  const { verification } = await import(pathToFileURL(path.resolve(__dirname, "../../scripts/verify.mjs")).href);
  recordEvidence("green", {
    command: "npm run verify",
    approvedStrategy: state.approvals.remediation.strategy,
    approvedAt: state.approvals.remediation.recordedAt,
    result: "normal search preserved and canonical payload neutralized",
    checks: verification,
  });
  console.log("Fix evidence recorded. Return to Mentor after Red's retest for the Green checkpoint and participant agreement.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
