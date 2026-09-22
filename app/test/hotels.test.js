const test = require("node:test");
const assert = require("node:assert/strict");
const { resetDatabase, seedHotels } = require("../src/database");
const { searchHotelsByCity } = require("../src/hotels");

const payload = "' OR 1=1 -- ";

test("resetDatabase restores the deterministic twelve-hotel fixture", () => {
  const hotels = resetDatabase();
  assert.equal(hotels.length, 12);
  assert.deepEqual(hotels, seedHotels);
});

test("safe mode returns only the two public Paris listings", () => {
  resetDatabase();
  process.env.VULNERABLE = "0";
  const hotels = searchHotelsByCity("Paris");
  assert.equal(hotels.length, 2);
  assert.ok(hotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"));
  assert.ok(hotels.every((hotel) =>
    Number.isInteger(hotel.pricePerNight) &&
    Number.isInteger(hotel.partnerNetRate) &&
    Number.isInteger(hotel.forecastOccupancyPct) &&
    Number.isInteger(hotel.syntheticReservationCount)
  ));
  assert.deepEqual(searchHotelsByCity(payload), []);
  assert.deepEqual(searchHotelsByCity("NoSuchWorkshopCity"), []);
  assert.deepEqual(searchHotelsByCity(""), []);
  delete process.env.VULNERABLE;
});

test("default mode exposes either the workshop baseline or the participant remediation", () => {
  resetDatabase();
  delete process.env.VULNERABLE;
  const exploit = searchHotelsByCity(payload);
  assert.ok([0, 12].includes(exploit.length));
  if (exploit.length === 0) return;
  const unpublished = exploit.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
  assert.equal(unpublished.length, 4);
  assert.equal(
    unpublished.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0),
    27400
  );
});
