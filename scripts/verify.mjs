import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { APP_URL, available, hotelsFrom, request } from "../test/http.mjs";

if (!(await available(APP_URL))) {
  console.error(`BLOCKED: application is not running at ${APP_URL}. Start it with npm run workshop:app.`);
  process.exit(2);
}

const normal = await request(APP_URL, "/api/hotels?city=Paris");
const lowercaseParis = await request(APP_URL, "/api/hotels?city=paris");
const unknown = await request(APP_URL, "/api/hotels?city=NoSuchWorkshopCity");
const empty = await request(APP_URL, "/api/hotels?city=");
const payload = encodeURIComponent("' OR 1=1 -- ");
const exploit = await request(APP_URL, `/api/hotels?city=${payload}`);
assert.equal(normal.response.status, 200, "normal city search failed");
assert.equal(lowercaseParis.response.status, 200, "lowercase Paris search failed");
assert.equal(unknown.response.status, 200, "unknown city search failed");
assert.equal(empty.response.status, 200, "empty city search failed");
assert.equal(exploit.response.status, 200, "exploit probe failed");
const normalHotels = hotelsFrom(normal.body);
const lowercaseParisHotels = hotelsFrom(lowercaseParis.body);
const unknownHotels = hotelsFrom(unknown.body);
const emptyHotels = hotelsFrom(empty.body);
const exploitHotels = hotelsFrom(exploit.body);
const cityFilterSource = readFileSync(new URL("../app/src/search-query.js", import.meta.url), "utf8");
if (exploitHotels.length > 0 && /city = \? COLLATE NOCASE/.test(cityFilterSource)) {
  console.error(
    "BLOCKED: app/src/search-query.js binds the city, but the running application still serves the old code. " +
      "Restart it without resetting progress: npm run workshop:app -- --restart"
  );
  process.exit(3);
}
assert.equal(normalHotels.length, 2, "baseline Paris search should return two public listings");
assert.ok(normalHotels.every((hotel) => hotel.listingStatus === "PUBLIC"));
assert.deepEqual(lowercaseParisHotels, normalHotels, "city search should be case-insensitive");
assert.deepEqual(unknownHotels, [], "unknown city should return no listings");
assert.deepEqual(emptyHotels, [], "empty city should return no listings");
assert.deepEqual(exploitHotels, [], "parameterized query must return no rows for the tautology");
assert.equal(
  exploitHotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED").length,
  0,
  "parameterized query must not expose unpublished listings"
);
assert.equal(
  exploitHotels.filter((hotel) => String(hotel.internalReference || "").startsWith("FLAG{")).length,
  0,
  "the capture-the-flag token must no longer be reachable"
);
export const verification = {
  normalCount: normalHotels.length,
  normalPublic: normalHotels.every((hotel) => hotel.listingStatus === "PUBLIC"),
  lowercaseMatches: JSON.stringify(lowercaseParisHotels) === JSON.stringify(normalHotels),
  unknownCount: unknownHotels.length,
  emptyCount: emptyHotels.length,
  payloadCount: exploitHotels.length,
  unpublishedCount: exploitHotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED").length,
  flagCount: exploitHotels.filter((hotel) => String(hotel.internalReference || "").startsWith("FLAG{")).length,
};
console.log("PASS: Paris -> 2 public listings.");
console.log("PASS: paris -> same 2 public listings.");
console.log("PASS: unknown city -> 0 listings.");
console.log("PASS: empty city -> 0 listings.");
console.log("PASS: canonical payload -> 0 listings, 0 unpublished listings, and no flag token.");
console.log("PASS: parameterized-query verification preserved normal search and the public-listing boundary.");
