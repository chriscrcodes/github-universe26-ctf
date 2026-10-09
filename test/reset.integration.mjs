import test, { before } from "node:test";
import assert from "node:assert/strict";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { APP_URL, available, hotelsFrom, request } from "./http.mjs";

const runShell = promisify(exec);
let running = false;
let resetAvailable = false;
before(async () => {
  resetAvailable = Boolean(process.env.RESET_COMMAND);
  if (resetAvailable) {
    running = await available(APP_URL);
    assert.ok(running, `Start an isolated application at ${APP_URL} before testing reset`);
  }
});

test("reset restores a deterministic initial dataset", async (t) => {
  if (!resetAvailable) return t.skip("set RESET_COMMAND only for an isolated rehearsal application");
  const command = process.env.RESET_COMMAND;
  const first = await request(APP_URL, "/api/hotels?city=Paris");
  assert.equal(first.response.status, 200, "reset integration requires implemented city search");
  await runShell(command, { env: process.env });
  const afterFirstReset = await request(APP_URL, "/api/hotels?city=Paris");
  await runShell(command, { env: process.env });
  const afterSecondReset = await request(APP_URL, "/api/hotels?city=Paris");
  assert.equal(afterFirstReset.response.status, 200);
  assert.equal(afterSecondReset.response.status, 200);
  assert.deepEqual(hotelsFrom(afterFirstReset.body), hotelsFrom(afterSecondReset.body));
  assert.notDeepEqual(hotelsFrom(first.body), [], "fixture should be populated before reset comparison");
});
