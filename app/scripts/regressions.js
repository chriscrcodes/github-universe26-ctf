const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { recordEvidence } = require("../src/workshop-progress");

const appUrl = (process.env.APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

async function hotels(city) {
  const response = await fetch(`${appUrl}/api/hotels?city=${encodeURIComponent(city)}`, {
    signal: AbortSignal.timeout(3000),
  });
  assert.equal(response.status, 200, `search for ${JSON.stringify(city)} failed`);
  const body = await response.json();
  assert.ok(Array.isArray(body.hotels), "response must contain a hotels array");
  return body.hotels;
}

async function main() {
  const paris = await hotels("Paris");
  const lowercaseParis = await hotels("paris");
  const unknown = await hotels("NoSuchWorkshopCity");
  const empty = await hotels("");
  const payload = await hotels("' OR 1=1 -- ");

  assert.equal(paris.length, 2, "Paris should return two listings");
  assert.ok(paris.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
  assert.deepEqual(lowercaseParis, paris, "city searches should not depend on input capitalization");
  assert.deepEqual(unknown, [], "unknown city should return no listings");
  assert.deepEqual(empty, [], "empty city should return no listings");
  assert.deepEqual(payload, [], "canonical payload should be treated as literal data");
  assert.equal(
    payload.filter((hotel) => String(hotel.internalReference || "").startsWith("FLAG{")).length,
    0,
    "the capture-the-flag token should no longer be reachable"
  );

  const commit = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const upstream = git(["ls-remote", "origin", "refs/heads/main"]).split(/\s+/)[0];
  const remediationChanges = git(
    ["status", "--porcelain", "--", ":(top)app/src"],
    true
  );
  const pushed = branch === "main" && upstream === commit && remediationChanges === "";
  assert.ok(
    pushed,
    "the approved correction must be committed and pushed on main before Blue publishes final evidence"
  );

  recordEvidence("blue", {
    command: "npm run regressions",
    cases: ["Paris (case-insensitive)", "unknown city", "empty city", "canonical payload", "publication boundary"],
    checks: {
      parisCount: paris.length,
      parisPublic: paris.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"),
      lowercaseMatches: JSON.stringify(lowercaseParis) === JSON.stringify(paris),
      unknownCount: unknown.length,
      emptyCount: empty.length,
      payloadCount: payload.length,
      flagCount: payload.filter((hotel) => String(hotel.internalReference || "").startsWith("FLAG{")).length,
    },
    branch,
    commit,
    pushed: true,
  });
  console.log("PASS: participant-selected regression matrix preserved the public-listing boundary.");
  console.log("Evidence recorded. Return to Mentor for the final CodeQL reading, Blue checkpoint and participant agreement.");
}

function git(args, optional = false) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status === 0) return result.stdout.trim();
  if (optional) return "";
  throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Regression check failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { git, main };
