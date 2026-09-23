const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveParticipantIdentity,
  resolveSessionId,
  resolveTeamId,
  todaySessionId,
} = require("../src/participant-identity");

const noHandle = () => "";

test("the team id follows the participant GitHub handle", () => {
  assert.equal(resolveTeamId({ BOARD_USER: "Octo-Cat" }, { lookupHandle: noHandle }), "octo-cat");
  assert.equal(
    resolveTeamId({ GITHUB_USER: "codespace-user" }, { lookupHandle: noHandle }),
    "codespace-user"
  );
  assert.equal(
    resolveTeamId({}, { lookupHandle: () => "gh-cli-user" }),
    "gh-cli-user"
  );
});

test("an unusable handle is reported with an actionable message", () => {
  assert.throws(
    () => resolveTeamId({}, { lookupHandle: noHandle }),
    /BOARD_USER is required/
  );
  assert.throws(
    () => resolveTeamId({ BOARD_USER: "ab" }, { lookupHandle: noHandle }),
    /3 to 80 characters/
  );
  assert.throws(
    () => resolveTeamId({ BOARD_USER: "not a handle" }, { lookupHandle: noHandle }),
    /3 to 80 characters/
  );
});

test("the session id is the event day so every participant shares one board", () => {
  const eventDay = new Date(Date.UTC(2026, 8, 22, 7, 30));
  assert.equal(todaySessionId(eventDay), "20260922");
  assert.equal(resolveSessionId({}, eventDay), "20260922");
  assert.equal(resolveSessionId({ BOARD_SESSION_ID: " 20260921 " }, eventDay), "20260921");
  assert.throws(() => resolveSessionId({ BOARD_SESSION_ID: "nope!" }, eventDay), /BOARD_SESSION_ID/);
});

test("the participant identity combines handle and event day", () => {
  assert.deepEqual(
    resolveParticipantIdentity(
      { BOARD_USER: "Octo-Cat" },
      { lookupHandle: noHandle, now: new Date(Date.UTC(2026, 8, 22)) }
    ),
    { teamId: "octo-cat", sessionId: "20260922" }
  );
});
