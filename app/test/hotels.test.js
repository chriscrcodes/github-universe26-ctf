const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { once } = require("node:events");
const { Worker } = require("node:worker_threads");
const { resetDatabase, seedHotels, withDatabase } = require("../src/database");
const { findHotelById, partnerRateSummary, searchHotelsByCity: initialCitySearch } = require("../src/hotels");
const { createApp, startServer } = require("../src/server");
const { challengeInput, checkDelivery } = require("../scripts/delivery");

const payload = "' OR 1=1 -- ";
const hotelsPath = path.join(__dirname, "../src/hotels.js");
const hotelsSource = fs.readFileSync(hotelsPath, "utf8");
const startingApplication = hotelsSource.includes('error.code = "CITY_SEARCH_NOT_IMPLEMENTED"');

function prototypeSearch({ fixed = false } = {}) {
  let source = fs.readFileSync(path.join(__dirname, "../data/city-search-prototype.txt"), "utf8");
  if (fixed) {
    source = source.replace(
      "[{ clause: `city = '${term}' COLLATE NOCASE`, parameters: [] }]",
      "[buildCityFilter(term)]"
    );
  }
  const search = vm.runInNewContext(`${source}\nsearchHotelsByCity`, {
    ...require("../src/input-normalizer"),
    ...require("../src/search-query"),
    withDatabase,
  }, { timeout: 1000 });
  return (city, options) => Array.from(search(city, options));
}

const searchHotelsByCity = prototypeSearch({ fixed: true });

test("the workshop server listens only on loopback by default", async () => {
  const server = startServer(0);
  try {
    await once(server, "listening");
    assert.equal(server.address().address, "127.0.0.1");
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/health`)).status, 200);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("city search is not delivered in the starting application", { skip: !startingApplication }, () => {
  for (const city of ["Paris", payload, "", null]) {
    assert.throws(() => initialCitySearch(city), { code: "CITY_SEARCH_NOT_IMPLEMENTED" });
  }
});

test("the starting search API reports an unavailable feature, not an empty search", { skip: !startingApplication }, async () => {
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/hotels?city=Paris`);
    assert.equal(response.status, 501);
    assert.deepEqual(await response.json(), {
      hotels: [], error: "Hotel search by city has not been delivered yet.", code: "CITY_SEARCH_NOT_IMPLEMENTED",
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("integrating the supplied prototype serves the synthetic challenge and its bound correction over HTTP", async () => {
  const prototype = fs.readFileSync(path.join(__dirname, "../data/city-search-prototype.txt"), "utf8");
  for (const fixed of [false, true]) {
    const implementation = fixed ? prototype.replace(
      "[{ clause: `city = '${term}' COLLATE NOCASE`, parameters: [] }]", "[buildCityFilter(term)]") : prototype;
    const source = hotelsSource.replace(/function searchHotelsByCity\(city, options = \{\}\) \{[\s\S]*?\n\}/,
      () => implementation.trim());
    assert.ok(source.includes(implementation.trim()), "Expected the supplied function in the assembled application source.");
    assert.ok(!source.includes('error.code = "CITY_SEARCH_NOT_IMPLEMENTED"'));
    const worker = new Worker(`
      const { parentPort, workerData } = require("node:worker_threads");
      const { createRequire } = require("node:module");
      const vm = require("node:vm");
      const localRequire = createRequire(workerData.hotelsPath);
      const trainingModule = { exports: {} };
      vm.runInNewContext(workerData.source, { require: localRequire, module: trainingModule }, { timeout: 1000 });
      localRequire(workerData.hotelsPath).searchHotelsByCity = trainingModule.exports.searchHotelsByCity;
      const { createApp } = localRequire("./server");
      const server = createApp().listen(0, "127.0.0.1", () => parentPort.postMessage(server.address().port));
    `, { eval: true, workerData: { source, hotelsPath } });
    try {
      const [port] = await once(worker, "message");
      const appUrl = `http://127.0.0.1:${port}`;
      if (fixed) {
        await assert.rejects(checkDelivery(appUrl), /synthetic fixture/);
      } else {
        assert.equal((await checkDelivery(appUrl)).unpublishedCount, 4);
      }
      const response = await fetch(`${appUrl}/api/hotels?city=${encodeURIComponent(challengeInput)}`);
      assert.equal(response.status, 200);
      const { hotels } = await response.json();
      assert.equal(hotels.length, fixed ? 0 : 24);
      assert.equal((await (await fetch(`${appUrl}/api/hotels/12`)).json()).error, "listing not found");
      assert.deepEqual((await (await fetch(`${appUrl}/api/partners/summary?city=Paris`)).json()).summary,
        { listings: 2, averageNetRate: 180 });
    } finally {
      await worker.terminate();
    }
  }
});

test("the inert delivery prototype preserves normal search and exposes unpublished inventory", () => {
  resetDatabase();
  const search = prototypeSearch();
  const paris = search("Paris");
  assert.equal(paris.length, 2);
  assert.ok(paris.every((hotel) => hotel.listingStatus === "PUBLIC"));
  assert.deepEqual(search("paris"), paris);
  const exposed = search(payload);
  assert.equal(exposed.length, 24);
  const privateListings = exposed.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
  assert.equal(privateListings.length, 4);
  assert.equal(privateListings.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0), 27400);
  assert.ok(privateListings.some((hotel) => hotel.internalReference === "FLAG{unpublished-inventory-exposed}"));
});

test("parameter binding fixes the delivery prototype without breaking public search", () => {
  resetDatabase();
  const search = prototypeSearch({ fixed: true });
  assert.equal(search("Paris").length, 2);
  assert.deepEqual(search("paris"), search("Paris"));
  for (const city of [payload, "NoSuchWorkshopCity", "", null]) {
    assert.equal(search(city).length, 0);
  }
  assert.equal(search("Paris", { maxPrice: "230" }).length, 1);
  assert.equal(search("Paris", { name: "Saint-Clair" }).length, 1);
  assert.equal(search("Paris", { name: "%" }).length, 0);
  assert.equal(search("Tokyo", { sort: "price" })[0].name, "Asakusa Paper Lantern Inn");
  assert.equal(search("Tokyo", { sort: "'; DROP TABLE hotels; --" }).length, 5);
});

test("resetDatabase restores the deterministic twenty-four-hotel fixture", () => {
  const hotels = resetDatabase();
  assert.equal(hotels.length, 24);
  assert.deepEqual(hotels, seedHotels);
});

test("a normal city search returns only the two public Paris listings", () => {
  resetDatabase();
  const hotels = searchHotelsByCity("Paris");
  assert.equal(hotels.length, 2);
  assert.ok(hotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
  assert.deepEqual(searchHotelsByCity("paris"), hotels);
  assert.ok(hotels.every((hotel) =>
    Number.isInteger(hotel.pricePerNight) &&
    Number.isInteger(hotel.partnerNetRate) &&
    Number.isInteger(hotel.forecastOccupancyPct) &&
    Number.isInteger(hotel.syntheticReservationCount)
  ));
  assert.deepEqual(searchHotelsByCity("NoSuchWorkshopCity"), []);
  assert.deepEqual(searchHotelsByCity(""), []);
  assert.deepEqual(searchHotelsByCity(null), []);
});

test("the hotel search suggests San Francisco", () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  assert.match(html, /data-city="San Francisco">San Francisco<\/button>/);
});

test("each city has a distinct public result count, including San Francisco", () => {
  resetDatabase();
  const expectedCounts = {
    Paris: 2,
    Berlin: 3,
    Lisbon: 4,
    Tokyo: 5,
    "San Francisco": 6,
  };

  for (const [city, count] of Object.entries(expectedCounts)) {
    const hotels = searchHotelsByCity(city);
    assert.equal(hotels.length, count, `${city} result count`);
    assert.ok(hotels.every((hotel) => hotel.city === city && hotel.listingStatus === "PUBLIC"));
  }

  assert.deepEqual(
    searchHotelsByCity("San Francisco").map((hotel) => hotel.name),
    [
      "Presidio Harbor House",
      "Embarcadero Lantern Hotel",
      "Pacific Heights Garden Inn",
      "Mission Terrace Hotel",
      "North Beach Gallery House",
      "Sunset Commons Lodge",
    ],
  );
});

test("the optional filters narrow the public result set", () => {
  resetDatabase();
  assert.equal(searchHotelsByCity("Paris", { maxPrice: "230" }).length, 1);
  assert.equal(searchHotelsByCity("Paris", { maxPrice: "not-a-number" }).length, 2);
  assert.equal(searchHotelsByCity("Paris", { name: "Saint-Clair" }).length, 1);
  assert.equal(searchHotelsByCity("Paris", { name: "%" }).length, 0);
  assert.equal(searchHotelsByCity("Tokyo", { sort: "price" })[0].name, "Asakusa Paper Lantern Inn");
  assert.equal(searchHotelsByCity("Tokyo", { sort: "'; DROP TABLE hotels; --" }).length, 5);
});

test("the single-listing and partner lookups stay inside the public boundary", () => {
  resetDatabase();
  assert.equal(findHotelById("1").internalReference, "PUB-PAR-0001");
  assert.equal(findHotelById("12"), null, "an unpublished listing must not be addressable");
  assert.equal(findHotelById(payload), null);
  assert.deepEqual(partnerRateSummary("Paris"), { listings: 2, averageNetRate: 180 });
  assert.deepEqual(partnerRateSummary("paris"), { listings: 2, averageNetRate: 180 });
  assert.deepEqual(partnerRateSummary(payload), { listings: 0, averageNetRate: null });
});

test("statement-terminating payloads are rejected before reaching SQL", () => {
  resetDatabase();
  assert.deepEqual(searchHotelsByCity("'; DROP TABLE hotels; --"), []);
  assert.equal(resetDatabase().length, 24);
});
