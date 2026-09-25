import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const runtimeDir = resolve(process.env.WORKSHOP_APP_RUNTIME_DIR || root);
const pidPath = resolve(runtimeDir, ".workshop-app.pid");
const logPath = resolve(runtimeDir, ".workshop-app.log");
const appUrl = (process.env.APP_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, "");
const args = process.argv.slice(2);
const restart = args.includes("--restart");

for (const argument of args) {
  if (argument !== "--restart") {
    console.error(`Unknown option: ${argument}. Usage: npm run workshop:app [-- --restart]`);
    process.exit(2);
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function recordedPid() {
  if (!existsSync(pidPath)) return null;
  const pid = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
  if (Number.isInteger(pid) && pid > 0 && isAlive(pid)) return pid;
  unlinkSync(pidPath);
  return null;
}

async function healthy() {
  try {
    const response = await fetch(`${appUrl}/health`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(250);
  }
  return false;
}

// Stops only the recorded application process group; workshop progress, the
// scoreboard and the hotel database are left untouched.
async function stopRecordedApp(pid) {
  const signal = (target, name) => {
    try {
      process.kill(target, name);
    } catch {
      // The process may already be gone.
    }
  };
  signal(-pid, "SIGTERM");
  signal(pid, "SIGTERM");
  if (!(await waitFor(async () => !isAlive(pid) && !(await healthy()), 5000))) {
    signal(-pid, "SIGKILL");
    signal(pid, "SIGKILL");
    await waitFor(async () => !isAlive(pid) && !(await healthy()), 3000);
  }
  if (existsSync(pidPath)) unlinkSync(pidPath);
}

const existing = recordedPid();
if (existing && !restart) {
  console.log(`Workshop application is already running (PID ${existing}).`);
  console.log("To load code changes without resetting progress, run: npm run workshop:app -- --restart");
  process.exit(0);
}

if (restart) {
  if (existing) {
    await stopRecordedApp(existing);
    console.log(`Stopped workshop application (PID ${existing}). Workshop progress is preserved.`);
  } else if (await healthy()) {
    console.error(
      `BLOCKED: an application answers at ${appUrl} but no workshop PID is recorded. Stop it manually, then rerun npm run workshop:app.`
    );
    process.exit(1);
  }
}

const log = openSync(logPath, "a");
const child = spawn("npm", ["--workspace", "app", "start"], {
  cwd: root,
  detached: true,
  stdio: ["ignore", log, log],
  env: process.env,
});

writeFileSync(pidPath, `${child.pid}\n`);
child.unref();
closeSync(log);

if (restart) {
  if (!(await waitFor(healthy, 15000))) {
    console.error(`BLOCKED: restarted application did not answer ${appUrl}/health. Read ${logPath}.`);
    process.exit(1);
  }
  console.log(`Workshop application restarted (PID ${child.pid}) and healthy at ${appUrl}.`);
} else {
  console.log(`Workshop application started in the background (PID ${child.pid}).`);
}
console.log(`Application log: ${logPath}`);
console.log("The terminal is available for Squad and the remaining workshop steps.");
