import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const pidPath = resolve(root, ".workshop-app.pid");
const logPath = resolve(root, ".workshop-app.log");
const scriptPath = resolve(root, "app", "src", "server.js");
const restart = process.argv.slice(2).includes("--restart");
if (process.argv.slice(2).some((argument) => argument !== "--restart")) {
  console.error("Usage: node scripts/start-workshop-app.mjs [--restart]");
  process.exit(1);
}

if (existsSync(pidPath)) {
  const pid = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
      unlinkSync(pidPath);
    }
    if (existsSync(pidPath)) {
      if (!restart) {
        console.log(`Workshop application is already running (PID ${pid}).`);
        process.exit(0);
      }
      const command = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
      if (!command.endsWith(` ${scriptPath}`)) {
        console.error("Refusing to stop an unrecognized process. Stop your previous app manually, then remove its stale PID file.");
        process.exit(1);
      }
      process.kill(pid, "SIGTERM");
      let exited = false;
      for (let attempt = 0; attempt < 60; attempt += 1) {
        try { process.kill(pid, 0); } catch (error) {
          if (error.code !== "ESRCH") throw error;
          exited = true;
          break;
        }
        await delay(50);
      }
      if (!exited) throw new Error("Workshop app did not stop; no new process was started.");
      unlinkSync(pidPath);
    }
  } else {
    unlinkSync(pidPath);
  }
}

const log = openSync(logPath, "a");
const child = spawn(process.execPath, [scriptPath], {
  cwd: root,
  detached: true,
  stdio: ["ignore", log, log],
  env: process.env,
});

writeFileSync(pidPath, `${child.pid}\n`);
child.unref();
closeSync(log);

console.log(`Workshop application started in the background (PID ${child.pid}).`);
console.log(`Application log: ${logPath}`);
console.log("The terminal is available for Squad and the remaining workshop steps.");
