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
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  const redCharter = await readFile(
    path.join(root, "workshop/squad/agents/red/charter.md"),
    "utf8",
  );

  assert.match(step, /already present in the starting application/i);
  assert.match(redCharter, /never\s+creates or introduces a vulnerability/i);
});

test("Step 1 checks board setup without exposing the token", async () => {
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  assert.match(step, /BOARD_URL/);
  assert.match(step, /BOARD_TOKEN/);
  assert.match(step, /\/health/);
  assert.match(step, /value hidden/i);
  assert.doesNotMatch(step, /BOARD_REPORTER_TOKEN/);
});

test("Step 1 withholds the exploit and expected results until evidence is collected", async () => {
  const step = await readFile(path.join(root, stepFiles[0]), "utf8");
  assert.doesNotMatch(step, /%27|27,400|12 listings|4 unpublished|FLAG\{\.\.\.\}/);
  assert.match(step, /This is\s+\*\*not a command\*\*/);
  assert.match(step, /normal Paris search/i);
  assert.match(step, /Red—not you—runs `npm run exploit`/);
  assert.match(step, /Mentor's formal check happens after you have reviewed the evidence/i);
  assert.match(step, /copilot --yolo --agent squad/);
  assert.match(step, /GPT-6 Luna/);
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
