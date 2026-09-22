import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createEventRateLimiter,
  deriveCiToken,
  parseCiBindings,
  validCiToken,
  validEvent,
} from "../src/index.js";

test("worker rate limiter permits sixty registrations behind one NAT", () => {
  const limiter = createEventRateLimiter();
  for (let index = 0; index < 60; index += 1) {
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

test("worker accepts only repository/team-bound CI completion payloads", () => {
  const payload = {
    sessionId: "universe-2026",
    teamId: "participant-one",
    phase: "ci-clean",
    source: "ci",
    repository: "example/participant-one",
    commitSha: "a".repeat(40),
  };
  const bindings = parseCiBindings({ "example/participant-one": "participant-one" });
  assert.equal(
    validEvent(payload, "universe-2026", bindings),
    null
  );
  assert.equal(
    validEvent(payload, "universe-2026", new Map()),
    "repository/team binding mismatch"
  );
  assert.equal(
    validEvent({ ...payload, teamId: "participant-two" }, "universe-2026", bindings),
    "repository/team binding mismatch"
  );
  assert.equal(
    validEvent({ ...payload, commitSha: "not-a-sha" }, "universe-2026", bindings),
    "invalid commitSha"
  );
});

test("worker derives a distinct deterministic credential for each repository/team binding", async () => {
  const key = "worker-test-ci-token-key-at-least-32-bytes";
  const expected = createHmac("sha256", key)
    .update("board-ci:v1\nuniverse-2026\nexample/participant-one\nparticipant-one")
    .digest("hex");
  const token = await deriveCiToken(key, "universe-2026", "example/participant-one", "participant-one");
  assert.equal(token, expected);
  assert.notEqual(
    token,
    await deriveCiToken(key, "universe-2026", "example/participant-two", "participant-two"),
  );

  const context = { req: { header: (name) => name === "x-board-ci-token" ? token : undefined } };
  assert.equal(
    await validCiToken(context, key, "universe-2026", "example/participant-one", "participant-one"),
    true,
  );
  assert.equal(
    await validCiToken(context, key, "universe-2026", "example/participant-two", "participant-two"),
    false,
    "one repository's credential must not authenticate another repository/team",
  );
});

test("worker CI binding configuration rejects ambiguous identities", () => {
  assert.throws(() => parseCiBindings("{"), /valid JSON/);
  assert.throws(() => parseCiBindings({ "Example/repo": "team-one" }), /invalid CI repository/);
  assert.throws(
    () => parseCiBindings({ "example/one": "same-team", "example/two": "same-team" }),
    /bound more than once/,
  );
});
