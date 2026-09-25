import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pidPath = resolve(root, ".workshop-app.pid");
const logPath = resolve(root, ".workshop-app.log");

if (existsSync(pidPath)) {
  const pid = Number.parseInt(readFileSync(pidPath, "utf8").trim(), 10);
  if (Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      console.log(`Workshop application is already running (PID ${pid}).`);
      process.exit(0);
    } catch {
      unlinkSync(pidPath);
    }
  } else {
    unlinkSync(pidPath);
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

console.log(`Workshop application started in the background (PID ${child.pid}).`);
console.log(`Application log: ${logPath}`);
console.log("The terminal is available for Squad and the remaining workshop steps.");
