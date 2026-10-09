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
  "workshop/squad/contracts/blue.md",
  "workshop/squad/contracts/green.md",
  "workshop/squad/contracts/red.md",
];

test("README omits manual workshop board connection instructions", async () => {
  const readme = await readFile(readmePath, "utf8");
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.workspaces, ["app"]);
  assert.equal(manifest.scripts["board:local"], undefined);
  assert.equal(manifest.scripts["load:board"], undefined);
  assert.doesNotMatch(readme, /Connect to the Workshop Board|Manual board connection/);
  assert.doesNotMatch(readme, /ALLOW_LOCAL_BOARD|BOARD_SESSION_ID|BOARD_TOKEN|127\.0\.0\.1:8080/);
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
  const squadReadme = await readFile(path.join(root, "workshop/squad/README.md"), "utf8");
  assert.match(squadReadme, /🖥️ Terminal 1/);
  assert.match(squadReadme, /🤖 Terminal 2/);
  for (const slug of ["blue", "red", "green", "scribe", "ralph", "rai-agent", "fact-checker"]) {
    await assert.rejects(access(path.join(root, "workshop/squad/agents", slug, "charter.md")), { code: "ENOENT" });
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
  assert.match(readme, /\.github\/images\/squad\.jpeg/);
  assert.ok(readme.includes(".github/steps/1-step.md"));
  for (const [index, file] of stepFiles.entries()) {
    const content = await readFile(path.join(root, file), "utf8");
    if (index > 0) {
      assert.match(content, /Continue\s+in 🤖 Terminal 2, using the Squad conversation opened in Step 1/);
      assert.match(content, /Do\s+not\s+start\s+a new conversation/);
    }
    if (/^[1-4]-step\.md$/.test(path.basename(file))) {
      assert.match(content, /🖥️ Terminal 1 is for participant shell commands/);
      assert.match(content, /🤖 Terminal 2 is\s+the Copilot CLI\/Squad conversation for prompts/);
      assert.match(content, /unless a command block names another terminal/);
      assert.match(content, /📖 introduces theory, ⌨️ introduces\s+activities, and other emoji are visual markers/);
    }
    if (index < stepFiles.length - 1) {
      assert.ok(content.includes(`](${path.basename(stepFiles[index + 1])})`), `${file}: next step`);
    }
    for (const command of requiredCommands[index] || []) {
      assert.ok(content.includes(`npm run ${command}`), `${file}: ${command}`);
    }
    for (const [, command] of content.matchAll(/npm run ([\w:-]+)/g)) {
      assert.ok(Object.hasOwn(manifest.scripts, command), `${file}: undeclared command ${command}`);
    }
    if (index === 0) {
      assert.match(content, /copilot --agent squad --yolo/);
      assert.doesNotMatch(content, /' OR 1=1 --/);
      assert.match(content, /Add @copilot as an autonomous team member\? \[Y\/n\].*answer `No`/s);
      assert.doesNotMatch(content, /\.squad\/config\.json/);
      assert.match(content, /sqli-demo\/0-search-not-implemented\.png/);
      assert.match(content, /sqli-demo\/1-normal-search\.png/);
      assert.doesNotMatch(content, /sqli-demo\/2-injected-search\.png/);
      assert.ok(content.indexOf("squad init --no-workflows") < content.indexOf("squad doctor"));
      assert.ok(content.indexOf("squad doctor") < content.indexOf("npm run workshop:start"));
      assert.ok(content.indexOf("copilot --agent squad --yolo") < content.indexOf("/model gpt-6-luna"));
      assert.ok(content.indexOf("/model gpt-6-luna") < content.indexOf("Squad, create my team:"));
      assert.ok(content.indexOf("Squad, create my team:") < content.indexOf("npm run workshop:start"));
      assert.match(content, /Roster approval.*❯ Yes, hire this team/s);
      assert.match(content, /Project: Local Node workshop/i);
      assert.match(content, /Blue applies approved corrections via reviewed PR to main/i);
      assert.match(content, /Red is read-only\s+security reviewer; Green publishes city search only to feature\/city-search/i);
      assert.match(content, /Include the four default built-ins; no @copilot\s+or other specialists/i);
      assert.match(content, /complete-roster fast path\. Show all seven members with roles\/scopes/i);
      assert.match(content, /wait for my approval; don't ask again or recast/i);
      assert.match(content, /Then create standard\s+Squad state and stop/i);
      assert.match(content, /Review the delivery checks in 🤖 Terminal 2/);
      assert.match(content, /Confirm they are active and wait for my task/i);
      assert.match(content, /Do not repeat the\s+roster summary, implement, or advance a phase/i);
      assert.doesNotMatch(content, /which language the app uses, answer `node app`/i);
      const initSkill = await readFile(path.join(root, ".github/skills/coordinator-init-mode/SKILL.md"), "utf8");
      assert.match(initSkill, /Complete-roster fast path/);
      assert.match(initSkill, /Skip step 2 and the casting algorithm/i);
      assert.match(initSkill, /Do not delegate team creation to a specialist agent/i);
      const squadAgent = await readFile(path.join(root, ".github/agents/squad.agent.md"), "utf8");
      assert.match(squadAgent, /match skills by intent, not isolated keywords/i);
      assert.match(squadAgent, /do not load the `squad` command catalog or cross-squad skills/i);
      const shellCommands = Array.from(content.matchAll(/```bash\s*\n([\s\S]*?)\n\s*```/g),
        (match) => match[1].trim());
      assert.deepEqual(shellCommands, [
        "squad init --no-workflows",
        "squad doctor",
        "copilot --agent squad --yolo",
        "npm run workshop:start",
        "npm run workshop:restart",
        "npm run delivery",
        "npm run phase -- red",
      ]);
    } else assert.doesNotMatch(content, /--yolo/);
    if (index === 1) {
      assert.match(content, /' OR 1=1 --/);
      assert.match(content, /sqli-demo\/2-injected-search\.png/);
      assert.match(content, /Do not edit or exploit\.\s+Answer only; do not offer fixes, a follow-up menu or a findings commit/i);
      assert.match(content, /Confirm that you opened and saw the matching CodeQL alert for this exact\s+commit/i);
      assert.match(content, /trust-based attestation[\s\S]*No quiz or additional proof is\s+required/i);
      assert.match(content, /`--reviewed` records your confirmation that you viewed\s+the alert/i);
      assert.doesNotMatch(content, /knowledge check|three-question quiz|Which statement describes the input flow/i);
    }
    if (index === 3) {
      assert.match(content, /sqli-demo\/3-fixed-search\.png/);
      assert.match(content, /delivery regression\s+in 🖥️ Terminal 1/);
    }
  }
  const setup = await readFile(path.join(root, "scripts/setup-workshop.sh"), "utf8");
  assert.ok(setup.indexOf("squad doctor") < setup.indexOf("copilot --agent squad --yolo"));
  assert.ok(setup.indexOf("copilot --agent squad --yolo") < setup.indexOf("/model gpt-6-luna"));
  assert.ok(setup.indexOf("/model gpt-6-luna") < setup.indexOf("npm run workshop:start"));
  assert.match(setup, /answer No/);
  assert.match(setup, /❯ Yes, hire this team/);
  assert.match(setup, /complete team prompt in \.github\/steps\/1-step\.md/);
  assert.doesNotMatch(setup, /answer "node app"/);
  assert.match(setup, /all npm\s+commands in participant Terminal 1/);
  assert.doesNotMatch(setup, /\.squad\/config\.json/);
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
