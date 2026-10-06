const test = require("node:test");
const assert = require("node:assert/strict");
const { collectCodeqlEvidence, repositoryContext } = require("../src/codeql-evidence");
const { main } = require("../scripts/codeql-review");

const context = { repository: "participant/workshop", ref: "refs/heads/main", commit: "a".repeat(40) };
const category = "github-default-javascript";

function fixtures({ state = "open", commit = context.commit, results = 1, error = "",
  analysisCategory = category, instanceCommit = commit, alertsMissing = false } = {}) {
  return async (_repository, resource) => {
    if (resource === "analyses") return [{ id: 20, tool: { name: "CodeQL" }, ref: context.ref,
      commit_sha: commit, category: analysisCategory, error, rules_count: 100, results_count: results }];
    if (resource === "alerts") return alertsMissing ? [] : [{ number: 7, tool: { name: "CodeQL" },
      rule: { id: "js/sql-injection" }, state }];
    if (resource === "alerts/7/instances") return [{ ref: context.ref, commit_sha: instanceCommit,
      category: analysisCategory, state }];
    throw new Error(`Unexpected resource ${resource}`);
  };
}

async function baseline() {
  return { ...await collectCodeqlEvidence(context, "baseline", null, fixtures()), reviewedBy: "participant" };
}

test("baseline uses actual Default Setup category and the exact main commit", async () => {
  const review = await baseline();
  assert.equal(review.kind, "codeql-baseline");
  assert.equal(review.category, category);
  assert.equal(review.alertNumber, 7);
  assert.equal(review.alertState, "open");
});

test("baseline rejects a stale, failed or unmatched analysis", async () => {
  for (const options of [{ commit: "b".repeat(40) }, { error: "analysis failed" },
    { instanceCommit: "b".repeat(40) }, { alertsMissing: true }, { results: 0 }]) {
    await assert.rejects(collectCodeqlEvidence(context, "baseline", null, fixtures(options)));
  }
});

test("fixed review requires the same finding resolved on the corrected commit", async () => {
  const initial = await baseline();
  const corrected = { ...context, commit: "b".repeat(40) };
  const review = await collectCodeqlEvidence(corrected, "fixed", initial,
    fixtures({ commit: corrected.commit, state: "fixed", results: 0 }));
  assert.equal(review.kind, "codeql-fixed");
  assert.equal(review.alertNumber, initial.alertNumber);
  for (const options of [{ state: "dismissed" }, { state: "open" }, { alertsMissing: true },
    { results: 1 }, { analysisCategory: "unrelated-configuration" }, { error: "analysis failed" }]) {
    await assert.rejects(collectCodeqlEvidence(corrected, "fixed", initial,
      fixtures({ commit: corrected.commit, state: "fixed", results: 0, ...options })));
  }
  await assert.rejects(collectCodeqlEvidence(corrected, "fixed", { ...initial, repository: "other/repo" }, fixtures()));
});

test("repository review rejects an unpushed or dirty main", () => {
  const run = (_command, args) => {
    if (args[0] === "remote") return "https://github.com/participant/workshop.git";
    if (args[0] === "repo") return JSON.stringify({ nameWithOwner: context.repository });
    if (args[0] === "rev-parse") return context.commit;
    if (args[0] === "branch") return "main";
    if (args[0] === "ls-remote") return `${context.commit}\t${context.ref}`;
    if (args[0] === "status") return "";
    throw new Error("Unexpected command");
  };
  assert.deepEqual(repositoryContext(run), context);
  assert.throws(() => repositoryContext((command, args) => args[0] === "ls-remote" ? "" : run(command, args)), /pushed/);
  assert.throws(() => repositoryContext((command, args) => args[0] === "status" ? " M app/src/hotels.js" : run(command, args)), /Commit and push/);
});

test("a newer failed retry cannot reuse an older successful analysis", async () => {
  const api = fixtures();
  const retry = async (repository, resource) => {
    const entries = await api(repository, resource);
    return resource === "analyses" ? [...entries, { ...entries[0], id: 21, error: "retry failed" }] : entries;
  };
  await assert.rejects(collectCodeqlEvidence(context, "baseline", null, retry), /pending, unavailable or failed/);
});

test("review preview does not record participant agreement or progress", async () => {
  const recorded = [];
  const dependencies = { repositoryContext: () => context, readState: () => ({ completedPhases: ["started", "red"],
    evidence: { red: { ...context, kind: "initial-delivery", pushed: true } } }),
    collect: async () => baseline(), recordEvidence: (...args) => recorded.push(args) };
  await main(["baseline"], dependencies);
  assert.deepEqual(recorded, []);
  await main(["baseline", "--reviewed"], dependencies);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0][0], "purple");
  assert.equal(recorded[0][1].reviewedBy, "participant");
});

test("initial review refuses an unrelated delivery or changed remote main without saving", async () => {
  const dependencies = { repositoryContext: () => context, readState: () => ({ completedPhases: ["started", "red"],
    evidence: { red: { ...context, kind: "initial-delivery", pushed: true, commit: "b".repeat(40) } } }),
    collect: () => assert.fail("No query should use unrelated delivery evidence"),
    recordEvidence: () => assert.fail("No evidence should be saved") };
  await assert.rejects(main(["baseline", "--reviewed"], dependencies), /match the recorded/);
});

test("final review refuses stale delivery evidence before saving", async () => {
  const corrected = { ...context, commit: "b".repeat(40) };
  const dependencies = { repositoryContext: () => corrected,
    readState: () => ({ evidence: { blue: { pushed: true, commit: context.commit } } }),
    collect: async () => ({ kind: "codeql-fixed" }),
    recordEvidence: () => assert.fail("Unverified delivery must not be saved") };
  await assert.rejects(main(["fixed", "--reviewed"], dependencies), /corrected commit/);
});