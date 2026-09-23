import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createBoard } = require("../board/server/src/server.js");

test("facilitator sequence keeps one participant through every evidence gate", async () => {
  const board = createBoard({ sessionId: "facilitator-test", operatorKey: "secret", port: 0 });
  const server = await board.start(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const headers = { "content-type": "application/json" };
  const team = {
    sessionId: "facilitator-test",
    teamId: "participant-one",
    alias: "Purple Team",
    source: "participant",
  };

  try {
    for (const [phase, expectedStatus] of [
      ["started", 201],
      ["red", 200],
      ["purple", 200],
      ["green", 200],
      ["blue", 200],
    ]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...team, phase }),
      });
      assert.equal(response.status, expectedStatus, phase);
      const state = await (await fetch(`${baseUrl}/api/state`)).json();
      assert.equal(state.teams.length, 1, `${phase} must keep one participant`);
      assert.equal(state.teams[0].teamId, team.teamId);
      assert.equal(state.teams[0].phase, phase);
    }
  } finally {
    await board.stop();
  }
});
