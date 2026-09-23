const test = require("node:test");
const assert = require("node:assert/strict");
const { isLocalHostname, resolveBoardConfig } = require("../src/board-config");

test("a missing board configuration downgrades to offline play", () => {
  const missingBoth = resolveBoardConfig({});
  assert.equal(missingBoth.mode, "offline");
  assert.match(missingBoth.reason, /BOARD_URL and BOARD_TOKEN/);
  assert.match(resolveBoardConfig({ BOARD_TOKEN: "shared-token" }).reason, /BOARD_URL/);
  assert.match(
    resolveBoardConfig({ BOARD_URL: "https://board.example.com" }).reason,
    /BOARD_TOKEN/
  );
});

test("an unusable board URL downgrades to offline play", () => {
  assert.equal(
    resolveBoardConfig({ BOARD_URL: "not-a-url", BOARD_TOKEN: "shared-token" }).mode,
    "offline"
  );
  assert.equal(
    resolveBoardConfig({ BOARD_URL: "ftp://board.example.com", BOARD_TOKEN: "shared-token" }).mode,
    "offline"
  );
});

test("participant board configuration treats localhost as offline", () => {
  for (const hostname of ["localhost", "127.0.0.1", "::1", "0.0.0.0"]) {
    assert.equal(isLocalHostname(hostname), true);
  }
  const config = resolveBoardConfig({
    BOARD_URL: "http://127.0.0.1:8080",
    BOARD_TOKEN: "shared-token",
  });
  assert.equal(config.mode, "offline");
  assert.match(config.reason, /localhost/);
});

test("local boards require an explicit test or rehearsal override", () => {
  assert.deepEqual(
    resolveBoardConfig({
      BOARD_URL: "http://127.0.0.1:8080/",
      BOARD_TOKEN: "shared-token",
      ALLOW_LOCAL_BOARD: "1",
    }),
    {
      mode: "board",
      boardUrl: "http://127.0.0.1:8080",
      boardToken: "shared-token",
      reason: null,
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
      mode: "board",
      boardUrl: "https://board.example.com",
      boardToken: "shared-token",
      reason: null,
    }
  );
});
