import test, { before } from "node:test";
import assert from "node:assert/strict";
import { APP_URL, available, hotelsFrom, request } from "./http.mjs";

let running = false;
const searchMode = process.env.WORKSHOP_SEARCH_MODE || "starter";
before(async () => {
  assert.ok(["starter", "challenge", "corrected"].includes(searchMode), "WORKSHOP_SEARCH_MODE must be starter, challenge or corrected");
  running = await available(APP_URL);
  assert.ok(running, `Start the application at ${APP_URL} before running integration tests`);
});

const serviceTest = (name, fn) => test(name, async (t) => {
  if (!running) return t.skip(`application unavailable at ${APP_URL}`);
  return fn(t);
});

serviceTest("health endpoint is available", async () => {
  const { response } = await request(APP_URL, "/health");
  assert.equal(response.status, 200);
});

serviceTest("city search follows the requested workshop stage", async () => {
  const paris = await request(APP_URL, "/api/hotels?city=Paris");
  if (searchMode === "starter") {
    assert.equal(paris.response.status, 501);
    assert.equal(paris.body.code, "CITY_SEARCH_NOT_IMPLEMENTED");
    return;
  }
  assert.equal(paris.response.status, 200);
  const hotels = hotelsFrom(paris.body);
  assert.equal(hotels.length, 2);
  assert.ok(hotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
  hotels.forEach((hotel) => {
    assert.equal(typeof hotel.id, "number");
    assert.equal(typeof hotel.city, "string");
    assert.equal(typeof hotel.name, "string");
    assert.equal(typeof hotel.pricePerNight, "number");
    assert.equal(typeof hotel.listingStatus, "string");
    assert.ok(["PUBLIC", "UNPUBLISHED"].includes(hotel.listingStatus));
    assert.equal(typeof hotel.partnerNetRate, "number");
    assert.equal(typeof hotel.forecastOccupancyPct, "number");
    assert.equal(typeof hotel.syntheticReservationCount, "number");
  });
});

serviceTest("unknown city returns an empty result", async () => {
  const result = await request(APP_URL, "/api/hotels?city=NoSuchWorkshopCity");
  if (searchMode === "starter") {
    assert.equal(result.response.status, 501);
    assert.equal(result.body.code, "CITY_SEARCH_NOT_IMPLEMENTED");
    return;
  }
  assert.equal(result.response.status, 200);
  assert.deepEqual(hotelsFrom(result.body), []);
});

serviceTest("supplied demonstration follows the explicitly selected stage", async () => {
  const normal = await request(APP_URL, "/api/hotels?city=Paris");
  const payload = encodeURIComponent("' OR 1=1 -- ");
  const exploit = await request(APP_URL, `/api/hotels?city=${payload}`);
  if (searchMode === "starter") {
    assert.equal(exploit.response.status, 501);
    assert.equal(exploit.body.code, "CITY_SEARCH_NOT_IMPLEMENTED");
    return;
  }
  assert.equal(normal.response.status, 200);
  assert.equal(exploit.response.status, 200);
  const normalHotels = hotelsFrom(normal.body);
  const exploitHotels = hotelsFrom(exploit.body);
  if (searchMode === "challenge") {
    assert.equal(normalHotels.length, 2);
    assert.equal(exploitHotels.length, 24, "tautology should return all listings");
    const unpublished = exploitHotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
    assert.equal(unpublished.length, 4, "tautology should expose four unpublished listings");
    assert.equal(
      unpublished.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0),
      27400
    );
  } else {
    assert.equal(normalHotels.length, 2);
    assert.deepEqual(exploitHotels, [], "parameterized query must neutralize tautology");
    assert.equal(
      exploitHotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED").length,
      0,
      "parameterized query must not expose unpublished listings"
    );
  }
});
