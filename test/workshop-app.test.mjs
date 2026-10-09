import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolveWorkshopBoardUser, startWorkshop } from "../scripts/workshop-start.mjs";

test("workshop launch adopts the recruited team, registers and starts the app in order", () => {
  const calls = [];
  const env = { BOARD_USER: "us12", BOARD_URL: "https://board.example", BOARD_TOKEN: "private-value" };
  assert.equal(startWorkshop(env, (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: "test-version\n" };
  }), 0);
  assert.equal(calls.length, 8);
  assert.match(calls[5].args[0], /install-workshop-squad\.mjs$/);
  assert.equal(calls[5].args[1], "--adopt-recruited");
  assert.deepEqual(calls[6].args, ["run", "register"]);
  assert.match(calls[7].args[0], /start-workshop-app\.mjs$/);
  assert.equal(calls.some((call) => call.command === "squad" && call.args[0] === "doctor"), false);
  assert.ok(calls.slice(5).every((call) => call.options.env.BOARD_USER === "u12"));
  assert.equal(env.BOARD_USER, "us12");
});

test("workshop launch stops at each failure without running subsequent actions", () => {
  for (let failedStep = 0; failedStep < 8; failedStep += 1) {
    let callCount = 0;
    assert.notEqual(startWorkshop({}, () => {
      const failed = callCount++ === failedStep;
      return { status: failed ? 1 : 0, stdout: "test-version\n" };
    }), 0);
    assert.equal(callCount, failedStep + 1);
  }
});

test("workshop identity preserves configured handles and the existing Codespace mapping", () => {
  for (const [env, expected] of [
    [{ BOARD_USER: " octocat " }, "octocat"],
    [{ BOARD_USER: "us12" }, "u12"],
    [{ GITHUB_REPOSITORY: "event/us7m42-workshop" }, "u42"],
    [{ BOARD_USER: "event/us7m42" }, "u42"],
    [{ BOARD_USER: "custom", GITHUB_REPOSITORY: "event/us7m42" }, "custom"],
    [{}, ""],
  ]) assert.equal(resolveWorkshopBoardUser(env), expected);
});

test("app-only restart preserves participant state and refuses an unrelated process", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "workshop-app-"));
  const script = path.join(directory, "scripts", "start-workshop-app.mjs");
  const pidPath = path.join(directory, ".workshop-app.pid");
  const statePath = path.join(directory, "app", ".team-state.json");
  const ownedPids = [];
  try {
    await mkdir(path.dirname(script), { recursive: true });
    await mkdir(path.join(directory, "app", "src"), { recursive: true });
    await cp(new URL("../scripts/start-workshop-app.mjs", import.meta.url), script);
    await writeFile(path.join(directory, "app", "src", "server.js"), "setInterval(() => {}, 1000);\n");
    await writeFile(statePath, '{"participant":"preserved"}\n');
    const run = (args = []) => execFileSync(process.execPath, [script, ...args], { encoding: "utf8" });
    assert.match(run(), /started in the background/);
    const initialPid = Number((await readFile(pidPath, "utf8")).trim());
    ownedPids.push(initialPid);
    assert.match(run(), /already running/);
    assert.match(run(["--restart"]), /started in the background/);
    const restartedPid = Number((await readFile(pidPath, "utf8")).trim());
    ownedPids.push(restartedPid);
    assert.notEqual(restartedPid, initialPid);
    assert.equal(await readFile(statePath, "utf8"), '{"participant":"preserved"}\n');
    await writeFile(pidPath, `${process.pid}\n`);
    assert.throws(() => run(["--restart"]), /Refusing to stop an unrecognized process/);
    assert.equal(await readFile(pidPath, "utf8"), `${process.pid}\n`);
    assert.equal(await readFile(statePath, "utf8"), '{"participant":"preserved"}\n');
  } finally {
    for (const pid of ownedPids) {
      try { process.kill(pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
    await rm(directory, { recursive: true, force: true });
  }
});