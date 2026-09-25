const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CATEGORY, REF, collectCodeqlEvidence, githubApi, repositoryContext, revalidateCodeqlReview, validateCodeqlReview, verifyDeliveryWorkflow } = require("../src/codeql-evidence");
const { verify: verifyCi } = require("../scripts/codeql-ci");
const { isUnavailableCodeqlError, main: reviewCodeql } = require("../scripts/codeql-review");

const context = { repository: "participant/workshop", ref: REF, commit: "a".repeat(40) };
const initial = { ...context, alertNumber: 7 };

function fixtures(overrides = {}) {
  const analysis = { id: 10, tool: { name: "CodeQL" }, ref: REF, commit_sha: context.commit,
    category: CATEGORY, error: "", rules_count: 100, results_count: 1, ...overrides.analysis };
  const alert = { number: 7, tool: { name: "CodeQL" }, rule: { id: "js/sql-injection" }, state: "open", ...overrides.alert };
  const instance = { ref: REF, commit_sha: context.commit, category: CATEGORY, state: "open", ...overrides.instance };
  return async (_repository, resource, parameters) => {
    assert.equal(parameters.state, undefined, "omit state to retrieve all alert states; GitHub rejects state=all");
    if (resource === "analyses") return overrides.analyses || [analysis];
    if (resource === "alerts") return overrides.alerts || [alert];
    return [instance];
  };
}

test("initial CodeQL evidence identifies a finding on the exact main commit", async () => {
  const receipt = await collectCodeqlEvidence(context, "purple", null, fixtures());
  assert.equal(receipt.alertNumber, 7);
  assert.equal(receipt.analysisId, 10);
  assert.equal(receipt.reviewedBy, undefined);
  assert.match(validateCodeqlReview(receipt, "purple"), /participant CodeQL review/);
  assert.equal(validateCodeqlReview({ ...receipt, reviewedBy: "participant", reviewedAt: new Date().toISOString() }, "purple"), null);
});

test("CodeQL refuses missing, failed, wrong-commit, wrong-ref and wrong-category analyses", async () => {
  for (const overrides of [{ analyses: [] }, { analysis: { error: "cancelled" } },
    { analysis: { commit_sha: "b".repeat(40) } }, { analysis: { ref: "refs/heads/topic" } },
    { analysis: { category: "other" } }, { analysis: { rules_count: 0 } }]) {
    await assert.rejects(collectCodeqlEvidence(context, "purple", null, fixtures(overrides)), /pending, unavailable or failed/);
  }
});

test("initial finding must have an open instance on the baseline commit", async () => {
  await assert.rejects(collectCodeqlEvidence(context, "purple", null,
    fixtures({ instance: { commit_sha: "b".repeat(40) } })), /No open SQL injection/);
});

test("final CodeQL evidence requires fixed, not dismissed, and no other findings", async () => {
  const clean = { analysis: { results_count: 0 }, alert: { state: "fixed" } };
  const receipt = await collectCodeqlEvidence(context, "blue", initial, fixtures(clean));
  const reviewed = { ...receipt, reviewedBy: "participant", reviewedAt: new Date().toISOString() };
  assert.equal(validateCodeqlReview(reviewed, "blue", initial, { commit: context.commit }), null);
  assert.match(validateCodeqlReview(reviewed, "blue", initial, { commit: "b".repeat(40) }), /delivered commit/);
  await assert.rejects(collectCodeqlEvidence(context, "blue", initial,
    fixtures({ ...clean, alert: { state: "dismissed" } })), /fixed, not dismissed/);
  await assert.rejects(collectCodeqlEvidence(context, "blue", initial,
    fixtures({ ...clean, analysis: { results_count: 1 } })), /still reports findings/);
  await assert.rejects(collectCodeqlEvidence(context, "blue", null, fixtures(clean)), /Missing initial/);
});

test("API access failures propagate instead of becoming clean evidence", async () => {
  await assert.rejects(collectCodeqlEvidence(context, "blue", initial, async () => { throw new Error("403 forbidden"); }), /403/);
});

test("participant CodeQL overrides are valid but never represented as clean reviews", () => {
  const override = {
    ...context,
    phase: "purple",
    status: "overridden",
    overrideReason: "GitHub returned 403 for Code Scanning analyses.",
    overriddenBy: "participant",
    overriddenAt: new Date().toISOString(),
    reviewedBy: "participant",
    reviewedAt: new Date().toISOString(),
  };
  assert.equal(validateCodeqlReview(override, "purple"), null);
  assert.match(validateCodeqlReview({ ...override, overrideReason: "No access" }, "purple"), /override reason/);
  const blueOverride = { ...override, phase: "blue", commit: "b".repeat(40) };
  assert.match(validateCodeqlReview(blueOverride, "blue", initial, { commit: context.commit }), /delivered commit/);
  assert.equal(isUnavailableCodeqlError(Object.assign(new Error("gh api failed"), { stderr: "HTTP 403 forbidden" })), true);
  assert.equal(isUnavailableCodeqlError(new Error("CodeQL still reports findings on main")), false);
});

test("GitHub pagination is flattened and requests are scoped to the repository", () => {
  const result = githubApi(context.repository, "alerts", { ref: REF }, (command, args) => {
    assert.equal(command, "gh");
    assert.ok(args.includes("--paginate"));
    assert.ok(args.includes("--slurp"));
    assert.ok(args.includes(`repos/${context.repository}/code-scanning/alerts`));
    return JSON.stringify([[{ number: 1 }], [{ number: 2 }]]);
  });
  assert.deepEqual(result, [{ number: 1 }, { number: 2 }]);
});

test("repository context checks the actual remote main, not a stale tracking ref", () => {
  const execute = (command, args) => {
    if (command === "gh") return JSON.stringify({ nameWithOwner: context.repository });
    if (args[0] === "branch") return "main";
    if (args[0] === "rev-parse") return context.commit;
    if (args[0] === "ls-remote") return `${context.commit}\t${REF}`;
    if (args[0] === "status") assert.ok(args.includes(":(top)app/src"));
    return "";
  };
  assert.deepEqual(repositoryContext(execute), context);
  assert.throws(() => repositoryContext((command, args) => args[0] === "ls-remote"
    ? `${"b".repeat(40)}\t${REF}` : execute(command, args)), /origin\/main/);
});

test("publication rechecks GitHub and rejects stale participant reviews", async () => {
  const evidence = await collectCodeqlEvidence(context, "purple", null, fixtures());
  const review = { ...evidence, reviewedBy: "participant", reviewedAt: new Date().toISOString() };
  const state = { codeqlReviews: { purple: review } };
  const dependencies = { getContext: () => context, collect: () => evidence };
  assert.equal((await revalidateCodeqlReview(state, "purple", dependencies)).analysisId, 10);
  await assert.rejects(revalidateCodeqlReview(state, "purple", { ...dependencies,
    getContext: () => ({ ...context, commit: "b".repeat(40) }) }), /stale/);
  await assert.rejects(revalidateCodeqlReview(state, "purple", { ...dependencies,
    collect: () => ({ ...evidence, analysisId: 11 }) }), /analysis changed/);
  await assert.rejects(revalidateCodeqlReview(state, "purple", { ...dependencies,
    collect: () => { throw new Error("403 forbidden"); } }), /403/);
});

test("publication accepts a current participant override without claiming CodeQL verification", async () => {
  const override = { ...context, phase: "purple", status: "overridden",
    overrideReason: "GitHub returned 403 for Code Scanning analyses.", overriddenBy: "participant",
    overriddenAt: new Date().toISOString(), reviewedBy: "participant", reviewedAt: new Date().toISOString() };
  const state = { codeqlReviews: { purple: override } };
  let codeqlCalls = 0;
  const result = await revalidateCodeqlReview(state, "purple", {
    getContext: () => context,
    collect: () => { codeqlCalls += 1; throw new Error("should not query CodeQL after explicit override"); },
  });
  assert.equal(result.status, "overridden");
  assert.equal(codeqlCalls, 0);
  await assert.rejects(revalidateCodeqlReview(state, "purple", {
    getContext: () => ({ ...context, commit: "b".repeat(40) }),
  }), /stale/);
});

test("Blue requires the completed security workflow on the delivered main commit", () => {
  const workflow = { id: 1, head_sha: context.commit, head_branch: "main",
    head_repository: { full_name: context.repository }, status: "completed", conclusion: "success" };
  assert.doesNotThrow(() => verifyDeliveryWorkflow(context, () => JSON.stringify([{ workflow_runs: [workflow] }])));
  for (const changes of [{ status: "in_progress" }, { conclusion: "failure" },
    { head_sha: "b".repeat(40) }, { head_branch: "topic" }, { head_repository: { full_name: "other/repo" } }]) {
    assert.throws(() => verifyDeliveryWorkflow(context, () => JSON.stringify([{ workflow_runs: [{ ...workflow, ...changes }] }])), /pending or failed/);
  }
});

test("CI reuses the same exact-SHA clean checks and bounded ingestion retries", async () => {
  const api = fixtures({ analysis: { results_count: 0 }, alert: { state: "fixed" } });
  assert.equal((await verifyCi(context, { api })).alertState, "fixed");
  let waits = 0;
  await assert.rejects(verifyCi(context, { api: fixtures(), attempts: 2,
    wait: async () => { waits += 1; } }), /No fixed baseline/);
  assert.equal(waits, 1);
});

test("review CLI cannot record human confirmation for a different report or skip a phase", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codeql-review-"));
  const stateFile = path.join(directory, "state.json");
  const previous = process.env.TEAM_STATE_FILE;
  process.env.TEAM_STATE_FILE = stateFile;
  t.after(() => {
    if (previous === undefined) delete process.env.TEAM_STATE_FILE;
    else process.env.TEAM_STATE_FILE = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const state = { teamId: "participant", completedPhases: ["started", "red"], evidence: {} };
  fs.writeFileSync(stateFile, JSON.stringify(state));
  const dependencies = { getContext: () => context,
    collect: (current, phase, baseline) => collectCodeqlEvidence(current, phase, baseline, fixtures()) };
  await reviewCodeql(["--phase=purple"], dependencies);
  const candidate = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  assert.equal(candidate.codeqlReviews.purple.reviewedBy, undefined);
  await assert.rejects(reviewCodeql(["--phase=purple", "--confirm", "--analysis=11", `--commit=${context.commit}`], dependencies), /exact analysis and commit/);
  await assert.rejects(reviewCodeql(["--phase=purple", "--confirm", "--analysis=10", `--commit=${"b".repeat(40)}`], dependencies), /exact analysis and commit/);
  assert.deepEqual(JSON.parse(fs.readFileSync(stateFile, "utf8")), candidate);
  await reviewCodeql(["--phase=purple", "--confirm", "--analysis=10", `--commit=${context.commit}`], dependencies);
  assert.equal(JSON.parse(fs.readFileSync(stateFile, "utf8")).codeqlReviews.purple.reviewedBy, "participant");
  await assert.rejects(reviewCodeql(["--phase=blue"], dependencies), /after Green/);
});

test("CodeQL CLI records an explicit override only when the report is unavailable", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codeql-override-"));
  const stateFile = path.join(directory, "state.json");
  const previous = process.env.TEAM_STATE_FILE;
  process.env.TEAM_STATE_FILE = stateFile;
  t.after(() => {
    if (previous === undefined) delete process.env.TEAM_STATE_FILE;
    else process.env.TEAM_STATE_FILE = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });
  fs.writeFileSync(stateFile, JSON.stringify({ teamId: "participant", completedPhases: ["started", "red"] }));
  const unavailable = { getContext: () => context,
    collect: async () => { throw new Error("GitHub returned 403 when reading CodeQL analyses"); } };
  const args = ["--phase=purple", "--override", "--reason=GitHub returned 403 for Code Scanning analyses."];
  const override = await reviewCodeql(args, unavailable);
  assert.equal(override.status, "overridden");
  assert.equal(override.analysisId, undefined);
  assert.equal(JSON.parse(fs.readFileSync(stateFile, "utf8")).codeqlReviews.purple.status, "overridden");
  await assert.rejects(reviewCodeql(["--phase=purple", "--override", "--reason=No access"], unavailable), /12 to 500/);
  await assert.rejects(reviewCodeql(args, { ...unavailable, collect: async () => ({ analysisId: 1 }) }), /report is readable/);
});