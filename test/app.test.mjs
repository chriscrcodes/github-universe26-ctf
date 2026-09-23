import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { APP_URL, available, hotelsFrom, request } from "./http.mjs";

let running = false;
before(async () => {
  running = await available(APP_URL);
});

const serviceTest = (name, fn) => test(name, async (t) => {
  if (!running) return t.skip(`application unavailable at ${APP_URL}`);
  return fn(t);
});

test("hotel search suggestions include San Francisco", async () => {
  const html = await readFile(new URL("../app/public/index.html", import.meta.url), "utf8");
  assert.match(html, /data-city="San Francisco">San Francisco<\/button>/);
});

serviceTest("health endpoint is available", async () => {
  const { response } = await request(APP_URL, "/health");
  assert.equal(response.status, 200);
});

serviceTest("city search returns the two public Paris listings with business metadata", async () => {
  const paris = await request(APP_URL, "/api/hotels?city=Paris");
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
  assert.equal(result.response.status, 200);
  assert.deepEqual(hotelsFrom(result.body), []);
});

serviceTest("read-only tautology either bypasses or preserves the publication boundary by mode", async () => {
  const health = await request(APP_URL, "/health");
  const normal = await request(APP_URL, "/api/hotels?city=Paris");
  const payload = encodeURIComponent("' OR 1=1 -- ");
  const exploit = await request(APP_URL, `/api/hotels?city=${payload}`);
  assert.equal(normal.response.status, 200);
  assert.equal(exploit.response.status, 200);
  const normalHotels = hotelsFrom(normal.body);
  const exploitHotels = hotelsFrom(exploit.body);
  if (health.body?.vulnerable) {
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
