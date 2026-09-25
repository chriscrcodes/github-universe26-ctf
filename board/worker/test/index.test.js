import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import app, { createEventRateLimiter, resolveSessionId, validEvent } from "../src/index.js";

const Database = createRequire(new URL("../../../app/package.json", import.meta.url))("better-sqlite3");

test("worker defaults its session ID to the current UTC day and accepts a shared override", () => {
  const now = new Date("2026-09-23T23:30:00-07:00");
  assert.equal(resolveSessionId({}, now), "20260924");
  assert.equal(resolveSessionId({ BOARD_SESSION_ID: "rehearsal-2026" }, now), "rehearsal-2026");
});

test("worker deployment config does not pin the session ID", async () => {
  const config = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.doesNotMatch(config, /"BOARD_SESSION_ID"\s*:/);
});

test("worker deployment config uses the requested Cloudflare name", async () => {
  const config = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  assert.equal(config.name, "ghu26-tru1378s-board");
  assert.equal(config.d1_databases[0].database_name, config.name);
  assert.match(config.d1_databases[0].database_id, /^[0-9a-f-]{36}$/);
});

test("worker rate limiter permits seventy-four registrations behind one NAT", () => {
  const limiter = createEventRateLimiter();
  for (let index = 0; index < 74; index += 1) {
    assert.equal(limiter.take({
      ip: "192.0.2.60",
      source: "participant",
      teamId: `capacity-${index}`,
      token: "shared-token",
    }), true, `registration ${index + 1}`);
  }
});

test("worker rate limiter throttles one abusive participant identity", () => {
  const limiter = createEventRateLimiter({ identityLimit: 3 });
  const identity = {
    ip: "192.0.2.60",
    source: "participant",
    teamId: "burst-team",
    token: "burst-token",
  };

  assert.equal(limiter.take(identity), true);
  assert.equal(limiter.take(identity), true);
  assert.equal(limiter.take(identity), true);
  assert.equal(limiter.take(identity), false);
  assert.equal(limiter.take({ ...identity, teamId: "neighbor-team" }), true);
});

test("worker event validation enforces the phase source contract", () => {
  const combinations = [
    ["started", "participant", null],
    ["red", "participant", null],
    ["blue", "participant", null],
    ["purple", "participant", null],
    ["green", "participant", null],
    ["started", "actions", "invalid source"],
    ["red", "actions", "invalid source"],
    ["blue", "actions", "invalid source"],
    ["purple", "actions", "invalid source"],
    ["green", "actions", "invalid source"],
  ];

  for (const [phase, source, expected] of combinations) {
    const payload = {
      sessionId: "universe-2026",
      teamId: `team-${phase}-${source}`,
      alias: "Purple Test",
      phase,
      source,
    };
    assert.equal(validEvent(payload, "universe-2026"), expected, `${phase}/${source}`);
  }
});

test("worker accepts the Red, Purple, Green, Blue phase vocabulary", () => {
  for (const phase of ["started", "red", "purple", "green", "blue"]) {
    assert.equal(validEvent({
      sessionId: "universe-2026",
      teamId: `team-${phase}`,
      alias: "Purple Test",
      phase,
      source: "participant",
    }, "universe-2026"), null, phase);
  }
});

test("worker accepts CI completion payloads for a real repository and commit", () => {
  const payload = {
    sessionId: "universe-2026",
    teamId: "participant-one",
    phase: "ci-clean",
    source: "ci",
    repository: "example/participant-one",
    commitSha: "a".repeat(40),
  };
  assert.equal(validEvent(payload, "universe-2026"), null);
  assert.equal(
    validEvent({ ...payload, repository: "not a repository" }, "universe-2026"),
    "invalid repository"
  );
  assert.equal(
    validEvent({ ...payload, commitSha: "not-a-sha" }, "universe-2026"),
    "invalid commitSha"
  );
  assert.equal(
    validEvent({ ...payload, phase: "blue" }, "universe-2026"),
    "invalid CI phase"
  );
  assert.equal(
    validEvent({ ...payload, extra: true }, "universe-2026"),
    "CI payload must contain exactly sessionId, teamId, phase, source, repository, commitSha"
  );
});

test("worker stores CI before Blue, binds completion to delivery, and rejects stale receipts", async () => {
  const database = new Database(":memory:");
  for (const migration of ["0001_init.sql", "0002_timing.sql", "0003_ci_completion.sql"]) {
    database.exec(await readFile(new URL(`../migrations/${migration}`, import.meta.url), "utf8"));
  }
  const env = { BOARD_TOKEN: "worker-order-token", BOARD_SESSION_ID: "universe-2026", BOARD_DB: {
    prepare(sql) {
      const statement = database.prepare(sql);
      return { first: async () => statement.get(), bind(...parameters) {
        return {
          first: async () => statement.get(...parameters),
          run: async () => ({ meta: statement.run(...parameters) }),
        };
      } };
    },
  } };
  const send = (body) => app.request("/api/events", { method: "POST",
    headers: { "content-type": "application/json", "x-board-reporter-token": env.BOARD_TOKEN },
    body: JSON.stringify(body) }, env);
  const participant = (phase) => ({ sessionId: env.BOARD_SESSION_ID, teamId: "worker-order-team",
    alias: "Worker Team", phase, source: "participant" });
  const ci = { sessionId: env.BOARD_SESSION_ID, teamId: "worker-order-team", phase: "ci-clean",
    source: "ci", repository: "participant/workshop", commitSha: "a".repeat(40) };
  try {
    assert.equal((await send(ci)).status, 409);
    for (const phase of ["started", "red", "purple", "green"]) {
      assert.equal((await send(participant(phase))).status, phase === "started" ? 201 : 200);
    }
    const early = await send(ci);
    assert.equal(early.status, 200);
    assert.equal((await early.json()).team.phase, "green");
    const delivered = { ...participant("blue"), repository: ci.repository, commitSha: "b".repeat(40) };
    const blue = await send(delivered);
    assert.equal(blue.status, 200);
    assert.equal((await blue.json()).team.ciStatus, "pending");
    assert.equal((await send(ci)).status, 409);
    const matching = { ...ci, commitSha: delivered.commitSha };
    const clean = await send(matching);
    assert.equal(clean.status, 200);
    const receipt = (await clean.json()).team;
    assert.equal(receipt.ciStatus, "clean");
    const duplicate = await send(matching);
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).team.ciCompletedAt, receipt.ciCompletedAt);
  } finally {
    database.close();
  }
});
