const { parseArgs } = require("node:util");
const { readWorkshopState, recordCodeqlReview } = require("../src/workshop-progress");
const { collectCodeqlEvidence, repositoryContext, verifyDeliveryWorkflow } = require("../src/codeql-evidence");

async function main(argv = process.argv.slice(2), {
  getContext = repositoryContext, collect = collectCodeqlEvidence, verifyWorkflow = verifyDeliveryWorkflow,
} = {}) {
  const { values } = parseArgs({ args: argv, options: {
    phase: { type: "string" }, confirm: { type: "boolean", default: false },
    analysis: { type: "string" }, commit: { type: "string" },
    override: { type: "boolean", default: false }, reason: { type: "string" },
  } });
  const phase = values.phase;
  const state = readWorkshopState();
  const previous = { purple: "red", blue: "green" }[phase];
  if (!previous || state.completedPhases.at(-1) !== previous) {
    throw new Error("Review Purple after Red, or Blue after Green, before publishing the reviewed phase.");
  }
  const context = getContext();
  if (values.override) {
    if (values.confirm) throw new Error("A CodeQL override cannot also confirm a report review.");
    const overrideReason = values.reason?.trim();
    if (!overrideReason || overrideReason.length < 12 || overrideReason.length > 500) {
      throw new Error("A participant override requires --reason with 12 to 500 characters.");
    }
    try {
      await collect(context, phase, state.codeqlReviews.purple);
    } catch (error) {
      if (!isUnavailableCodeqlError(error)) throw error;
      const overriddenAt = new Date().toISOString();
      const override = {
        ...context,
        phase,
        status: "overridden",
        overrideReason,
        overriddenBy: "participant",
        overriddenAt,
        reviewedBy: "participant",
        reviewedAt: overriddenAt,
      };
      recordCodeqlReview(phase, override);
      console.log(`CodeQL ${phase}: OVERRIDDEN (unverified) for ${context.repository}@${context.commit}.`);
      console.log(`Participant reason: ${overrideReason}`);
      console.log("This is not a clean CodeQL result. Continue only with the participant's explicit acceptance of the unverified report.");
      return override;
    }
    throw new Error("The CodeQL report is readable; review it instead of overriding it.");
  }
  if (phase === "blue") await verifyWorkflow(context);
  const evidence = await collect(context, phase, state.codeqlReviews.purple);
  if (JSON.stringify(getContext()) !== JSON.stringify(context)) throw new Error("Remote main changed during CodeQL review.");
  if (values.confirm) {
    if (values.analysis !== String(evidence.analysisId) || values.commit !== evidence.commit) {
      throw new Error("Confirmation must name the exact analysis and commit the participant reviewed.");
    }
    evidence.reviewedBy = "participant";
    evidence.reviewedAt = new Date().toISOString();
  }
  recordCodeqlReview(phase, evidence);
  console.log(`CodeQL ${phase}: ${evidence.url}`);
  console.log(`main commit ${evidence.commit}; analysis ${evidence.analysisId}; alert ${evidence.alertState}.`);
  if (values.confirm) console.log("Participant review recorded. Return to Mentor for the checkpoint and phase agreement.");
  else {
    console.log("Mentor: ask the participant to open this report and describe what they see. Do not infer review from this command.");
    console.log(`Only after their confirmation, Squad runs: npm run codeql:review -- --phase=${phase} --confirm --analysis=${evidence.analysisId} --commit=${evidence.commit}`);
  }
}

function isUnavailableCodeqlError(error) {
  const detail = `${error?.message || ""} ${error?.stderr || ""}`;
  return /\b(?:403|404|429|5\d{2})\b|forbidden|permission|unavailable|pending|timed? ?out|ECONN/i
    .test(detail);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`CodeQL review not recorded: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { isUnavailableCodeqlError, main };