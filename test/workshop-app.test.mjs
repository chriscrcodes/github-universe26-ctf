import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "scripts/start-workshop-app.mjs");

function run(env, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, env, encoding: "utf8", timeout: 30000 });
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

test("workshop app restart reloads the server without touching workshop state", async (t) => {
  const runtimeDir = mkdtempSync(path.join(tmpdir(), "workshop-app-"));
  const port = String(40000 + Math.floor(Math.random() * 10000));
  const env = { ...process.env, PORT: port, APP_URL: `http://127.0.0.1:${port}`, WORKSHOP_APP_RUNTIME_DIR: runtimeDir };
  const pidFile = path.join(runtimeDir, ".workshop-app.pid");
  let pid;
  t.after(() => {
    if (pid) {
      try { process.kill(-pid, "SIGKILL"); } catch { /* already stopped */ }
    }
    rmSync(runtimeDir, { recursive: true, force: true });
  });

  const started = run(env);
  assert.equal(started.status, 0, started.stderr);
  const firstPid = Number(readFileSync(pidFile, "utf8"));
  pid = firstPid;

  const again = run(env);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /already running[\s\S]*npm run workshop:app -- --restart/);

  const restarted = run(env, "--restart");
  assert.equal(restarted.status, 0, restarted.stderr);
  assert.match(restarted.stdout, /Workshop progress is preserved/);
  assert.match(restarted.stdout, /restarted \(PID \d+\) and healthy/);
  pid = Number(readFileSync(pidFile, "utf8"));
  assert.notEqual(pid, firstPid);
  assert.equal(isAlive(firstPid), false);

  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
});

test("workshop app launcher rejects unknown options", () => {
  const result = run(process.env, "--reset");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option: --reset/);
});
