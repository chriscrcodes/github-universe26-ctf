const { execFileSync } = require("node:child_process");

const REFS = Object.freeze({
  baseline: "refs/heads/feature/city-search",
  fixed: "refs/heads/main",
});

function execute(command, args) {
  return execFileSync(command, args, { encoding: "utf8", timeout: 30000,
    stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function repositoryContext(stage = "baseline", run = execute) {
  const ref = REFS[stage];
  if (!ref) throw new Error("Expected baseline or fixed CodeQL context.");
  const branchName = ref.slice("refs/heads/".length);
  const origin = run("git", ["remote", "get-url", "origin"]);
  const repository = JSON.parse(run("gh", ["repo", "view", origin, "--json", "nameWithOwner"])).nameWithOwner;
  const commit = run("git", ["rev-parse", "HEAD"]);
  const branch = run("git", ["branch", "--show-current"]);
  const remote = run("git", ["ls-remote", "origin", ref]).split(/\s+/)[0];
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "") || !/^[a-f0-9]{40,64}$/.test(commit)
    || branch !== branchName || remote !== commit) {
    throw new Error(`CodeQL review requires the current commit pushed to origin/${branchName} in the participant repository.`);
  }
  if (run("git", ["status", "--porcelain", "--", ":(top)app/src"])) {
    throw new Error("Commit and push application changes before reviewing CodeQL.");
  }
  return { repository, ref, commit };
}

function githubApi(repository, resource, ref = REFS.baseline, run = execute) {
  const pages = JSON.parse(run("gh", ["api", "--paginate", "--slurp", "--method", "GET",
    `repos/${repository}/code-scanning/${resource}`, "-f", `ref=${ref}`,
    "-f", "tool_name=CodeQL", "-f", "per_page=100"]));
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
    throw new Error("Unexpected CodeQL API response; no evidence recorded.");
  }
  return pages.flat();
}

async function collectCodeqlEvidence(context, stage, initial, api = githubApi) {
  if (!["baseline", "fixed"].includes(stage)) throw new Error("Expected baseline or fixed CodeQL review.");
  const { repository, ref, commit } = context;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "") || ref !== REFS[stage]
    || !/^[a-f0-9]{40,64}$/.test(commit || "")) throw new Error("Invalid CodeQL repository, feature branch ref or commit.");
  const currentAnalyses = (await api(repository, "analyses", ref))
    .filter((analysis) => analysis.tool?.name === "CodeQL" && analysis.ref === ref
      && analysis.commit_sha === commit && Number.isInteger(analysis.id)
      && typeof analysis.category === "string" && analysis.category.length > 0)
    .sort((left, right) => right.id - left.id);
  const latestByCategory = new Map();
  for (const analysis of currentAnalyses) {
    if (!latestByCategory.has(analysis.category)) latestByCategory.set(analysis.category, analysis);
  }
  const analyses = [...latestByCategory.values()].filter((analysis) => analysis.error === ""
    && analysis.rules_count > 0 && Number.isInteger(analysis.results_count) && analysis.results_count >= 0);
  if (!analyses.length) throw new Error("CodeQL is pending, unavailable or failed for this commit. Wait and retry.");
  const alerts = await api(repository, "alerts", ref);
  let analysis;
  let alert;
  if (stage === "baseline") {
    for (const candidate of alerts.filter((entry) => entry.tool?.name === "CodeQL"
      && entry.rule?.id === "js/sql-injection" && entry.state === "open"
      && Number.isInteger(entry.number))) {
      const instances = await api(repository, `alerts/${candidate.number}/instances`, ref);
      analysis = analyses.find((entry) => entry.results_count > 0 && instances.some((instance) =>
        instance.ref === ref && instance.commit_sha === commit && instance.category === entry.category
        && instance.state === "open"));
      if (analysis) { alert = candidate; break; }
    }
    if (!alert) throw new Error("No open SQL injection finding matches this feature branch commit and analysis.");
  } else {
    if (!initial || initial.kind !== "codeql-baseline" || initial.repository !== repository
      || initial.ref !== REFS.baseline || ref !== REFS.fixed || initial.commit === commit || !Number.isInteger(initial.alertNumber)
      || initial.reviewedBy !== "participant") throw new Error("Review the initial finding before the corrected delivery.");
    analysis = analyses.find((entry) => entry.category === initial.category);
    alert = alerts.find((entry) => entry.tool?.name === "CodeQL" && entry.number === initial.alertNumber
      && entry.rule?.id === "js/sql-injection");
    if (!analysis) throw new Error("CodeQL is pending or its configuration changed; no clean evidence recorded.");
    if (!alert || alert.state !== "fixed") throw new Error("The initial finding must be fixed, not dismissed or missing.");
    if (analyses.length !== latestByCategory.size || analyses.some((entry) => entry.results_count !== 0)
      || alerts.some((entry) => entry.tool?.name === "CodeQL" && entry.state === "open")) {
      throw new Error("CodeQL still reports findings on main; no clean evidence recorded.");
    }
  }
  return { ...context, kind: `codeql-${stage}`, category: analysis.category, analysisId: analysis.id,
    alertNumber: alert.number, alertState: alert.state, resultCount: analysis.results_count,
    url: `https://github.com/${repository}/security/code-scanning/${alert.number}`,
    checkedAt: new Date().toISOString() };
}

module.exports = { REFS, collectCodeqlEvidence, githubApi, repositoryContext };