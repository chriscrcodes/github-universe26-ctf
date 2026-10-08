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

test("participant repository only connects to the facilitator-owned board", async () => {
  const readme = await readFile(readmePath, "utf8");
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.workspaces, ["app"]);
  assert.equal(manifest.scripts["board:local"], undefined);
  assert.equal(manifest.scripts["load:board"], undefined);
  assert.match(readme, /ALLOW_LOCAL_BOARD=1/);
  assert.match(readme, /BOARD_SESSION_ID=local-workshop/);
  assert.match(readme, /127\.0\.0\.1:8080/);
  assert.match(readme, /https:\/\/github\.com\/chriscrcodes\/github-universe26-ctf-facilitator/);
  assert.doesNotMatch(readme, /BOARD_OPERATOR_KEY|npm run board:local|FACILITATOR\.md/);
  assert.doesNotMatch(readme, /--request (?:DELETE|POST)|\/api\/teams\/|\/api\/reset/);
});

test("operator artifacts do not ship in the participant repository", async () => {
  const files = await readdir(root);
  assert.ok(!files.includes("FACILITATOR.md"));
  assert.ok(!files.includes("facilitator.md"));
  for (const artifact of ["board", "scripts/load-board.mjs", "scripts/restart-workshop.sh",
    "test/board.test.mjs", "test/facilitator.test.mjs", "test/e2e.test.mjs",
    "workshop/interaction-log.md",
    ".github/images/arcade-scoreboard-participant.png"]) {
    await assert.rejects(access(path.join(root, artifact)), { code: "ENOENT" });
  }
});

test("participant pages have metadata and workshop documents have valid blocks and links", async () => {
  for (const file of workshopDocumentation) {
    const content = await readFile(path.join(root, file), "utf8");
    if (file === "README.md" || stepFiles.includes(file)) {
      assert.match(content, /^---\ntitle: .+\ndescription: .+\n---/, `${file}: metadata`);
    }
    assert.equal((content.match(/^\s*```/gm) || []).length % 2, 0, `${file}: code blocks`);
    const targets = [
      ...Array.from(content.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1]),
      ...Array.from(content.matchAll(/(?:href|src)="([^"]+)"/g), (match) => match[1]),
    ];
    for (const target of targets) {
      if (/^(?:[a-z]+:|#)/i.test(target)) continue;
      await access(path.resolve(root, path.dirname(file), decodeURIComponent(target.split("#")[0])));
    }
  }
});

test("workshop steps link forward and use available commands at the appropriate stage", async () => {
  const actual = (await readdir(path.join(root, ".github/steps"))).sort();
  assert.deepEqual(actual, stepFiles.map((file) => path.basename(file)).sort());
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const requiredCommands = [
    ["workshop:start", "delivery", "phase -- red"],
    ["codeql:review -- baseline --reviewed", "phase -- purple"],
    ["approve -- parameter-binding"],
    ["verify", "regressions", "phase -- green", "phase -- blue", "codeql:review -- fixed --reviewed"],
  ];
  const readme = await readFile(readmePath, "utf8");
  assert.ok(readme.includes(".github/steps/1-step.md"));
  for (const [index, file] of stepFiles.entries()) {
    const content = await readFile(path.join(root, file), "utf8");
    if (index < stepFiles.length - 1) {
      assert.ok(content.includes(`](${path.basename(stepFiles[index + 1])})`), `${file}: next step`);
    }
    for (const command of requiredCommands[index] || []) {
      assert.ok(content.includes(`npm run ${command}`), `${file}: ${command}`);
    }
    for (const [, command] of content.matchAll(/npm run ([\w:-]+)/g)) {
      assert.ok(Object.hasOwn(manifest.scripts, command), `${file}: undeclared command ${command}`);
    }
    assert.doesNotMatch(content, /--yolo/);
  }
});

test("retired files and commands remain absent", async () => {
  for (const file of [
    "test/app.test.mjs",
    "test/reset.test.mjs",
    "docs",
    "workshop/FACILITATOR.md",
    ".github/workflows/security.yml",
    "workshop/quiz/questions.json",
    "app/src/quiz.js",
    "app/scripts/checkpoint.js",
    "app/test/checkpoint.test.js",
    "scripts/exploit.mjs",
    "app/scripts/exploit.js",
  ]) {
    await assert.rejects(access(path.join(root, file)), { code: "ENOENT" });
  }
  for (const file of ["package.json", "app/package.json"]) {
    const manifest = JSON.parse(await readFile(path.join(root, file), "utf8"));
    assert.equal(manifest.scripts.checkpoint, undefined);
    assert.equal(manifest.scripts.exploit, undefined);
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
