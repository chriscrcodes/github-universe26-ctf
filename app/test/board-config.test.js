const test = require("node:test");
const assert = require("node:assert/strict");
const { isLocalHostname, resolveBoardConfig } = require("../src/board-config");

test("board configuration requires the facilitator URL and token", () => {
  assert.throws(
    () => resolveBoardConfig({ BOARD_TOKEN: "shared-token" }),
    /BOARD_URL is required/
  );
  assert.throws(
    () => resolveBoardConfig({ BOARD_URL: "https://board.example.com" }),
    /BOARD_TOKEN is required/
  );
});

test("participant board configuration rejects localhost", () => {
  for (const hostname of ["localhost", "127.0.0.1", "::1", "0.0.0.0"]) {
    assert.equal(isLocalHostname(hostname), true);
  }
  assert.throws(
    () => resolveBoardConfig({
      BOARD_URL: "http://127.0.0.1:8080",
      BOARD_TOKEN: "shared-token",
    }),
    /shared facilitator board, not localhost/
  );
});

test("local boards require an explicit test or rehearsal override", () => {
  assert.deepEqual(
    resolveBoardConfig({
      BOARD_URL: "http://127.0.0.1:8080/",
      BOARD_TOKEN: "shared-token",
      ALLOW_LOCAL_BOARD: "1",
    }),
    {
      boardUrl: "http://127.0.0.1:8080",
      boardToken: "shared-token",
    }
  );
});

test("shared HTTPS board configuration is accepted", () => {
  assert.deepEqual(
    resolveBoardConfig({
      BOARD_URL: "https://board.example.com/",
      BOARD_TOKEN: "shared-token",
    }),
    {
      boardUrl: "https://board.example.com",
      boardToken: "shared-token",
    }
  );
});
