const { readWorkshopState, recordApproval } = require("../src/workshop-progress");

const allowedStrategies = new Set(["parameter-binding"]);

function validateApproval(state, strategy) {
  if (!allowedStrategies.has(strategy)) {
    return 'Expected the approved strategy "parameter-binding".';
  }
  if (!state.completedPhases.includes("purple") || !state.evidence.purple) {
    return "Complete and publish the purple CodeQL phase before approving a remediation.";
  }
  return null;
}

function main() {
  const strategy = process.argv[2];
  const state = readWorkshopState();
  const error = validateApproval(state, strategy);
  if (error) throw new Error(error);

  recordApproval("remediation", {
    strategy,
    approvedBy: "participant",
    statement: "Keep SQL syntax separate from the untrusted city value.",
  });
  console.log("APPROVED: parameter binding may be applied by Blue.");
  console.log("Ask Green to hand the exact approved patch to Blue.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Approval not recorded: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main, validateApproval };
