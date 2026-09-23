const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");

const participantFields = ["sessionId", "teamId", "alias", "phase", "source"];
const ciFields = ["sessionId", "teamId", "phase", "source", "repository", "commitSha"];
const participantPhases = ["started", "red", "purple", "green", "blue"];
const phaseIndex = new Map(participantPhases.map((phase, index) => [phase, index]));
const aliasPattern = /^[A-Za-z0-9]+(?:[ '-][A-Za-z0-9]+)*$/;
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const commitShaPattern = /^[a-fA-F0-9]{40,64}$/;
const staticRoot = path.resolve(__dirname, "../../web");

function jsonError(res, status, error) {
  return res.status(status).json({ error });
}

function getIpAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function validReporterToken(req, reporterToken) {
  if (!reporterToken) return true;
  return validSecret(req.headers["x-board-reporter-token"], reporterToken);
}

function validSecret(provided, expected) {
  if (typeof provided !== "string") return false;
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
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

  return function rateLimit(req, res, next) {
    const source = req.body?.source === "ci" ? "ci" : "participant";
    const teamId = typeof req.body?.teamId === "string" ? req.body.teamId : "unknown";
    const token = req.headers["x-board-reporter-token"];
    const tokenDigest = crypto
      .createHash("sha256")
      .update(typeof token === "string" ? token : "")
      .digest("hex");

    if (
      !identities.take(`${source}:${teamId}:${tokenDigest}`)
      || !networks.take(getIpAddress(req))
    ) {
      return jsonError(res, 429, "rate limit exceeded");
    }
    return next();
  };
}

function hasExactlyFields(payload, allowedFields) {
  const keys = Object.keys(payload);
  return keys.length === allowedFields.length && !keys.some((key) => !allowedFields.includes(key));
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
    if (payload.phase !== "ci-clean") {
      return "invalid CI phase";
    }
    if (typeof payload.repository !== "string" || !repositoryPattern.test(payload.repository)) {
      return "invalid repository";
    }
    if (typeof payload.commitSha !== "string" || !commitShaPattern.test(payload.commitSha)) {
      return "invalid commitSha";
    }
    return null;
  }
  if (!hasExactlyFields(payload, participantFields)) {
    return "payload must contain exactly sessionId, teamId, alias, phase, source";
  }
  if (typeof payload.alias !== "string" || payload.alias.length < 3 || payload.alias.length > 40 || !aliasPattern.test(payload.alias)) {
    return "invalid alias";
  }
  if (payload.source !== "participant") {
    return "invalid source";
  }
  if (!phaseIndex.has(payload.phase)) {
    return "invalid phase";
  }
  return null;
}

function createBoard(options = {}) {
  const sessionId = options.sessionId || process.env.BOARD_SESSION_ID || "universe-2026";
  const reporterToken = options.reporterToken ?? process.env.BOARD_TOKEN ?? "";
  const operatorKey = options.operatorKey ?? process.env.BOARD_OPERATOR_KEY ?? "";
  const defaultPort = Number(options.port || process.env.PORT || 8080);
  const teams = new Map();
  const app = express();
  const rateLimit = createEventRateLimiter(options.rateLimit);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "4kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, sessionId });
  });

  app.post("/api/events", rateLimit, (req, res) => {
    if (!validReporterToken(req, reporterToken)) {
      return jsonError(res, 401, "unauthorized");
    }
    const validationError = validEvent(req.body, sessionId);
    if (validationError) {
      return jsonError(res, 400, validationError);
    }

    const incoming = req.body;
    const existing = teams.get(incoming.teamId);
    if (incoming.source === "ci") {
      if (!existing || existing.phase !== "blue") {
        return jsonError(res, 409, "CI completion requires local Blue verification");
      }

      const now = new Date().toISOString();
      const team = {
        ...existing,
        ciStatus: "clean",
        ciRepository: incoming.repository,
        ciCommitSha: incoming.commitSha,
        ciCompletedAt: now,
        updatedAt: now,
      };
      teams.set(incoming.teamId, team);
      return res.status(200).json({ team });
    }

    const nextIndex = phaseIndex.get(incoming.phase);
    if (existing) {
      const currentIndex = phaseIndex.get(existing.phase);
      if (nextIndex !== currentIndex + 1) {
        return jsonError(res, 409, "phase must advance in order");
      }
    } else if (incoming.phase !== "started") {
      return jsonError(res, 409, "team must register with started");
    } else if (teams.size >= 60) {
      return jsonError(res, 409, "board capacity reached");
    }

    const now = new Date().toISOString();
    const team = {
      teamId: incoming.teamId,
      alias: incoming.alias,
      phase: incoming.phase,
      source: incoming.source,
      ciStatus: existing ? existing.ciStatus : "pending",
      ciRepository: existing ? existing.ciRepository : null,
      ciCommitSha: existing ? existing.ciCommitSha : null,
      ciCompletedAt: existing ? existing.ciCompletedAt : null,
      startedAt: existing ? existing.startedAt : now,
      finishedAt: incoming.phase === "blue" ? now : (existing ? existing.finishedAt : null),
      updatedAt: now,
    };

    teams.set(incoming.teamId, team);

    return res.status(existing ? 200 : 201).json({ team });
  });

  app.get("/api/state", (_req, res) => {
    res.json({ teams: Array.from(teams.values()) });
  });

  app.post("/api/reset", (req, res) => {
    if (!operatorKey) {
      return jsonError(res, 401, "unauthorized");
    }

    if (!validSecret(req.headers["x-operator-key"], operatorKey)) {
      return jsonError(res, 401, "unauthorized");
    }

    teams.clear();
    return res.status(204).end();
  });

  app.use(express.static(staticRoot, { dotfiles: "deny" }));

  app.use((error, _req, res, next) => {
    if (error instanceof SyntaxError && "body" in error) {
      return jsonError(res, 400, "invalid JSON");
    }
    return next(error);
  });

  let server;
  return {
    app,
    getState: () => Array.from(teams.values()),
    reset: () => teams.clear(),
    sessionId,
    start(port = defaultPort) {
      return new Promise((resolve) => {
        server = app.listen(port, () => resolve(server));
      });
    },
    async stop() {
      if (!server) return;
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      server = undefined;
    },
  };
}

if (require.main === module) {
  const board = createBoard();
  board.start().then((server) => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : process.env.PORT || 8080;
    console.log(`board listening on ${port}`);
  });
}

module.exports = { createBoard, createEventRateLimiter, validEvent };
