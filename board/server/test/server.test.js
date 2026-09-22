const test = require("node:test");
const assert = require("node:assert/strict");
const { createBoard, deriveCiToken, parseCiBindings, validEvent } = require("../src/server");

const ciTokenKey = "server-test-ci-token-key-at-least-32-bytes";
const ciBindings = { "octo/ctf": "hybrid-team" };

async function withBoard(fn, options = {}) {
  const board = createBoard({ sessionId: "universe-2026", operatorKey: "secret", port: 0, ...options });
  const server = await board.start(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await board.stop();
  }
}

test("board requires the shared reporter token when configured", async () => {
  const board = createBoard({ sessionId: "universe-2026", reporterToken: "shared-token", port: 0 });
  const server = await board.start(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const event = {
    sessionId: "universe-2026",
    teamId: "token-team",
    alias: "Purple Test",
    phase: "started",
    source: "participant",
  };

  try {
    for (const headers of [
      { "content-type": "application/json" },
      { "content-type": "application/json", "x-board-reporter-token": "wrong-token" },
    ]) {
      const rejected = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      });
      assert.equal(rejected.status, 401);
    }

    const accepted = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-board-reporter-token": "shared-token" },
      body: JSON.stringify(event),
    });
    assert.equal(accepted.status, 201);
  } finally {
    await board.stop();
  }
});

test("board accepts an allowlisted event and returns state", async () => {
  await withBoard(async (baseUrl) => {
    const event = {
      sessionId: "universe-2026",
      teamId: "team-1",
      alias: "Purple Test",
      phase: "started",
      source: "participant",
    };

    const create = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    assert.equal(create.status, 201);
    const createdBody = await create.json();
    assert.ok(createdBody.team.updatedAt);

    const state = await fetch(`${baseUrl}/api/state`);
    assert.equal(state.status, 200);
    const stateBody = await state.json();
    assert.equal(stateBody.teams.length, 1);
  });
});

test("event validation enforces the phase source contract", () => {
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

test("CI completion requires its own credential and cannot be declared by a participant", async () => {
  await withBoard(async (baseUrl) => {
    const participantHeaders = {
      "content-type": "application/json",
      "x-board-reporter-token": "participant-token",
    };
    const ciEvent = {
      sessionId: "universe-2026",
      teamId: "hybrid-team",
      phase: "ci-clean",
      source: "ci",
      repository: "octo/ctf",
      commitSha: "a".repeat(40),
    };

    for (const phase of ["started", "red", "purple", "green", "blue"]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: participantHeaders,
        body: JSON.stringify({
          sessionId: "universe-2026",
          teamId: "hybrid-team",
          alias: "Hybrid Team",
          phase,
          source: "participant",
        }),
      });
      assert.equal(response.status, phase === "started" ? 201 : 200);
    }

    const rejected = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: participantHeaders,
      body: JSON.stringify(ciEvent),
    });
    assert.equal(rejected.status, 401);

    const participantClaim = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: participantHeaders,
      body: JSON.stringify({ ...ciEvent, source: "participant" }),
    });
    assert.equal(participantClaim.status, 400);

    const accepted = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-board-ci-token": deriveCiToken(ciTokenKey, "universe-2026", "octo/ctf", "hybrid-team"),
      },
      body: JSON.stringify(ciEvent),
    });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).team.ciStatus, "clean");
  }, {
    reporterToken: "participant-token",
    ciTokenKey,
    ciBindings,
  });
});

test("CI completion validates its repository/team binding and commit SHA", async () => {
  const bindings = parseCiBindings({ "octo/ctf": "validation-team" });
  const base = {
    sessionId: "universe-2026",
    teamId: "validation-team",
    phase: "ci-clean",
    source: "ci",
    repository: "octo/ctf",
    commitSha: "b".repeat(40),
  };
  assert.equal(validEvent(base, "universe-2026", bindings), null);
  assert.equal(
    validEvent({ ...base, repository: "octo/other" }, "universe-2026", bindings),
    "repository/team binding mismatch",
  );
  assert.equal(
    validEvent({ ...base, teamId: "another-team" }, "universe-2026", bindings),
    "repository/team binding mismatch",
  );
  assert.equal(validEvent({ ...base, commitSha: "not-a-sha" }, "universe-2026", bindings), "invalid commitSha");
});

test("CI completion follows the locally verified participant phases", async () => {
  await withBoard(async (baseUrl) => {
    const participant = (phase) => ({
      sessionId: "universe-2026",
      teamId: "ordered-team",
      alias: "Ordered Team",
      phase,
      source: "participant",
    });
    const ciEvent = {
      sessionId: "universe-2026",
      teamId: "ordered-team",
      phase: "ci-clean",
      source: "ci",
      repository: "octo/ctf",
      commitSha: "c".repeat(40),
    };
    const participantHeaders = { "content-type": "application/json", "x-board-reporter-token": "participant-token" };
    const ciHeaders = {
      "content-type": "application/json",
      "x-board-ci-token": deriveCiToken(ciTokenKey, "universe-2026", "octo/ctf", "ordered-team"),
    };

    let response = await fetch(`${baseUrl}/api/events`, {
      method: "POST", headers: participantHeaders, body: JSON.stringify(participant("started")),
    });
    assert.equal(response.status, 201);
    response = await fetch(`${baseUrl}/api/events`, {
      method: "POST", headers: ciHeaders, body: JSON.stringify(ciEvent),
    });
    assert.equal(response.status, 409);

    for (const phase of ["red", "purple", "green", "blue"]) {
      response = await fetch(`${baseUrl}/api/events`, {
        method: "POST", headers: participantHeaders, body: JSON.stringify(participant(phase)),
      });
      assert.equal(response.status, 200);
    }
    response = await fetch(`${baseUrl}/api/events`, {
      method: "POST", headers: ciHeaders, body: JSON.stringify(ciEvent),
    });
    assert.equal(response.status, 200);
  }, {
    reporterToken: "participant-token",
    ciTokenKey,
    ciBindings: { "octo/ctf": "ordered-team" },
  });
});

test("CI credentials cannot claim another repository or team", async () => {
  const bindings = {
    "octo/team-one": "team-one",
    "octo/team-two": "team-two",
  };
  await withBoard(async (baseUrl) => {
    const participantHeaders = { "content-type": "application/json" };
    for (const teamId of ["team-one", "team-two"]) {
      for (const phase of ["started", "red", "purple", "green", "blue"]) {
        const response = await fetch(`${baseUrl}/api/events`, {
          method: "POST",
          headers: participantHeaders,
          body: JSON.stringify({
            sessionId: "universe-2026",
            teamId,
            alias: teamId === "team-one" ? "Team One" : "Team Two",
            phase,
            source: "participant",
          }),
        });
        assert.equal(response.status, phase === "started" ? 201 : 200);
      }
    }

    const teamOneToken = deriveCiToken(ciTokenKey, "universe-2026", "octo/team-one", "team-one");
    const event = {
      sessionId: "universe-2026",
      teamId: "team-two",
      phase: "ci-clean",
      source: "ci",
      repository: "octo/team-two",
      commitSha: "d".repeat(40),
    };
    const wrongCredential = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-board-ci-token": teamOneToken },
      body: JSON.stringify(event),
    });
    assert.equal(wrongCredential.status, 401);

    const wrongTeam = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-board-ci-token": teamOneToken },
      body: JSON.stringify({ ...event, repository: "octo/team-one" }),
    });
    assert.equal(wrongTeam.status, 400);
    assert.deepEqual(await wrongTeam.json(), { error: "repository/team binding mismatch" });

    const state = await (await fetch(`${baseUrl}/api/state`)).json();
    assert.ok(state.teams.every((team) => team.ciStatus === "pending"));
  }, { ciTokenKey, ciBindings: bindings });
});

test("CI binding configuration is strict and one-to-one", () => {
  assert.throws(() => parseCiBindings("{"), /valid JSON/);
  assert.throws(() => parseCiBindings({ "Octo/repo": "team-one" }), /invalid CI repository/);
  assert.throws(
    () => parseCiBindings({ "octo/one": "same-team", "octo/two": "same-team" }),
    /bound more than once/,
  );
  assert.throws(
    () => createBoard({ ciBindings: { "octo/repo": "team-one" }, ciTokenKey: "too-short" }),
    /at least 32 bytes/,
  );
});

test("board retains its sixty-team capacity without evicting registered squads", async () => {
  await withBoard(async (baseUrl) => {
    for (let index = 0; index < 60; index += 1) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.60" },
        body: JSON.stringify({
          sessionId: "universe-2026",
          teamId: `capacity-${index}`,
          alias: `Team ${index}`,
          phase: "started",
          source: "participant",
        }),
      });
      assert.equal(response.status, 201);
    }
    const overflow = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.60" },
      body: JSON.stringify({
        sessionId: "universe-2026",
        teamId: "capacity-61",
        alias: "Overflow Team",
        phase: "started",
        source: "participant",
      }),
    });
    assert.equal(overflow.status, 409);
    assert.deepEqual(await overflow.json(), { error: "board capacity reached" });

    const state = await (await fetch(`${baseUrl}/api/state`)).json();
    assert.equal(state.teams.length, 60);
    assert.ok(state.teams.some((team) => team.teamId === "capacity-0"));
    assert.ok(state.teams.every((team) => team.ciStatus === "pending"));
  });
});

test("board throttles an abusive burst for one participant identity", async () => {
  await withBoard(async (baseUrl) => {
    const event = {
      sessionId: "universe-2026",
      teamId: "burst-team",
      alias: "Burst Team",
      phase: "started",
      source: "participant",
    };
    const headers = {
      "content-type": "application/json",
      "x-board-reporter-token": "burst-token",
      "x-forwarded-for": "192.0.2.60",
    };

    for (const expectedStatus of [201, 409, 409]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      });
      assert.equal(response.status, expectedStatus);
    }

    const throttled = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    assert.equal(throttled.status, 429);
    assert.deepEqual(await throttled.json(), { error: "rate limit exceeded" });

    const neighbor = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...event, teamId: "neighbor-team", alias: "Neighbor Team" }),
    });
    assert.equal(neighbor.status, 201);
  }, {
    reporterToken: "burst-token",
    rateLimit: { identityLimit: 3 },
  });
});

test("board enforces phase source combinations before persistence", async () => {
  await withBoard(async (baseUrl) => {
    for (const [index, phase, source] of [
      [0, "started", "participant"],
      [1, "red", "participant"],
      [2, "purple", "participant"],
      [3, "green", "participant"],
      [4, "blue", "participant"],
    ]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: "universe-2026",
          teamId: "accepted-phases",
          alias: "Purple Test",
          phase,
          source,
        }),
      });
      assert.equal(response.status, index === 0 ? 201 : 200, `${phase}/${source}`);
    }

    for (const [phase, source] of [
      ["started", "actions"],
      ["red", "actions"],
      ["blue", "actions"],
      ["purple", "actions"],
      ["green", "actions"],
    ]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: "universe-2026",
          teamId: `rejected-${phase}`,
          alias: "Purple Test",
          phase,
          source,
        }),
      });
      assert.equal(response.status, 400, `${phase}/${source}`);
      assert.deepEqual(await response.json(), { error: "invalid source" });
    }

    const state = await fetch(`${baseUrl}/api/state`);
    assert.equal((await state.json()).teams.length, 1);
  });
});

test("board requires Red, Purple, and Green before Blue reaches victory", async () => {
  await withBoard(async (baseUrl) => {
    const headers = { "content-type": "application/json" };
    const event = (phase) => ({
      sessionId: "universe-2026",
      teamId: "victory-team",
      alias: "Purple Test",
      phase,
      source: "participant",
    });

    for (const phase of ["started", "red", "purple", "green", "blue"]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(event(phase)),
      });
      assert.equal(response.status, phase === "started" ? 201 : 200, phase);
    }

    const skipped = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...event("green"), teamId: "skipped-team" }),
    });
    assert.equal(skipped.status, 409, "a team must start at registration");
  });
});

test("board rejects unknown fields and protects reset", async () => {
  await withBoard(async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "universe-2026",
        teamId: "team-2",
        alias: "Purple Test",
        phase: "started",
        source: "participant",
        repository: "forbidden",
      }),
    });
    assert.equal(invalid.status, 400);

    const resetDenied = await fetch(`${baseUrl}/api/reset`, { method: "POST" });
    assert.equal(resetDenied.status, 401);

    const resetAllowed = await fetch(`${baseUrl}/api/reset`, {
      method: "POST",
      headers: { "x-operator-key": "secret" },
    });
    assert.equal(resetAllowed.status, 204);
  });
});

test("board stamps mission timing for diagnostics and aggregate rehearsal analysis", async () => {
  await withBoard(async (baseUrl) => {
    const headers = { "content-type": "application/json" };
    const event = (phase) => ({
      sessionId: "universe-2026",
      teamId: "timed-team",
      alias: "Purple Test",
      phase,
      source: "participant",
    });

    const registration = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(event("started")),
    });
    const { team: registered } = await registration.json();
    assert.ok(registered.startedAt, "registration stamps startedAt");
    assert.equal(registered.finishedAt, null, "an unfinished team has no finish time");

    let latest = registered;
    for (const phase of ["red", "purple", "green", "blue"]) {
      const response = await fetch(`${baseUrl}/api/events`, {
        method: "POST",
        headers,
        body: JSON.stringify(event(phase)),
      });
      ({ team: latest } = await response.json());
      assert.equal(latest.startedAt, registered.startedAt, `startedAt is preserved through ${phase}`);
      assert.equal(latest.finishedAt, phase === "blue" ? latest.updatedAt : null, phase);
    }

    const state = await (await fetch(`${baseUrl}/api/state`)).json();
    assert.equal(state.teams[0].finishedAt, latest.finishedAt, "timing is exposed on /api/state");
  });
});
