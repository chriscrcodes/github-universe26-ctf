const test = require("node:test");
const assert = require("node:assert/strict");
const { resetDatabase, seedHotels } = require("../src/database");
const { findHotelById, partnerRateSummary, searchHotelsByCity } = require("../src/hotels");

const payload = "' OR 1=1 -- ";

test("resetDatabase restores the deterministic twelve-hotel fixture", () => {
  const hotels = resetDatabase();
  assert.equal(hotels.length, 12);
  assert.deepEqual(hotels, seedHotels);
});

test("a normal city search returns only the two public Paris listings", () => {
  resetDatabase();
  const hotels = searchHotelsByCity("Paris");
  assert.equal(hotels.length, 2);
  assert.ok(hotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
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

test("the optional filters narrow the public result set", () => {
  resetDatabase();
  assert.equal(searchHotelsByCity("Paris", { maxPrice: "230" }).length, 1);
  assert.equal(searchHotelsByCity("Paris", { maxPrice: "not-a-number" }).length, 2);
  assert.equal(searchHotelsByCity("Paris", { name: "Saint-Clair" }).length, 1);
  assert.equal(searchHotelsByCity("Paris", { name: "%" }).length, 0);
  assert.equal(searchHotelsByCity("Tokyo", { sort: "price" })[0].name, "Sakura Lane Hotel");
  assert.equal(searchHotelsByCity("Tokyo", { sort: "'; DROP TABLE hotels; --" }).length, 2);
});

test("the single-listing and partner lookups stay inside the public boundary", () => {
  resetDatabase();
  assert.equal(findHotelById("1").internalReference, "PUB-PAR-0001");
  assert.equal(findHotelById("12"), null, "an unpublished listing must not be addressable");
  assert.equal(findHotelById(payload), null);
  assert.deepEqual(partnerRateSummary("Paris"), { listings: 2, averageNetRate: 180 });
  assert.deepEqual(partnerRateSummary(payload), { listings: 0, averageNetRate: null });
});

test("the starting application leaks unpublished inventory until the fix is applied", () => {
  resetDatabase();
  const exploit = searchHotelsByCity(payload);
  assert.ok([0, 12].includes(exploit.length));
  if (exploit.length === 0) return;
  const unpublished = exploit.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
  assert.equal(unpublished.length, 4);
  assert.equal(
    unpublished.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0),
    27400
  );
  assert.ok(
    unpublished.some((hotel) => hotel.internalReference === "FLAG{unpublished-inventory-exposed}"),
    "the capture-the-flag token lives on an unpublished listing"
  );
});

test("statement-terminating payloads are rejected before reaching SQL", () => {
  resetDatabase();
  assert.deepEqual(searchHotelsByCity("'; DROP TABLE hotels; --"), []);
  assert.equal(resetDatabase().length, 12);
});
