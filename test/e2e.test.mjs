import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import { hotelsFrom, request } from "./http.mjs";
import quiz from "../app/src/quiz.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(repoRoot, "app");
const boardDir = path.join(repoRoot, "board", "server");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const APP_PORT = 23000;
const BOARD_PORT = 28080;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const BOARD_URL = `http://127.0.0.1:${BOARD_PORT}`;
const BOARD_SESSION_ID = "universe-2026-e2e";
const BOARD_OPERATOR_KEY = "e2e-test-secret";
const BOARD_TOKEN = "e2e-board-token";
const BOARD_CI_REPOSITORY = "example/participant-one";
const TEAM_STATE_FILE = path.join(appDir, ".team-state-e2e.json");
const PATCHED_SOURCE_DIR = path.join(appDir, ".e2e-patched-src");
const BASELINE_SOURCE_DIR = path.join(appDir, ".e2e-baseline-src");
const vulnerableCityFilter = "return { clause: `city = '${city}' COLLATE NOCASE`, parameters: [] };";
const boundCityFilter = 'return { clause: "city = ? COLLATE NOCASE", parameters: [city] };';
const GIT_SANDBOX_DIR = path.join(appDir, ".e2e-git-sandbox");
const GIT_IDENTITY = {
  GIT_AUTHOR_NAME: "Workshop E2E",
  GIT_AUTHOR_EMAIL: "e2e@example.invalid",
  GIT_COMMITTER_NAME: "Workshop E2E",
  GIT_COMMITTER_EMAIL: "e2e@example.invalid",
};
const questionBank = quiz.loadQuestionBank();

function checkpointArguments(phase, teamId) {
  const questions = quiz.selectQuestions(questionBank, phase, quiz.seededRandom(teamId));
  const answers = questions.map((question) => {
    const sourceQuestion = questionBank.questions.find((entry) => entry.id === question.id);
    const correct = question.options.find((option) => (
      quiz.answerHash(questionBank.salt, question.id, option.id) === sourceQuestion.answerHash
    ));
    return `${question.id}:${correct.id}`;
  }).join(",");
  return ["run", "checkpoint", "--", `--phase=${phase}`, `--seed=${teamId}`, `--answers=${answers}`];
}

const managedProcesses = [];

function commandEnv(overrides) {
  return { ...process.env, ...overrides };
}

function captureProcess(child) {
  const output = { stdout: "", stderr: "" };
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => { output.stdout += chunk; });
  child.stderr?.on("data", (chunk) => { output.stderr += chunk; });
  return output;
}

function formatOutput({ stdout, stderr }) {
  const rendered = [stdout.trim() ? `stdout:\n${stdout.trim()}` : "", stderr.trim() ? `stderr:\n${stderr.trim()}` : ""]
    .filter(Boolean)
    .join("\n");
  return rendered ? `\n${rendered}` : "";
}

function spawnServer({ name, cwd, script, env }) {
  const child = spawn(process.execPath, [script], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = captureProcess(child);
  const handle = {
    name,
    child,
    output,
    exit: once(child, "exit").then(([code, signal]) => ({ code, signal })),
  };
  managedProcesses.push(handle);
  return handle;
}

async function runCommand({ cwd, env, args }) {
  const child = spawn(npmCommand, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = captureProcess(child);
  const [code, signal] = await once(child, "close");
  return { code, signal, ...output };
}

async function runNode({ cwd, env, args }) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const output = captureProcess(child);
  const [code, signal] = await once(child, "close");
  return { code, signal, ...output };
}

async function runCodeql({ cwd, env, phase, commit, confirm = false, publish = false }) {
  const args = publish ? [phase] : [`--phase=${phase}`,
    ...(confirm ? ["--confirm", `--analysis=${phase === "purple" ? 10 : 20}`, `--commit=${commit}`] : [])];
  const code = `
    const { execFileSync } = require('node:child_process');
    const { collectCodeqlEvidence, repositoryContext, verifyDeliveryWorkflow, CATEGORY, REF } = require(${JSON.stringify(path.join(appDir, "src/codeql-evidence.js"))});
    const getContext = () => repositoryContext((command, args) => command === 'gh'
      ? JSON.stringify({ nameWithOwner: ${JSON.stringify(BOARD_CI_REPOSITORY)} })
      : execFileSync(command, args, { encoding: 'utf8' }).trim());
    const phase = ${JSON.stringify(phase)};
    const context = getContext();
    const analysis = { id: phase === 'purple' ? 10 : 20, tool: { name: 'CodeQL' }, ref: REF,
      commit_sha: context.commit, category: CATEGORY, error: '', rules_count: 100,
      results_count: phase === 'purple' ? 1 : 0 };
    const alert = { number: 7, tool: { name: 'CodeQL' }, rule: { id: 'js/sql-injection' },
      state: phase === 'purple' ? 'open' : 'fixed' };
    const api = async (_repository, resource) => resource === 'analyses' ? [analysis]
      : resource === 'alerts' ? [alert]
      : [{ ref: REF, commit_sha: context.commit, category: CATEGORY, state: alert.state }];
    const dependencies = { getContext,
      collect: (current, currentPhase, initial) => collectCodeqlEvidence(current, currentPhase, initial, api),
      verifyWorkflow: (current) => verifyDeliveryWorkflow(current, () => JSON.stringify([{ workflow_runs: [{
        id: 20, head_sha: current.commit, head_branch: 'main', head_repository: { full_name: current.repository },
        status: 'completed', conclusion: 'success'
      }] }])) };
    require(${JSON.stringify(path.join(appDir, "scripts", publish ? "publish-phase.js" : "codeql-review.js"))})
      .main(${JSON.stringify(args)}, dependencies).catch((error) => { console.error(error.message); process.exitCode = 1; });
  `;
  return runNode({ cwd, env, args: ["--input-type=commonjs", "-e", code] });
}

async function waitForHealth({ name, url, processHandle, timeoutMs = 10_000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle.child.exitCode !== null) {
      const exit = await processHandle.exit;
      throw new Error(
        `${name} exited before becoming healthy (code=${exit.code}, signal=${exit.signal ?? "none"}).${formatOutput(processHandle.output)}`
      );
    }

    try {
      const { response } = await request(url, "/health", { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      // Poll until timeout for startup or port-conflict failure.
    }

    await delay(200);
  }

  throw new Error(
    `${name} did not become healthy at ${url}/health within ${timeoutMs}ms. Possible port conflict or startup failure.${formatOutput(processHandle.output)}`
  );
}

async function assertPortFree(port, name) {
  const probe = net.createServer();
  let listening = false;
  try {
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(port, "127.0.0.1", () => {
        listening = true;
        resolve();
      });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
      throw new Error(`${name} cannot start because port ${port} is already in use.`);
    }
    throw error;
  } finally {
    if (listening) {
      await new Promise((resolve) => probe.close(() => resolve()));
    }
  }
}

async function stopProcess(processHandle) {
  if (!processHandle) return;
  const { child } = processHandle;
  if (child.exitCode !== null) {
    await processHandle.exit.catch(() => {});
    return;
  }

  child.kill("SIGTERM");
  const result = await Promise.race([
    processHandle.exit.then((value) => ({ type: "exit", value })),
    delay(5_000).then(() => ({ type: "timeout" })),
  ]);

  if (result.type === "timeout" && child.exitCode === null) {
    child.kill("SIGKILL");
    await processHandle.exit.catch(() => {});
  }
}

async function cleanupManagedProcesses() {
  await Promise.allSettled(managedProcesses.map((handle) => stopProcess(handle)));
}

async function createPushedGitSandbox() {
  await rm(GIT_SANDBOX_DIR, { recursive: true, force: true });
  const workTree = path.join(GIT_SANDBOX_DIR, "participant");
  const remote = path.join(GIT_SANDBOX_DIR, "remote.git");
  await mkdir(workTree, { recursive: true });
  await mkdir(remote, { recursive: true });

  const git = async (args, cwd) => {
    const child = spawn("git", args, { cwd, env: commandEnv(GIT_IDENTITY), stdio: ["ignore", "pipe", "pipe"] });
    const output = captureProcess(child);
    const [code] = await once(child, "close");
    assert.equal(code, 0, `git ${args.join(" ")} failed.${formatOutput(output)}`);
  };

  await git(["init", "--bare", "--initial-branch=main", "."], remote);
  await git(["init", "--initial-branch=main", "."], workTree);
  await writeFile(path.join(workTree, "README.md"), "participant sandbox\n");
  await cp(BASELINE_SOURCE_DIR, path.join(workTree, "app/src"), { recursive: true });
  await git(["add", "."], workTree);
  await git(["commit", "-m", "workshop baseline"], workTree);
  await git(["remote", "add", "origin", remote], workTree);
  await git(["push", "-u", "origin", "main"], workTree);
  return workTree;
}

function baselineQuerySource(source) {
  assert.ok(source.includes(vulnerableCityFilter) || source.includes(boundCityFilter),
    "the fixture must recognize the baseline or exact approved correction");
  return source.replace(boundCityFilter, vulnerableCityFilter);
}

async function buildBaselineSourceTree() {
  await rm(BASELINE_SOURCE_DIR, { recursive: true, force: true });
  await cp(path.join(appDir, "src"), BASELINE_SOURCE_DIR, { recursive: true });
  const queryFile = path.join(BASELINE_SOURCE_DIR, "search-query.js");
  await writeFile(queryFile, baselineQuerySource(await readFile(queryFile, "utf8")));
}

async function buildPatchedSourceTree() {
  await rm(PATCHED_SOURCE_DIR, { recursive: true, force: true });
  await mkdir(PATCHED_SOURCE_DIR, { recursive: true });
  await cp(BASELINE_SOURCE_DIR, PATCHED_SOURCE_DIR, { recursive: true });

  const queryFile = path.join(PATCHED_SOURCE_DIR, "search-query.js");
  const original = await readFile(queryFile, "utf8");
  const patched = original.replace(
    /return \{ clause: `city = '\$\{city\}' COLLATE NOCASE`, parameters: \[\] \};/,
    'return { clause: "city = ? COLLATE NOCASE", parameters: [city] };'
  );
  assert.notEqual(patched, original, "the reference remediation patch must apply to app/src/search-query.js");
  await writeFile(queryFile, patched);
  return PATCHED_SOURCE_DIR;
}

async function readTeamState() {
  return JSON.parse(await readFile(TEAM_STATE_FILE, "utf8"));
}

async function fetchState() {
  const result = await request(BOARD_URL, "/api/state", { signal: AbortSignal.timeout(1_000) });
  assert.equal(result.response.status, 200, "board state endpoint should respond");
  assert.ok(result.body && Array.isArray(result.body.teams), "board state should expose a teams array");
  return result.body.teams;
}

async function waitForPhase(teamId, phase, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const teams = await fetchState();
    const team = teams.find((entry) => entry.teamId === teamId);
    if (team?.phase === phase) return team;
    await delay(200);
  }

  throw new Error(`Timed out waiting for team ${teamId} to reach phase ${phase}.`);
}

function assertExitOk(result, description) {
  assert.equal(
    result.code,
    0,
    `${description} should exit 0.${formatOutput(result)}`
  );
}

after(async () => {
  await cleanupManagedProcesses();
  await rm(TEAM_STATE_FILE, { force: true });
  await rm(PATCHED_SOURCE_DIR, { recursive: true, force: true });
  await rm(BASELINE_SOURCE_DIR, { recursive: true, force: true });
  await rm(GIT_SANDBOX_DIR, { recursive: true, force: true });
});

test("the isolated baseline fixture supports a checkout with the approved correction", async () => {
  const source = await readFile(path.join(appDir, "src/search-query.js"), "utf8");
  const fixed = source.replace(vulnerableCityFilter, boundCityFilter);
  assert.ok(fixed.includes(boundCityFilter));
  assert.ok(baselineQuerySource(fixed).includes(vulnerableCityFilter));
});

test("participant workshop journey runs end-to-end", { timeout: 30_000 }, async () => {
  await assertPortFree(BOARD_PORT, "board server");
  await assertPortFree(APP_PORT, "application server");

  const boardEnv = commandEnv({
    PORT: String(BOARD_PORT),
    BOARD_OPERATOR_KEY,
    BOARD_TOKEN,
    BOARD_SESSION_ID,
  });
  const vulnerableAppEnv = commandEnv({
    APP_URL,
    PORT: String(APP_PORT),
    BOARD_URL,
    BOARD_TOKEN,
    BOARD_TEAM_ID: "participant-one",
    ALLOW_LOCAL_BOARD: "1",
    BOARD_SESSION_ID,
    TEAM_STATE_FILE,
  });
  const sharedAppCliEnv = {
    APP_URL,
    BOARD_URL,
    BOARD_TOKEN,
    BOARD_TEAM_ID: "participant-one",
    ALLOW_LOCAL_BOARD: "1",
    BOARD_SESSION_ID,
    TEAM_STATE_FILE,
    PORT: String(APP_PORT),
  };

  console.log("[1/15] starting the progress board...");
  const board = spawnServer({
    name: "board server",
    cwd: boardDir,
    script: "src/server.js",
    env: boardEnv,
  });
  await waitForHealth({ name: "board server", url: BOARD_URL, processHandle: board });

  console.log("[2/15] starting the workshop app and preparing a deterministic baseline...");
  await buildBaselineSourceTree();
  let app = spawnServer({
    name: "application server",
    cwd: appDir,
    script: path.join(BASELINE_SOURCE_DIR, "server.js"),
    env: vulnerableAppEnv,
  });
  await waitForHealth({ name: "application server", url: APP_URL, processHandle: app });
  const initialReset = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: ["run", "reset"],
  });
  assertExitOk(initialReset, "initial reset");
  const initialParis = await request(APP_URL, "/api/hotels?city=Paris", { signal: AbortSignal.timeout(1_000) });
  const initialLowercaseParis = await request(APP_URL, "/api/hotels?city=paris", { signal: AbortSignal.timeout(1_000) });
  assert.equal(initialParis.response.status, 200);
  assert.equal(initialLowercaseParis.response.status, 200);
  const baselineParisHotels = hotelsFrom(initialParis.body);
  assert.equal(baselineParisHotels.length, 2, "baseline Paris dataset must contain two public listings");
  assert.ok(baselineParisHotels.every((hotel) => hotel.listingStatus === "PUBLIC"));
  assert.deepEqual(
    hotelsFrom(initialLowercaseParis.body),
    baselineParisHotels,
    "city search should be case-insensitive before remediation"
  );

  console.log("[3/15] registering the team and confirming the board shows started...");
  const register = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: ["run", "register"],
  });
  assertExitOk(register, "register");
  const teamState = await readTeamState();
  const startedTeams = await fetchState();
  assert.equal(startedTeams.length, 1, `expected exactly one team on the board, found ${startedTeams.length}`);
  assert.equal(startedTeams[0].teamId, teamState.teamId);
  assert.equal(startedTeams[0].phase, "started");

  console.log("[4/15] participant tests Red's canonical payload in the hotel search...");
  const redSearch = await request(APP_URL,
    `/api/hotels?city=${encodeURIComponent("' OR 1=1 --")}`, { signal: AbortSignal.timeout(1_000) });
  assert.equal(redSearch.response.status, 200);
  assert.equal(hotelsFrom(redSearch.body).length, 24);
  assert.equal(redSearch.body.workshop.status, "board");
  assert.equal((await readTeamState()).evidence.red.command, "participant-ui-canonical-payload");
  assert.equal((await fetchState()).length, 1, "Red must not create another participant");
  await waitForPhase(teamState.teamId, "red");

  const sandbox = await createPushedGitSandbox();
  const baselineRevision = await runNode({ cwd: sandbox, env: commandEnv(sharedAppCliEnv),
    args: ["-e", "process.stdout.write(require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim())"] });
  assertExitOk(baselineRevision, "baseline SHA");
  const baselineCommit = baselineRevision.stdout.trim();
  assertExitOk(await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "purple" }), "initial CodeQL lookup");
  assert.equal((await readTeamState()).codeqlReviews.purple.reviewedBy, undefined);

  console.log("[6/19] completing the purple understanding checkpoint...");
  const checkpoint = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: checkpointArguments("purple", teamState.teamId),
  });
  assertExitOk(checkpoint, "Purple checkpoint");
  assert.match(checkpoint.stdout, /PASS: purple checkpoint confirmed/);

  console.log("[7/15] participant publishes the purple phase...");
  const unreviewedPurple = await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "purple", publish: true });
  assert.equal(unreviewedPurple.code, 1);
  assert.match(unreviewedPurple.stderr, /Missing participant CodeQL review/);
  assertExitOk(await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "purple",
    confirm: true, commit: baselineCommit }), "participant initial reading");
  const purple = await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "purple", publish: true });
  assertExitOk(purple, "purple phase publish");
  const purpleTeam = await waitForPhase(teamState.teamId, "purple");
  assert.equal((await fetchState()).length, 1, "Purple must not create another participant");
  if ("source" in purpleTeam) {
    assert.equal(purpleTeam.source, "participant");
  }

  console.log("[9/16] recording the participant remediation approval...");
  const approval = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: ["run", "approve", "--", "parameter-binding"],
  });
  assertExitOk(approval, "approval");
  assert.match(approval.stdout, /may be applied by Green/);

  console.log("[8/15] Green applies the approved patch and restarts the app...");
  await stopProcess(app);
  await buildPatchedSourceTree();
  await cp(PATCHED_SOURCE_DIR, path.join(sandbox, "app/src"), { recursive: true });
  app = spawnServer({
    name: "application server",
    cwd: sandbox,
    script: path.join(sandbox, "app/src/server.js"),
    env: commandEnv({ APP_URL, PORT: String(APP_PORT) }),
  });
  await waitForHealth({ name: "application server", url: APP_URL, processHandle: app });

  console.log("[10/16] verifying the parameterized query blocks the exploit...");
  const verify = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: ["run", "verify"],
  });
  assertExitOk(verify, "verify");
  assert.match(verify.stdout, /PASS:/, "verify output should report PASS");
  const retest = await runCommand({ cwd: appDir, env: commandEnv(sharedAppCliEnv), args: ["run", "exploit"] });
  assert.equal(retest.code, 1, "Red's original payload should be blocked after the fix");
  assert.match(retest.stderr, /tautology should return every listing/);
  assert.doesNotMatch(retest.stdout, /CAPTURED:/);

  console.log("[11/19] completing the green remediation checkpoint...");
  const greenCheckpoint = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: checkpointArguments("green", teamState.teamId),
  });
  assertExitOk(greenCheckpoint, "Green checkpoint");
  assert.match(greenCheckpoint.stdout, /PASS: green checkpoint confirmed/);

  console.log("[11/16] participant publishes Green's approved remediation...");
  const green = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: ["run", "phase", "--", "green"],
  });
  assertExitOk(green, "green phase publish");
  await waitForPhase(teamState.teamId, "green");
  assert.equal((await fetchState()).length, 1, "Green must not create another participant");

  console.log("[12/16] checking intended behavior...");
  const paris = await request(APP_URL, "/api/hotels?city=Paris", { signal: AbortSignal.timeout(1_000) });
  const lowercaseParis = await request(APP_URL, "/api/hotels?city=paris", { signal: AbortSignal.timeout(1_000) });
  assert.equal(paris.response.status, 200);
  assert.equal(lowercaseParis.response.status, 200);
  const parisHotels = hotelsFrom(paris.body);
  assert.deepEqual(parisHotels, baselineParisHotels, "Paris results should match the deterministic baseline");
  assert.deepEqual(
    hotelsFrom(lowercaseParis.body),
    baselineParisHotels,
    "the approved parameterized query should remain case-insensitive"
  );
  assert.ok(parisHotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
  const unknown = await request(APP_URL, "/api/hotels?city=NoSuchCity", { signal: AbortSignal.timeout(1_000) });
  assert.equal(unknown.response.status, 200);
  assert.deepEqual(hotelsFrom(unknown.body), []);
  const empty = await request(APP_URL, "/api/hotels?city=", { signal: AbortSignal.timeout(1_000) });
  assert.equal(empty.response.status, 200);
  assert.deepEqual(hotelsFrom(empty.body), []);

  console.log("[13/16] running the participant-selected regression matrix on a pushed main...");
  const delivery = await runNode({ cwd: sandbox, env: commandEnv({ ...sharedAppCliEnv, ...GIT_IDENTITY }),
    args: ["-e", `const {execFileSync}=require('node:child_process');
      for (const args of [['add','app/src/search-query.js'],['commit','-m','approved parameter binding'],['push','origin','main']])
        execFileSync('git',args,{stdio:'pipe'});`] });
  assertExitOk(delivery, "Blue delivery after Green");
  await mkdir(path.join(sandbox, "app/test"), { recursive: true });
  await cp(path.join(appDir, "test/search-query.test.js"), path.join(sandbox, "app/test/search-query.test.js"));
  const correctedQueryTests = await runNode({ cwd: sandbox, env: commandEnv(sharedAppCliEnv),
    args: ["--test", "app/test/search-query.test.js"] });
  assertExitOk(correctedQueryTests, "query tests on the corrected checkout");
  const regressions = await runNode({
    cwd: sandbox,
    env: commandEnv(sharedAppCliEnv),
    args: [path.join(appDir, "scripts", "regressions.js")],
  });
  assertExitOk(regressions, "regressions");
  assert.match(regressions.stdout, /PASS:/, "regression output should report PASS");
  const deliveredCommit = (await readTeamState()).evidence.blue.commit;
  assert.notEqual(deliveredCommit, baselineCommit);

  console.log("[14/19] completing the blue regression checkpoint...");
  const blueCheckpoint = await runCommand({
    cwd: appDir,
    env: commandEnv(sharedAppCliEnv),
    args: checkpointArguments("blue", teamState.teamId),
  });
  assertExitOk(blueCheckpoint, "Blue checkpoint");
  assert.match(blueCheckpoint.stdout, /PASS: blue checkpoint confirmed/);

  console.log("[15/16] CI reports clean while the participant is still Green...");
  const ciClean = await request(BOARD_URL, "/api/events", {
    method: "POST",
    signal: AbortSignal.timeout(1_000),
    headers: {
      "content-type": "application/json",
      "x-board-reporter-token": BOARD_TOKEN,
    },
    body: JSON.stringify({
      sessionId: BOARD_SESSION_ID,
      teamId: teamState.teamId,
      phase: "ci-clean",
      source: "ci",
      repository: BOARD_CI_REPOSITORY,
      commitSha: deliveredCommit,
    }),
  });
  assert.equal(ciClean.response.status, 200);
  assert.equal((await fetchState())[0].ciStatus, "clean");
  assert.equal((await fetchState())[0].phase, "green");
  const prematureBlue = await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "blue", publish: true });
  assert.equal(prematureBlue.code, 1);
  assert.match(prematureBlue.stderr, /Missing participant CodeQL review/);
  assertExitOk(await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "blue" }), "final CodeQL lookup");
  assertExitOk(await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "blue",
    confirm: true, commit: deliveredCommit }), "participant final reading");
  console.log("[14/16] participant publishes Blue after reading the clean report...");
  const blue = await runCodeql({ cwd: sandbox, env: commandEnv(sharedAppCliEnv), phase: "blue", publish: true });
  assertExitOk(blue, "blue phase publish");
  const completed = await waitForPhase(teamState.teamId, "blue");
  assert.equal(completed.ciStatus, "clean");
  assert.equal(completed.ciCommitSha, deliveredCommit);
  assert.equal((await fetchState()).length, 1, "Blue must not create another participant");

  console.log("[16/16] proving the board rejects backward phase transitions...");
  const backward = await request(BOARD_URL, "/api/events", {
    method: "POST",
    signal: AbortSignal.timeout(1_000),
    headers: {
      "content-type": "application/json",
      "x-board-reporter-token": BOARD_TOKEN,
    },
    body: JSON.stringify({
      sessionId: BOARD_SESSION_ID,
      teamId: teamState.teamId,
      alias: teamState.alias,
      phase: "green",
      source: "participant",
    }),
  });
  assert.equal(backward.response.status, 409, "board should reject a backward phase transition");

  console.log("[cleanup] resetting the dataset and confirming the fresh safe baseline...");
  const reset = await runCommand({
    cwd: appDir,
    env: commandEnv({ APP_URL, PORT: String(APP_PORT) }),
    args: ["run", "reset"],
  });
  assertExitOk(reset, "reset");
  const afterResetParis = await request(APP_URL, "/api/hotels?city=Paris", { signal: AbortSignal.timeout(1_000) });
  assert.equal(afterResetParis.response.status, 200);
  assert.deepEqual(hotelsFrom(afterResetParis.body), baselineParisHotels, "reset should restore the original Paris baseline");
  const safeProbe = await request(APP_URL, `/api/hotels?city=${encodeURIComponent("' OR 1=1 -- ")}`, {
    signal: AbortSignal.timeout(1_000),
  });
  assert.equal(safeProbe.response.status, 200);
  assert.deepEqual(hotelsFrom(safeProbe.body), [], "safe mode should return no rows for the tautology after reset");

  await stopProcess(app);
  await stopProcess(board);
});
