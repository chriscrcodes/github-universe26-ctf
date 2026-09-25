const { execFileSync } = require("node:child_process");

const CATEGORY = "/language:javascript-typescript";
const REF = "refs/heads/main";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function repositoryContext(execute = run) {
  const origin = execute("git", ["remote", "get-url", "origin"]);
  const repository = JSON.parse(execute("gh", ["repo", "view", origin, "--json", "nameWithOwner"])).nameWithOwner;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || "")) throw new Error("Cannot identify the participant repository.");
  const branch = execute("git", ["branch", "--show-current"]);
  const commit = execute("git", ["rev-parse", "HEAD"]);
  const remote = execute("git", ["ls-remote", "origin", REF]).split(/\s+/)[0];
  if (branch !== "main" || !/^[a-f0-9]{40,64}$/.test(commit) || remote !== commit) {
    throw new Error("CodeQL review requires HEAD to match the correction or baseline pushed to origin/main.");
  }
  const changes = execute("git", ["status", "--porcelain", "--", ":(top)app/src"]);
  if (changes) throw new Error("Commit and push application changes before reviewing CodeQL.");
  return { repository, ref: REF, commit };
}

function githubApi(repository, resource, parameters = {}, execute = run) {
  const args = ["api", "--paginate", "--slurp", "--method", "GET", `repos/${repository}/code-scanning/${resource}`];
  for (const [key, value] of Object.entries(parameters)) args.push("-f", `${key}=${value}`);
  const pages = JSON.parse(execute("gh", args));
  if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
    throw new Error("Unexpected CodeQL API response; no evidence recorded.");
  }
  return pages.flat();
}

async function collectCodeqlEvidence(context, phase, initial, api = githubApi) {
  if (!["purple", "blue"].includes(phase)) throw new Error("CodeQL review supports purple or blue only.");
  const { repository, ref, commit } = context;
  if (ref !== REF || !/^[\w.-]+\/[\w.-]+$/.test(repository || "") || !/^[a-f0-9]{40,64}$/.test(commit || "")) {
    throw new Error("Invalid CodeQL repository, main ref or commit.");
  }
  const analyses = await api(repository, "analyses", { ref, tool_name: "CodeQL", per_page: "100" });
  const analysis = analyses.filter((entry) => entry.tool?.name === "CodeQL"
    && entry.ref === ref && entry.commit_sha === commit && entry.category === CATEGORY)
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!analysis || analysis.error !== "" || !(analysis.rules_count > 0)
    || !Number.isInteger(analysis.id) || !Number.isInteger(analysis.results_count) || analysis.results_count < 0) {
    throw new Error("CodeQL is pending, unavailable or failed for this commit. Wait for a successful analysis and retry.");
  }
  const alerts = await api(repository, "alerts", { ref, tool_name: "CodeQL", per_page: "100" });
  let alert;
  if (phase === "purple") {
    for (const candidate of alerts.filter((entry) => entry.tool?.name === "CodeQL"
      && entry.rule?.id === "js/sql-injection" && entry.state === "open")) {
      const instances = await api(repository, `alerts/${candidate.number}/instances`, { ref, per_page: "100" });
      if (instances.some((instance) => instance.ref === ref && instance.commit_sha === commit
        && instance.category === CATEGORY && instance.state === "open")) {
        alert = candidate;
        break;
      }
    }
    if (!alert || analysis.results_count < 1) throw new Error("No open SQL injection finding for the baseline commit.");
  } else {
    if (!initial || initial.repository !== repository || initial.ref !== ref || !initial.alertNumber) {
      throw new Error("Missing initial CodeQL review for this repository.");
    }
    alert = alerts.find((entry) => entry.number === initial.alertNumber && entry.tool?.name === "CodeQL");
    if (!alert || alert.state !== "fixed") throw new Error("The initial SQL injection alert must be fixed, not dismissed or missing.");
    if (analysis.results_count !== 0 || alerts.some((entry) => entry.tool?.name === "CodeQL" && entry.state === "open")) {
      throw new Error("CodeQL still reports findings on main. Review them before publishing Blue.");
    }
  }
  return {
    ...context,
    phase,
    category: CATEGORY,
    analysisId: analysis.id,
    alertNumber: alert.number,
    alertState: alert.state,
    resultCount: analysis.results_count,
    url: `https://github.com/${repository}/security/code-scanning/${alert.number}`,
    checkedAt: new Date().toISOString(),
  };
}

function validateCodeqlReview(review, phase, initial, delivery) {
  if (!review || review.phase !== phase || review.ref !== REF
    || !/^[\w.-]+\/[\w.-]+$/.test(review.repository || "")
    || !/^[a-f0-9]{40,64}$/.test(review.commit || "")
    || review.reviewedBy !== "participant" || !Number.isFinite(Date.parse(review.reviewedAt))) {
    return `Missing participant CodeQL review for ${phase}.`;
  }
  if (review.status === "overridden") {
    if (typeof review.overrideReason !== "string" || review.overrideReason.trim().length < 12
      || review.overrideReason.length > 500 || review.overriddenBy !== "participant"
      || !Number.isFinite(Date.parse(review.overriddenAt))) {
      return `Missing participant CodeQL override reason for ${phase}.`;
    }
    if (phase === "blue" && (review.repository !== initial?.repository
      || review.commit !== delivery?.commit)) {
      return "Blue override must match the initial review repository and delivered commit.";
    }
    return null;
  }
  if ((review.status && review.status !== "verified") || review.category !== CATEGORY
    || !Number.isInteger(review.analysisId) || !Number.isInteger(review.alertNumber)) {
    return `Missing participant CodeQL review for ${phase}.`;
  }
  if (phase === "purple" && (review.alertState !== "open" || !(review.resultCount > 0))) {
    return "Purple requires an open SQL injection finding.";
  }
  if (phase === "blue" && (review.alertState !== "fixed" || review.resultCount !== 0
    || review.repository !== initial?.repository || review.alertNumber !== initial?.alertNumber
    || review.commit !== delivery?.commit)) {
    return "Blue requires the initial finding fixed and a clean CodeQL review of the delivered commit.";
  }
  return null;
}

function verifyDeliveryWorkflow(context, execute = run) {
  const pages = JSON.parse(execute("gh", ["api", "--paginate", "--slurp", "--method", "GET",
    `repos/${context.repository}/actions/workflows/security.yml/runs`,
    "-f", `head_sha=${context.commit}`, "-f", "branch=main", "-f", "per_page=100"]));
  const workflow = pages.flatMap((page) => page.workflow_runs || [])
    .filter((entry) => entry.head_sha === context.commit && entry.head_branch === "main"
      && entry.head_repository?.full_name === context.repository)
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!workflow || workflow.status !== "completed" || workflow.conclusion !== "success") {
    throw new Error("Security verification for the delivered main commit is pending or failed. Wait or inspect Actions before Blue.");
  }
}

async function revalidateCodeqlReview(state, phase, {
  getContext = repositoryContext, collect = collectCodeqlEvidence, verifyWorkflow = verifyDeliveryWorkflow,
} = {}) {
  const review = state.codeqlReviews?.[phase];
  const error = validateCodeqlReview(review, phase, state.codeqlReviews?.purple, state.evidence?.blue);
  if (error) throw new Error(error);
  const context = getContext();
  if (review.repository !== context.repository || review.commit !== context.commit || review.ref !== context.ref) {
    throw new Error("The reviewed CodeQL commit is stale. Review the current main analysis again.");
  }
  if (review.status === "overridden") return review;
  if (phase === "blue") await verifyWorkflow(context);
  const current = await collect(context, phase, state.codeqlReviews?.purple);
  if (current.analysisId !== review.analysisId || current.alertNumber !== review.alertNumber) {
    throw new Error("CodeQL analysis changed since participant review. Review the new report before publishing.");
  }
  if (JSON.stringify(getContext()) !== JSON.stringify(context)) throw new Error("Remote main changed during CodeQL verification.");
  return current;
}

module.exports = { CATEGORY, REF, collectCodeqlEvidence, githubApi, repositoryContext, revalidateCodeqlReview, validateCodeqlReview, verifyDeliveryWorkflow };