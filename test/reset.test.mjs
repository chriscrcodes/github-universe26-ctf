import test, { before } from "node:test";
import assert from "node:assert/strict";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { APP_URL, available, hotelsFrom, request } from "./http.mjs";

const runShell = promisify(exec);
let running = false;
let resetAvailable = false;
before(async () => {
  running = await available(APP_URL);
  resetAvailable = Boolean(process.env.RESET_COMMAND || process.env.npm_package_scripts_reset);
});

test("reset restores a deterministic initial dataset", async (t) => {
  if (!running) return t.skip(`application unavailable at ${APP_URL}`);
  if (!resetAvailable) return t.skip("reset command is not declared; set RESET_COMMAND or npm_package_scripts_reset");
  const command = process.env.RESET_COMMAND || "npm run reset";
  const first = await request(APP_URL, "/api/hotels?city=Paris");
  await runShell(command, { env: process.env });
  const afterFirstReset = await request(APP_URL, "/api/hotels?city=Paris");
  await runShell(command, { env: process.env });
  const afterSecondReset = await request(APP_URL, "/api/hotels?city=Paris");
  assert.deepEqual(hotelsFrom(afterFirstReset.body), hotelsFrom(afterSecondReset.body));
  assert.notDeepEqual(hotelsFrom(first.body), [], "fixture should be populated before reset comparison");
});
