const { collectCodeqlEvidence, repositoryContext } = require("../src/codeql-evidence");
const { readWorkshopState, recordEvidence } = require("../src/workshop-progress");

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const [stage, confirmation] = argv;
  if (!["baseline", "fixed"].includes(stage) || argv.length > 2
    || (confirmation && confirmation !== "--reviewed")) {
    throw new Error("Usage: npm run codeql:review -- baseline|fixed [--reviewed]");
  }
  const getContext = dependencies.repositoryContext || repositoryContext;
  const readState = dependencies.readState || readWorkshopState;
  const collect = dependencies.collect || collectCodeqlEvidence;
  const save = dependencies.recordEvidence || recordEvidence;
  const context = getContext(stage);
  const state = readState();
  if (stage === "baseline" && (!state.completedPhases?.includes("red")
    || state.evidence.red?.kind !== "initial-delivery" || !state.evidence.red.pushed
    || state.evidence.red.repository !== context.repository || state.evidence.red.commit !== context.commit)) {
    throw new Error("Initial CodeQL review must match the recorded and published delivery on feature/city-search.");
  }
  const review = await collect(context, stage, state.evidence.purple);
  if (JSON.stringify(getContext(stage)) !== JSON.stringify(context)) throw new Error(`Remote ${stage === "baseline" ? "feature/city-search" : "main"} changed during review; retry.`);
  if (stage === "fixed" && (!state.evidence.blue?.pushed || state.evidence.blue.commit !== context.commit)) {
    throw new Error("Final CodeQL evidence must match the corrected commit pushed on main.");
  }
  console.log(`CodeQL ${stage}: ${review.url}`);
  console.log(`Commit: ${context.commit}. Alert: ${review.alertState}. Results: ${review.resultCount}.`);
  if (confirmation !== "--reviewed") {
    console.log("Read the report, then rerun with --reviewed to confirm your own review. No progress recorded.");
    return review;
  }
  const evidence = { ...review, command: `npm run codeql:review -- ${stage} --reviewed`,
    reviewedBy: "participant", reviewedAt: new Date().toISOString() };
  save(stage === "baseline" ? "purple" : "codeql", evidence);
  console.log("Participant review recorded. No workshop phase was automatically advanced.");
  return evidence;
}

if (require.main === module) {
  main().catch((error) => { console.error(`CodeQL review not recorded: ${error.message}`); process.exitCode = 1; });
}

module.exports = { main };