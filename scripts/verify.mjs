import assert from "node:assert/strict";
import { APP_URL, available, hotelsFrom, request } from "../test/http.mjs";

if (!(await available(APP_URL))) {
  console.error(`BLOCKED: application is not running at ${APP_URL}. Start it with npm start.`);
  process.exit(2);
}

const normal = await request(APP_URL, "/api/hotels?city=Paris");
const unknown = await request(APP_URL, "/api/hotels?city=NoSuchWorkshopCity");
const empty = await request(APP_URL, "/api/hotels?city=");
const payload = encodeURIComponent("' OR 1=1 -- ");
const exploit = await request(APP_URL, `/api/hotels?city=${payload}`);
assert.equal(normal.response.status, 200, "normal city search failed");
assert.equal(unknown.response.status, 200, "unknown city search failed");
assert.equal(empty.response.status, 200, "empty city search failed");
assert.equal(exploit.response.status, 200, "exploit probe failed");
const normalHotels = hotelsFrom(normal.body);
const unknownHotels = hotelsFrom(unknown.body);
const emptyHotels = hotelsFrom(empty.body);
const exploitHotels = hotelsFrom(exploit.body);
assert.equal(normalHotels.length, 2, "baseline Paris search should return two public listings");
assert.ok(normalHotels.every((hotel) => hotel.listingStatus === "PUBLIC"));
assert.deepEqual(unknownHotels, [], "unknown city should return no listings");
assert.deepEqual(emptyHotels, [], "empty city should return no listings");
assert.deepEqual(exploitHotels, [], "parameterized query must return no rows for the tautology");
assert.equal(
  exploitHotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED").length,
  0,
  "parameterized query must not expose unpublished listings"
);
console.log("PASS: Paris -> 2 public listings.");
console.log("PASS: unknown city -> 0 listings.");
console.log("PASS: empty city -> 0 listings.");
console.log("PASS: canonical payload -> 0 listings and 0 unpublished listings.");
console.log("PASS: parameterized-query verification preserved normal search and the public-listing boundary.");
