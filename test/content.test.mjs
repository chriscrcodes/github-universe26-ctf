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
  "workshop/squad/README.md",
  "workshop/squad/routing.md",
  "workshop/squad/agents/blue/charter.md",
  "workshop/squad/agents/fact-checker/charter.md",
  "workshop/squad/agents/green/charter.md",
  "workshop/squad/agents/mentor/charter.md",
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
  ];

  let previousIndex = -1;
  for (const section of requiredSections) {
    const index = readme.indexOf(section);
    assert.notEqual(index, -1, `missing README section: ${section}`);
    assert.ok(index > previousIndex, `README section is out of order: ${section}`);
    previousIndex = index;
  }
});

test("README directs participants to the Step 1 startup instructions", async () => {
  const readme = await readFile(readmePath, "utf8");
  assert.match(readme, /## Meet Squad/);
  assert.match(readme, /\*\*Squad\*\*/);
  assert.match(readme, /\*\*Red\*\*/);
  assert.match(readme, /\*\*Green\*\*/);
  assert.match(readme, /\*\*Blue\*\*/);
  assert.match(readme, /Squad documentation/);
  assert.match(readme, /### How to start this exercise[\s\S]*Step 1/);
  assert.match(readme, /You run the setup commands yourself/);
  assert.doesNotMatch(readme, /you never run the internal tooling yourself/i);
});

test("README presents a GitHub-native hero without official Squad branding", async () => {
  const readme = await readFile(readmePath, "utf8");
  const heroEnd = readme.indexOf("</div>");
  const startSection = readme.indexOf("### How to start this exercise");
  const exerciseButton = readme.indexOf("Start%20the%20exercise");
  const scoreboardImage = readme.indexOf("arcade-scoreboard-participant.png");
  assert.match(readme, /https:\/\/bradygaster\.github\.io\/squad\//);
  assert.ok(exerciseButton > startSection);
  assert.ok(exerciseButton < scoreboardImage);
  assert.ok(exerciseButton > heroEnd);
  assert.match(readme, /<p align="left">\s*<a href="\.github\/steps\/1-step\.md"><img src="https:\/\/img\.shields\.io\/badge\/Start%20the%20exercise/);
  assert.match(readme, /<p align="left">\s*<img src="\.github\/images\/arcade-scoreboard-participant\.png"/);
  assert.match(readme, /<div align="center">/);
  assert.match(readme, /not an official Squad product demonstration/);
  assert.match(readme, /\.github\/images\/squad-role-map\.svg/);
  assert.match(readme, /routes your natural-language\s+requests to specialist roles/i);
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
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  for (const expected of [
    "10 min intro",
    "30 min hands-on",
    "5 min debrief",
    "squad init --no-workflows",
    "npm run squad:install-workshop-team",
    "squad doctor",
  ]) {
    assert.ok(
      readme.includes(expected) || step.includes(expected),
      `README.md or Step 1 should mention ${expected}`,
    );
  }
});

test("steps document participant approval and the Red, Green, and Blue flow", async () => {
  const steps = await Promise.all(stepFiles.map((file) => readFile(path.join(root, file), "utf8")));
  const combined = steps.join("\n");
  for (const expected of [
    "supplied payload",
    "CodeQL",
    "Any explicit yes in reply to the",
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
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  const redCharter = await readFile(
    path.join(root, "workshop/squad/agents/red/charter.md"),
    "utf8",
  );

  assert.match(step, /already present in the starting application/i);
  assert.match(redCharter, /never\s+creates or introduces a vulnerability/i);
  assert.match(step, /Red must not ask questions or propose a fix/i);
  assert.match(step, /Red must not ask questions or propose a fix/i);
  assert.match(redCharter, /Do not propose[\s\S]*remediation[\s\S]*offer\s+repair\s+choices/i);
});

test("Step 1 checks board setup without exposing the token", async () => {
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  assert.match(step, /BOARD_URL/);
  assert.match(step, /BOARD_TOKEN/);
  assert.match(step, /\/health/);
  assert.match(step, /value hidden/i);
  assert.doesNotMatch(step, /BOARD_REPORTER_TOKEN/);
});

test("Step 1 guides the canonical browser payload and automatic Red publication", async () => {
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  assert.match(step, /initialization only/i);
  assert.match(step, /Copilot CLI session, confirm that the local \*\*Squad\*\*/i);
  assert.match(step, /VS Code Chat does not provide the terminal access/i);
  assert.match(step, /copilot --yolo --agent squad/);
  assert.match(step, /\/model gpt-6-luna/);
  assert.match(step, /normal Paris search/i);
  assert.match(step, /app\/src\/search-query\.js[\s\S]*buildCityFilter/);
  assert.match(step, /' OR 1=1 --/);
  assert.match(step, /test it in the hotel search interface/i);
  assert.match(step, /advances\s+`red` on the scoreboard automatically/i);
  assert.doesNotMatch(step, /npm run exploit|written prediction/i);
});

test("Red investigates and explains without asking participant questions", async () => {
  const redCharter = await readFile(
    path.join(root, "workshop/squad/agents/red/charter.md"),
    "utf8",
  );
  assert.match(redCharter, /Do not ask the participant questions or request a prediction/i);
  assert.match(redCharter, /canonical\s+payload `' OR 1=1 --`/);
  assert.match(redCharter, /participant to paste the canonical payload[\s\S]*interface/i);
  assert.match(redCharter, /automatically records\/publishes Red/i);
  assert.match(redCharter, /After the participant tests it, explain the observed result and impact/i);
  assert.doesNotMatch(redCharter, /npm run phase -- red/);
  assert.doesNotMatch(redCharter, /Ask the participant to predict/i);
});

test("CodeQL override instructions are explicit and never call an override clean", async () => {
  const steps = await Promise.all([1, 2, 3, 4].map((number) => readFile(
    path.join(root, `.github/steps/${number}-step.md`),
    "utf8",
  )));
  const combined = steps.join("\n");
  assert.match(combined, /--phase=purple --override --reason/);
  assert.match(combined, /--phase=blue --override --reason/);
  assert.match(combined, /unverified/i);
  assert.match(combined, /unverified[\s\S]*not clean|does not mark CodeQL clean/i);
});

test("Mentor checkpoint guidance provides corrections without repeating questions", async () => {
  const mentor = await readFile(path.join(root, "workshop/squad/agents/mentor/charter.md"), "utf8");
  assert.match(mentor, /--check=<question-id>:<option-id>/);
  assert.match(mentor, /give the participant the returned[\s\S]*correct option/i);
  assert.match(mentor, /Do not repeat the same question/i);
});

test("each Skills lesson is Mentor-led with a Squad fallback prompt", async () => {
  const steps = await Promise.all(stepFiles.slice(0, 4).map((file) => readFile(path.join(root, file), "utf8")));
  const expected = [
    ["ask Red", "`red`"],
    ["Ask Squad", "`purple`"],
    ["ask Green", "Continue to Step 4"],
    ["ask Blue", "`blue`"],
  ];

  expected.forEach(([evidence, phase], index) => {
    assert.ok(steps[index].toLowerCase().includes(evidence.toLowerCase()), `step ${index + 1} should mention ${evidence}`);
    assert.ok(steps[index].includes(phase), `step ${index + 1} should mention ${phase}`);
    assert.match(steps[index], /<summary>If Mentor stalls<\/summary>[\s\S]*Mentor, continue\./);
  });
  assert.match(steps[0], /Mentor leads the conversation/);
  assert.match(steps[0], /only answer Mentor's questions/);
  steps.slice(1).forEach((step) => assert.match(step, /\*\*Your decision/));
  assert.match(steps[0], /npm run workshop:app/);
  assert.match(steps[3], /phase[\s\S]*blue/);
});

test("lessons require actual CodeQL reading and Green implementation before Blue delivery", async () => {
  const steps = await Promise.all(stepFiles.slice(0, 4).map((file) => readFile(path.join(root, file), "utf8")));
  assert.match(steps[0], /describe what you observe/);
  assert.match(steps[1], /--phase=purple --confirm --analysis=ID --commit=SHA/);
  assert.doesNotMatch(steps[1], /use the facilitator's reference finding/);
  assert.match(steps[2], /Only after approval, Green implements[\s\S]*npm run workshop:app -- --restart[\s\S]*Red retests[\s\S]*npm run phase -- green/);
  assert.match(steps[1], /Green explains the finding in every case, including after an override/);
  assert.match(steps[0], /CodeQL pre-flight/);
  assert.match(steps[3], /After the push[\s\S]*npm run regressions[\s\S]*--phase=blue --confirm[\s\S]*npm run phase -- blue/);
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

test("facilitator runbook is not included in the participant repository", async () => {
  await assert.rejects(access(path.join(root, "workshop/FACILITATOR.md")), {
    code: "ENOENT",
  });
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
