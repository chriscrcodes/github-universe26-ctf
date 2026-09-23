import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = path.join(root, "README.md");
const stepFiles = [
  ".github/steps/1-step.md",
  ".github/steps/2-step.md",
  ".github/steps/3-step.md",
  ".github/steps/4-step.md",
  ".github/steps/x-review.md",
];
const workshopDocumentation = [
  "README.md",
  ...stepFiles,
  "workshop/FACILITATOR.md",
  "workshop/squad/README.md",
  "workshop/squad/routing.md",
  "workshop/squad/agents/blue/charter.md",
  "workshop/squad/agents/fact-checker/charter.md",
  "workshop/squad/agents/green/charter.md",
  "workshop/squad/agents/rai-agent/charter.md",
  "workshop/squad/agents/ralph/charter.md",
  "workshop/squad/agents/red/charter.md",
  "workshop/squad/agents/scribe/charter.md",
];

test("README follows the official GitHub Skills exercise template", async () => {
  const readme = await readFile(readmePath, "utf8");
  const requiredSections = [
    "## Welcome",
    "- **Who is this for**:",
    "- **What you'll learn**:",
    "- **What you'll build**:",
    "- **Prerequisites**:",
    "- **How long**:",
    "In this exercise, you will:",
    "### How to start this exercise",
    "Having trouble? 🤷",
  ];

  let previousIndex = -1;
  for (const section of requiredSections) {
    const index = readme.indexOf(section);
    assert.notEqual(index, -1, `missing README section: ${section}`);
    assert.ok(index > previousIndex, `README section is out of order: ${section}`);
    previousIndex = index;
  }
});

test("README explains how to select and direct the Squad team", async () => {
  const readme = await readFile(readmePath, "utf8");
  for (const expected of [
    "## Meet Squad",
    "/agent",
    "/help",
    "@app/src/hotels.js",
    "**Squad**",
    "**Red**",
    "**Green**",
    "**Blue**",
  ]) {
    assert.ok(readme.includes(expected), `README.md should mention ${expected}`);
  }
  assert.match(readme, /natural\s+language/);
  assert.match(readme, /There is no `\/squad` slash command/);
});

test("README presents a GitHub-native hero without official Squad branding", async () => {
  const readme = await readFile(readmePath, "utf8");
  assert.match(readme, /https:\/\/bradygaster\.github\.io\/squad\//);
  assert.match(readme, /img\.shields\.io\/badge\/Start%20the%20exercise/);
  assert.match(readme, /<div align="center">/);
  assert.match(readme, /not an official Squad product demonstration/);
  assert.match(readme, /\.github\/images\/purple-team-terminal\.svg/);
  assert.match(readme, /Squad routes one investigation to Red, Green, and Blue/);
  assert.doesNotMatch(readme, /squad-logo\.png/);
  assert.doesNotMatch(readme, /squad-official-site\.png/);
});

test("GitHub Skills step files stay complete and ordered", async () => {
  const actual = (await readdir(path.join(root, ".github/steps"))).sort();
  assert.deepEqual(actual, stepFiles.map((file) => path.basename(file)).sort());

  const steps = await Promise.all(stepFiles.map((file) => readFile(path.join(root, file), "utf8")));
  steps.forEach((content, index) => {
    assert.match(content, /^## /);
    if (index < 4) {
      assert.match(content, /### 📖 Theory:/);
      assert.match(content, /### ⌨️ Activity:/);
      assert.match(content, /Having trouble\? 🤷/);
    } else {
      assert.match(content, /### What's next\?/);
    }
  });
});

test("README documents the approved 45-minute participant setup", async () => {
  const readme = await readFile(readmePath, "utf8");
  for (const expected of [
    "10 min intro",
    "30 min hands-on",
    "5 min debrief",
    "squad init --no-workflows",
    "npm run squad:install-workshop-team",
    "squad doctor",
    "one repository per participant is recommended",
    "shared `main`",
  ]) {
    assert.ok(readme.includes(expected), `README.md should mention ${expected}`);
  }
});

test("steps document participant approval and the Red, Green, and Blue flow", async () => {
  const steps = await Promise.all(stepFiles.map((file) => readFile(path.join(root, file), "utf8")));
  const combined = steps.join("\n");
  for (const expected of [
    "supplied payload",
    "CodeQL",
    "I explicitly approve this exact patch",
    "ask Squad",
    "`red`",
    "`purple`",
    "`green`",
    "`blue`",
    "CodeQL pending",
    "CodeQL clean",
  ]) {
    assert.ok(combined.includes(expected), `the workshop steps should mention ${expected}`);
  }
  assert.match(combined, /Green[\s\S]*explicit approval/i);
  assert.match(combined, /Blue[\s\S]*commit[\s\S]*push/i);
});

test("documentation states that Red detects but never creates the vulnerability", async () => {
  const readme = await readFile(readmePath, "utf8");
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  const redCharter = await readFile(
    path.join(root, "workshop/squad/agents/red/charter.md"),
    "utf8",
  );
  const facilitator = await readFile(path.join(root, "workshop/FACILITATOR.md"), "utf8");

  assert.match(readme, /vulnerable query already exists/i);
  assert.match(step, /already present in the starting application/i);
  assert.match(redCharter, /never\s+creates or introduces a vulnerability/i);
  assert.match(facilitator, /Red never creates the vulnerability/i);
});

test("legacy facilitator board configuration is absent from participant steps", async () => {
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  assert.doesNotMatch(step, /BOARD_URL|BOARD_TOKEN|BOARD_REPORTER_TOKEN/);
});

test("each Skills lesson routes evidence work through Squad", async () => {
  const steps = await Promise.all(stepFiles.slice(0, 4).map((file) => readFile(path.join(root, file), "utf8")));
  const expected = [
    ["ask Red", "`red`"],
    ["Ask Squad", "`purple`"],
    ["Ask Green", "Continue to Step 4"],
    ["Ask Blue", "`green`"],
  ];

  expected.forEach(([evidence, phase], index) => {
    assert.ok(steps[index].includes(evidence), `step ${index + 1} should mention ${evidence}`);
    assert.ok(steps[index].includes(phase), `step ${index + 1} should mention ${phase}`);
  });
  assert.match(steps[0], /npm run workshop:app/);
  assert.match(steps[3], /phase[\s\S]*blue/);
});

test("legacy workshop document locations remain removed", async () => {
  const removedDocuments = [
    "docs",
    "board/web/README.md",
    "board/worker/README.md",
  ];

  for (const document of removedDocuments) {
    await assert.rejects(access(path.join(root, document)), { code: "ENOENT" });
  }
});

test("facilitator runbook documents EMU provisioning and deterministic gates", async () => {
  const runbook = await readFile(path.join(root, "workshop/FACILITATOR.md"), "utf8");
  for (const expected of [
    "Romain and Christophe",
    "Onepoint example",
    "one private repository",
    "BOARD_URL",
    "BOARD_TOKEN",
    "BOARD_SESSION_ID",
    "There is no per-repository CI credential",
    "Mentor graded the participant's answers",
    "app/src/search-query.js",
    "app/.board-outbox.log",
    "Board is unavailable",
    "0003_ci_completion.sql",
    "Only GitHub Actions",
    "approved operator",
    "internal/private workshop template",
    "5–10",
    "60 participants",
    "development environment secrets",
    "Repository-level values",
    "Actions **variables**",
    "organization-paid, organization-owned Codespaces",
    "non-zero budget",
    "Prebuilds can reduce startup time",
    "advanced CodeQL workflow",
    "unique active committers",
    "external public template",
    "clone",
    "concurrency and capacity",
    "startup staggering only as a fallback",
  ]) {
    assert.ok(runbook.includes(expected), `FACILITATOR.md should mention ${expected}`);
  }
  for (const absent of ["BOARD_TEAM_ID", "BOARD_CI_", "HMAC"]) {
    assert.ok(!runbook.includes(absent), `FACILITATOR.md should no longer mention ${absent}`);
  }
  for (const link of [
    "https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/abilities-and-restrictions-of-managed-user-accounts",
    "https://docs.github.com/en/enterprise-cloud@latest/codespaces/managing-codespaces-for-your-organization/managing-development-environment-secrets-for-your-repository-or-organization",
    "https://docs.github.com/en/enterprise-cloud@latest/codespaces/managing-codespaces-for-your-organization/choosing-who-owns-and-pays-for-codespaces-in-your-organization",
    "https://docs.github.com/en/billing/concepts/product-billing/github-codespaces",
    "https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds",
    "https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets",
    "https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning",
    "https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security",
  ]) {
    assert.ok(runbook.includes(link), `FACILITATOR.md should link ${link}`);
  }
});

test("all workshop documentation is English-only", async () => {
  const frenchPatterns = [
    /[àâçéèêëîïôùûüÿœæ]/i,
    /\b(?:approuvé|approuvée|atelier|avant toute|cas négatifs|committer|demande-moi|dépôt|équipe|explique|faits observés|frontière|montre|ne propose pas|puis attends|répétition|sépare|uniquement)\b/i,
  ];

  for (const file of workshopDocumentation) {
    const content = await readFile(path.join(root, file), "utf8");
    for (const pattern of frenchPatterns) {
      assert.doesNotMatch(content, pattern, `${file} contains French workshop documentation`);
    }
  }
});
