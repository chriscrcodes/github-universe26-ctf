const test = require("node:test");
const assert = require("node:assert/strict");
const { collectCodeqlEvidence, repositoryContext } = require("../src/codeql-evidence");
const { main } = require("../scripts/codeql-review");

const baselineContext = { repository: "participant/workshop", ref: "refs/heads/feature/city-search", commit: "a".repeat(40) };
const fixedContext = { repository: baselineContext.repository, ref: "refs/heads/main", commit: "b".repeat(40) };
const category = "github-default-javascript";

function fixtures({ ref = baselineContext.ref, state = "open", commit = baselineContext.commit, results = 1, error = "",
  analysisCategory = category, instanceCommit = commit, alertsMissing = false } = {}) {
  return async (_repository, resource) => {
    if (resource === "analyses") return [{ id: 20, tool: { name: "CodeQL" }, ref,
      commit_sha: commit, category: analysisCategory, error, rules_count: 100, results_count: results }];
    if (resource === "alerts") return alertsMissing ? [] : [{ number: 7, tool: { name: "CodeQL" },
      rule: { id: "js/sql-injection" }, state }];
    if (resource === "alerts/7/instances") return [{ ref, commit_sha: instanceCommit,
      category: analysisCategory, state }];
    throw new Error(`Unexpected resource ${resource}`);
  };
}

async function baseline() {
  return { ...await collectCodeqlEvidence(baselineContext, "baseline", null, fixtures()), reviewedBy: "participant" };
}

test("baseline uses the workflow category and exact feature branch commit", async () => {
  const review = await baseline();
  assert.equal(review.kind, "codeql-baseline");
  assert.equal(review.category, category);
  assert.equal(review.alertNumber, 7);
  assert.equal(review.alertState, "open");
});

test("baseline rejects a stale, failed or unmatched analysis", async () => {
  for (const options of [{ commit: "b".repeat(40) }, { error: "analysis failed" },
    { instanceCommit: "b".repeat(40) }, { alertsMissing: true }, { results: 0 }]) {
    await assert.rejects(collectCodeqlEvidence(baselineContext, "baseline", null, fixtures(options)));
  }
});

test("fixed review requires the same finding resolved on the corrected commit", async () => {
  const initial = await baseline();
  const corrected = fixedContext;
  const review = await collectCodeqlEvidence(corrected, "fixed", initial,
    fixtures({ ref: corrected.ref, commit: corrected.commit, state: "fixed", results: 0 }));
  assert.equal(review.kind, "codeql-fixed");
  assert.equal(review.alertNumber, initial.alertNumber);
  for (const options of [{ state: "dismissed" }, { state: "open" }, { alertsMissing: true },
    { results: 1 }, { analysisCategory: "unrelated-configuration" }, { error: "analysis failed" }]) {
    await assert.rejects(collectCodeqlEvidence(corrected, "fixed", initial,
        fixtures({ ref: corrected.ref, commit: corrected.commit, state: "fixed", results: 0, ...options })));
      }
      await assert.rejects(collectCodeqlEvidence(corrected, "fixed", { ...initial, repository: "other/repo" }, fixtures()));
});

test("repository review enforces the feature baseline and main correction branches", () => {
  const makeRun = (context, branchName) => (_command, args) => {
    if (args[0] === "remote") return "https://github.com/participant/workshop.git";
    if (args[0] === "repo") return JSON.stringify({ nameWithOwner: context.repository });
    if (args[0] === "rev-parse") return context.commit;
    if (args[0] === "branch") return branchName;
    if (args[0] === "ls-remote") return `${context.commit}\t${context.ref}`;
    if (args[0] === "status") return "";
    throw new Error("Unexpected command");
  };
  const featureRun = makeRun(baselineContext, "feature/city-search");
  const mainRun = makeRun(fixedContext, "main");
  assert.deepEqual(repositoryContext("baseline", featureRun), baselineContext);
  assert.deepEqual(repositoryContext("fixed", mainRun), fixedContext);
  assert.throws(() => repositoryContext("baseline", makeRun(baselineContext, "main")), /origin\/feature\/city-search/);
  assert.throws(() => repositoryContext("fixed", makeRun(fixedContext, "feature/city-search")), /origin\/main/);
  assert.throws(() => repositoryContext("baseline", (command, args) => args[0] === "ls-remote" ? "" : featureRun(command, args)), /pushed/);
  assert.throws(() => repositoryContext("baseline", (command, args) => args[0] === "status" ? " M app/src/hotels.js" : featureRun(command, args)), /Commit and push/);
});

test("a newer failed retry cannot reuse an older successful analysis", async () => {
  const api = fixtures();
  const retry = async (repository, resource) => {
    const entries = await api(repository, resource);
    return resource === "analyses" ? [...entries, { ...entries[0], id: 21, error: "retry failed" }] : entries;
  };
  await assert.rejects(collectCodeqlEvidence(baselineContext, "baseline", null, retry), /pending, unavailable or failed/);
});

test("review preview does not record participant agreement or progress", async () => {
  const recorded = [];
  const dependencies = { repositoryContext: () => baselineContext, readState: () => ({ completedPhases: ["started", "red"],
    evidence: { red: { ...baselineContext, kind: "initial-delivery", pushed: true } } }),
    collect: async () => baseline(), recordEvidence: (...args) => recorded.push(args) };
  await main(["baseline"], dependencies);
  assert.deepEqual(recorded, []);
  await main(["baseline", "--reviewed"], dependencies);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0][0], "purple");
  assert.equal(recorded[0][1].reviewedBy, "participant");
});

test("initial review refuses an unrelated delivery or changed remote branch without saving", async () => {
  const dependencies = { repositoryContext: () => baselineContext, readState: () => ({ completedPhases: ["started", "red"],
    evidence: { red: { ...baselineContext, kind: "initial-delivery", pushed: true, commit: "b".repeat(40) } } }),
    collect: () => assert.fail("No query should use unrelated delivery evidence"),
    recordEvidence: () => assert.fail("No evidence should be saved") };
  await assert.rejects(main(["baseline", "--reviewed"], dependencies), /match the recorded/);
});

test("final review refuses stale delivery evidence before saving", async () => {
  const corrected = fixedContext;
  const dependencies = { repositoryContext: () => corrected,
    readState: () => ({ evidence: { blue: { pushed: true, commit: baselineContext.commit } } }),
    collect: async () => ({ kind: "codeql-fixed" }),
    recordEvidence: () => assert.fail("Unverified delivery must not be saved") };
  await assert.rejects(main(["fixed", "--reviewed"], dependencies), /corrected commit/);
});