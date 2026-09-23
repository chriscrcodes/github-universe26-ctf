import test from "node:test";
import assert from "node:assert/strict";
import { createEventRateLimiter, validEvent } from "../src/index.js";

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
