import test, { before } from "node:test";
import assert from "node:assert/strict";
import { BOARD_TOKEN, BOARD_URL, available, request, assertJsonError } from "./http.mjs";

const eventHeaders = {
  "content-type": "application/json",
  ...(BOARD_TOKEN ? { "x-board-reporter-token": BOARD_TOKEN } : {}),
};

let running = false;
before(async () => {
  running = process.env.RUN_BOARD_INTEGRATION === "1" && await available(BOARD_URL);
});
const serviceTest = (name, options, fn) => {
  if (typeof options === "function") { fn = options; options = {}; }
  const skip = options.skip;
  const testOptions = { ...options };
  delete testOptions.skip;
  return test(name, testOptions, async (t) => {
    if (!running) return t.skip(`board unavailable at ${BOARD_URL}`);
    const reason = skip?.();
    if (reason) return t.skip(reason);
    return fn(t);
  });
};
const event = (teamId, phase, extra = {}) => ({
  sessionId: process.env.BOARD_SESSION_ID || "universe-2026",
  teamId, alias: "Purple Test", phase, source: "participant", ...extra,
});

serviceTest("accepts registration and adds a server timestamp", async () => {
  const result = await request(BOARD_URL, "/api/events", {
    method: "POST", headers: eventHeaders,
    body: JSON.stringify(event(`allow-${Date.now()}`, "started")),
  });
  assert.equal(result.response.status, 201);
  assert.ok(result.body.team?.updatedAt, "timestamp must be server-generated");
});

serviceTest("enforces ordered participant-only phase transitions", async () => {
  const headers = eventHeaders;
  const stamp = Date.now();
  for (const [index, phase, source] of [
    [0, "started", "participant"],
    [1, "red", "participant"],
    [2, "purple", "participant"],
    [3, "green", "participant"],
    [4, "blue", "participant"],
  ]) {
    const accepted = await request(BOARD_URL, "/api/events", {
      method: "POST",
      headers,
      body: JSON.stringify(event(`accepted-${stamp}`, phase, { source })),
    });
    assert.equal(accepted.response.status, index === 0 ? 201 : 200, `${phase}/${source} should be accepted`);
  }

  for (const [phase, source] of [
    ["started", "actions"],
    ["red", "actions"],
    ["blue", "actions"],
    ["purple", "actions"],
    ["green", "actions"],
  ]) {
    const rejected = await request(BOARD_URL, "/api/events", {
      method: "POST",
      headers,
      body: JSON.stringify(event(`rejected-${stamp}-${phase}`, phase, { source })),
    });
    assert.equal(rejected.response.status, 400, `${phase}/${source} should be rejected`);
    assert.equal(rejected.body?.error, "invalid source");
  }
});

serviceTest("rejects unknown fields and prohibited privacy data", async () => {
  const headers = eventHeaders;
  const unknown = await request(BOARD_URL, "/api/events", {
    method: "POST", headers,
    body: JSON.stringify(event(`unknown-${Date.now()}`, "started", { extra: "reject-me" })),
  });
  assertJsonError(unknown);
  const privateData = await request(BOARD_URL, "/api/events", {
    method: "POST", headers,
    body: JSON.stringify(event(`privacy-${Date.now()}`, "started", { login: "alice", repository: "secret" })),
  });
  assertJsonError(privateData);
});

serviceTest("rejects backward phase transitions", async () => {
  const team = `mono-${Date.now()}`;
  const headers = eventHeaders;
  const initial = await request(BOARD_URL, "/api/events", { method: "POST", headers, body: JSON.stringify(event(team, "started")) });
  assert.equal(initial.response.status, 201);
  const forward = await request(BOARD_URL, "/api/events", { method: "POST", headers, body: JSON.stringify(event(team, "red")) });
  assert.equal(forward.response.status, 200);
  const backward = await request(BOARD_URL, "/api/events", { method: "POST", headers, body: JSON.stringify(event(team, "started")) });
  assert.equal(backward.response.status, 409);
});

serviceTest("rate limits an abusive burst", async () => {
  const headers = eventHeaders;
  const results = await Promise.all(Array.from({ length: 120 }, (_, i) =>
    request(BOARD_URL, "/api/events", { method: "POST", headers, body: JSON.stringify(event(`burst-${Date.now()}-${i}`, "started")) })
  ));
  assert.ok(results.some(({ response }) => response.status === 429), "burst should produce HTTP 429");
});

serviceTest("state endpoint exposes team state without submitted private fields", async () => {
  const result = await request(BOARD_URL, "/api/state");
  assert.equal(result.response.status, 200);
  const serialized = JSON.stringify(result.body);
  for (const forbidden of ["login", "repository", "sourceCode", "prompt", "terminalOutput", "sarif"]) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, `state leaked ${forbidden}`);
  }
});

serviceTest("reset endpoint rejects unauthenticated callers", async () => {
  const result = await request(BOARD_URL, "/api/reset", { method: "POST" });
  assert.equal(result.response.status, 401);
});

serviceTest("operator reset works with the configured operator key", {
  skip: () => !process.env.BOARD_OPERATOR_KEY ? "BOARD_OPERATOR_KEY is not configured" : false,
}, async () => {
  const result = await request(BOARD_URL, "/api/reset", {
    method: "POST",
    headers: { "x-operator-key": process.env.BOARD_OPERATOR_KEY },
  });
  assert.equal(result.response.status, 204);
});
