import { Hono } from "hono";

const participantFields = ["sessionId", "teamId", "alias", "phase", "source"];
const ciFields = ["sessionId", "teamId", "phase", "source", "repository", "commitSha"];
const phases = ["started", "red", "purple", "green", "blue"];
const phaseIndex = new Map(phases.map((phase, index) => [phase, index]));
const aliasPattern = /^[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const commitShaPattern = /^[a-fA-F0-9]{40,64}$/;
const JSON_LIMIT_BYTES = 4 * 1024;

function jsonError(c, status, error) {
  return c.json({ error }, status);
}

function getIpAddress(c) {
  const forwarded = c.req.header("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const connecting = c.req.header("cf-connecting-ip");
  if (typeof connecting === "string" && connecting.trim()) {
    return connecting.trim();
  }
  return "unknown";
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  let mismatch = left.length === right.length ? 0 : 1;
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function validReporterToken(c, reporterToken) {
  if (!reporterToken) return true;
  return constantTimeEqual(c.req.header("x-board-reporter-token") || "", reporterToken);
}

function hasExactlyFields(payload, fields) {
  const keys = Object.keys(payload);
  return keys.length === fields.length && keys.every((key) => fields.includes(key));
}

function createTokenBucketStore({ capacity, refillWindowMs, maxBuckets = 10_000 }) {
  const buckets = new Map();
  let checks = 0;

  function prune(now) {
    for (const [key, bucket] of buckets) {
      if (now - bucket.lastSeen >= refillWindowMs) buckets.delete(key);
    }
    while (buckets.size > maxBuckets) {
      buckets.delete(buckets.keys().next().value);
    }
  }

  return {
    take(key, now = Date.now()) {
      checks += 1;
      if (checks % 256 === 0 || buckets.size >= maxBuckets) prune(now);

      const existing = buckets.get(key);
      const elapsed = existing ? Math.max(0, now - existing.updatedAt) : 0;
      const tokens = existing
        ? Math.min(capacity, existing.tokens + (elapsed * capacity / refillWindowMs))
        : capacity;
      buckets.delete(key);
      buckets.set(key, {
        tokens: tokens >= 1 ? tokens - 1 : tokens,
        updatedAt: now,
        lastSeen: now,
      });
      while (buckets.size > maxBuckets) {
        buckets.delete(buckets.keys().next().value);
      }
      return tokens >= 1;
    },
  };
}

function createEventRateLimiter({
  identityLimit = 10,
  networkLimit = 600,
  windowMs = 60_000,
  maxBuckets = 10_000,
} = {}) {
  const identities = createTokenBucketStore({
    capacity: identityLimit,
    refillWindowMs: windowMs,
    maxBuckets,
  });
  const networks = createTokenBucketStore({
    capacity: networkLimit,
    refillWindowMs: windowMs,
    maxBuckets,
  });

  return {
    take({ ip, source, teamId, token }, now = Date.now()) {
      let tokenFingerprint = 2166136261;
      for (const character of token || "") {
        tokenFingerprint ^= character.codePointAt(0);
        tokenFingerprint = Math.imul(tokenFingerprint, 16777619);
      }
      return identities.take(`${source}:${teamId}:${tokenFingerprint >>> 0}`, now)
        && networks.take(ip, now);
    },
  };
}

function resolveSessionId(env = {}, now = new Date()) {
  if (env.BOARD_SESSION_ID) return env.BOARD_SESSION_ID;

  const year = now.getUTCFullYear().toString().padStart(4, "0");
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = now.getUTCDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

function validEvent(payload, sessionId) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "payload must be a JSON object";
  }

  if (payload.sessionId !== sessionId) {
    return "invalid sessionId";
  }
  if (typeof payload.teamId !== "string" || payload.teamId.length < 3 || payload.teamId.length > 80) {
    return "invalid teamId";
  }
  if (payload.source === "ci") {
    if (!hasExactlyFields(payload, ciFields)) {
      return "CI payload must contain exactly sessionId, teamId, phase, source, repository, commitSha";
    }
    if (payload.phase !== "ci-clean") return "invalid CI phase";
    if (
      typeof payload.repository !== "string"
      || !repositoryPattern.test(payload.repository)
    ) {
      return "invalid repository";
    }
    if (typeof payload.commitSha !== "string" || !commitShaPattern.test(payload.commitSha)) {
      return "invalid commitSha";
    }
    return null;
  }
  const deliveryFields = [...participantFields, "repository", "commitSha"];
  const hasDelivery = payload.phase === "blue" && hasExactlyFields(payload, deliveryFields);
  if (hasDelivery && !repositoryPattern.test(payload.repository || "")) return "invalid repository";
  if (hasDelivery && !commitShaPattern.test(payload.commitSha || "")) return "invalid commitSha";
  if (!hasDelivery && !hasExactlyFields(payload, participantFields)) {
    return "payload must contain exactly sessionId, teamId, alias, phase, source";
  }
  if (
    typeof payload.alias !== "string" ||
    payload.alias.length < 3 ||
    payload.alias.length > 40 ||
    !aliasPattern.test(payload.alias)
  ) {
    return "invalid alias";
  }
  if (!phaseIndex.has(payload.phase)) {
    return "invalid phase";
  }
  if (payload.source !== "participant") {
    return "invalid source";
  }
  return null;
}

async function parseJsonBody(c) {
  const contentLength = Number(c.req.header("content-length"));
  if (Number.isFinite(contentLength) && contentLength > JSON_LIMIT_BYTES) {
    return { error: "payload too large", status: 413 };
  }

  const raw = await c.req.raw.text();
  if (new TextEncoder().encode(raw).byteLength > JSON_LIMIT_BYTES) {
    return { error: "payload too large", status: 413 };
  }

  try {
    return { value: JSON.parse(raw) };
  } catch {
    return { error: "invalid JSON", status: 400 };
  }
}

const app = new Hono();
const eventRateLimiter = createEventRateLimiter();

app.get("/health", (c) => {
  const sessionId = resolveSessionId(c.env);
  return c.json({ ok: true, sessionId });
});

app.post("/api/events", async (c) => {
  const parsed = await parseJsonBody(c);
  if (parsed.error) {
    return jsonError(c, parsed.status, parsed.error);
  }

  const sessionId = resolveSessionId(c.env);
  const isCiEvent = parsed.value?.source === "ci";
  if (!eventRateLimiter.take({
    ip: getIpAddress(c),
    source: isCiEvent ? "ci" : "participant",
    teamId: typeof parsed.value?.teamId === "string" ? parsed.value.teamId : "unknown",
    token: c.req.header("x-board-reporter-token") || "",
  })) {
    return jsonError(c, 429, "rate limit exceeded");
  }
  if (!validReporterToken(c, c.env.BOARD_TOKEN || "")) {
    return jsonError(c, 401, "unauthorized");
  }
  const validationError = validEvent(parsed.value, sessionId);
  if (validationError) {
    return jsonError(c, 400, validationError);
  }

  const incoming = parsed.value;
  const existing = await c.env.BOARD_DB.prepare(
    `SELECT teamId, alias, phase, source, ciStatus, ciRepository, ciCommitSha,
      ciCompletedAt, startedAt, finishedAt, updatedAt FROM teams WHERE teamId = ?`
  )
    .bind(incoming.teamId)
    .first();

  if (incoming.source === "ci") {
    if (!existing || !["green", "blue"].includes(existing.phase)) {
      return jsonError(c, 409, "CI completion requires local Green verification");
    }
    if (existing.phase === "blue" && (existing.ciRepository !== incoming.repository || existing.ciCommitSha !== incoming.commitSha)) {
      return jsonError(c, 409, "CI commit must match the participant-reviewed Blue delivery");
    }
    if (existing.ciStatus === "clean" && existing.ciRepository === incoming.repository && existing.ciCommitSha === incoming.commitSha) {
      return c.json({ team: existing }, 200);
    }
    const stampedAt = new Date().toISOString();
    const updated = await c.env.BOARD_DB.prepare(
      `UPDATE teams SET ciStatus = 'clean', ciRepository = ?, ciCommitSha = ?,
        ciCompletedAt = ?, updatedAt = ? WHERE teamId = ? AND phase = ? AND updatedAt = ?`
    )
      .bind(incoming.repository, incoming.commitSha, stampedAt, stampedAt, incoming.teamId, existing.phase, existing.updatedAt)
      .run();
    if (!updated.meta.changes) return jsonError(c, 409, "Team changed during CI update; retry the event");
    return c.json({
      team: {
        ...existing,
        ciStatus: "clean",
        ciRepository: incoming.repository,
        ciCommitSha: incoming.commitSha,
        ciCompletedAt: stampedAt,
        updatedAt: stampedAt,
      },
    }, 200);
  }

  const nextIndex = phaseIndex.get(incoming.phase);
  if (existing) {
    const currentIndex = phaseIndex.get(existing.phase);
    if (nextIndex !== currentIndex + 1) {
      return jsonError(c, 409, "phase must advance in order");
    }
  } else if (incoming.phase !== "started") {
    return jsonError(c, 409, "team must register with started");
  } else {
    const countRow = await c.env.BOARD_DB.prepare("SELECT COUNT(*) AS count FROM teams").first();
    if (Number(countRow?.count || 0) >= 74) {
      return jsonError(c, 409, "board capacity reached");
    }
  }

  const matchingCi = existing?.ciStatus === "clean" && existing.ciRepository === incoming.repository
    && existing.ciCommitSha === incoming.commitSha;
  const stampedAt = new Date().toISOString();
  const team = {
    teamId: incoming.teamId,
    alias: incoming.alias,
    phase: incoming.phase,
    source: incoming.source,
    ciStatus: incoming.phase === "blue" ? (matchingCi ? "clean" : "pending") : (existing?.ciStatus || "pending"),
    ciRepository: incoming.phase === "blue" ? (incoming.repository || null) : (existing?.ciRepository || null),
    ciCommitSha: incoming.phase === "blue" ? (incoming.commitSha || null) : (existing?.ciCommitSha || null),
    ciCompletedAt: incoming.phase === "blue" && !matchingCi ? null : (existing?.ciCompletedAt || null),
    startedAt: existing ? existing.startedAt : stampedAt,
    finishedAt: incoming.phase === "blue" ? stampedAt : (existing ? existing.finishedAt : null),
    updatedAt: stampedAt,
  };

  const updated = await c.env.BOARD_DB.prepare(
    `
      INSERT INTO teams (
        teamId, alias, phase, source, ciStatus, ciRepository, ciCommitSha,
        ciCompletedAt, startedAt, finishedAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(teamId) DO UPDATE SET
        alias = excluded.alias,
        phase = excluded.phase,
        source = excluded.source,
        ciStatus = excluded.ciStatus,
        ciRepository = excluded.ciRepository,
        ciCommitSha = excluded.ciCommitSha,
        ciCompletedAt = excluded.ciCompletedAt,
        finishedAt = excluded.finishedAt,
        updatedAt = excluded.updatedAt
      WHERE teams.phase = ? AND teams.updatedAt = ? AND teams.ciStatus = ?
        AND teams.ciCommitSha IS ?
    `
  )
    .bind(
      team.teamId,
      team.alias,
      team.phase,
      team.source,
      team.ciStatus,
      team.ciRepository,
      team.ciCommitSha,
      team.ciCompletedAt,
      team.startedAt,
      team.finishedAt,
      team.updatedAt,
      existing?.phase || null,
      existing?.updatedAt || null,
      existing?.ciStatus || null,
      existing?.ciCommitSha || null,
    )
    .run();
  if (!updated.meta.changes) return jsonError(c, 409, "Team changed during phase update; retry the event");

  return c.json({ team }, existing ? 200 : 201);
});

app.get("/api/state", async (c) => {
  const result = await c.env.BOARD_DB.prepare(
    `SELECT teamId, alias, phase, source, ciStatus, ciRepository, ciCommitSha,
      ciCompletedAt, startedAt, finishedAt, updatedAt FROM teams ORDER BY updatedAt ASC`
  ).all();
  return c.json({ teams: result.results || [] });
});

app.post("/api/reset", async (c) => {
  const operatorKey = c.env.BOARD_OPERATOR_KEY || "";
  if (!operatorKey) {
    return jsonError(c, 401, "unauthorized");
  }

  const provided = c.req.header("x-operator-key") || "";
  if (!constantTimeEqual(provided, operatorKey)) {
    return jsonError(c, 401, "unauthorized");
  }

  await c.env.BOARD_DB.prepare("DELETE FROM teams").run();
  return new Response(null, { status: 204 });
});

app.notFound((c) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return new Response("Not Found", { status: 404 });
});

export default app;
export {
  constantTimeEqual,
  createEventRateLimiter,
  resolveSessionId,
  validEvent,
};
