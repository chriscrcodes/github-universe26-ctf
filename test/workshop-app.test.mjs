import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

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