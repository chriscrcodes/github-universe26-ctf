const test = require("node:test");
const assert = require("node:assert/strict");
const { challengeInput, checkDelivery } = require("../scripts/delivery");

function exposedHotels() {
  return [...Array.from({ length: 20 }, () => ({ city: "Paris", listingStatus: "PUBLIC" })),
    ...Array.from({ length: 4 }, () => ({ city: "Paris", listingStatus: "UNPUBLISHED",
      syntheticReservationCount: 6850, internalReference: "FLAG{unpublished-inventory-exposed}" }))];
}

test("delivery checks normal search and the supplied synthetic exposure", async () => {
  const cities = [];
  const exposure = await checkDelivery("http://example.test", async (url) => {
    const city = new URL(url).searchParams.get("city");
    cities.push(city);
    return { status: 200, json: async () => ({ hotels: city === challengeInput ? exposedHotels() : city.toLowerCase() === "paris"
      ? [{ city: "Paris", listingStatus: "PUBLIC" }, { city: "Paris", listingStatus: "PUBLIC" }] : [] }) };
  });
  assert.deepEqual(cities, ["Paris", "paris", "NoSuchWorkshopCity", "", challengeInput]);
  assert.deepEqual(exposure, { fixture: "synthetic-hotels-v1", input: challengeInput,
    unpublishedCount: 4, syntheticReservationCount: 27400 });
});

test("delivery refuses an already safe baseline or an unrelated exposure", async () => {
  for (const exposed of [[], exposedHotels().map((hotel) => ({ ...hotel, internalReference: "unrelated" }))]) {
    await assert.rejects(checkDelivery("http://example.test", async (url) => {
      const city = new URL(url).searchParams.get("city");
      return { status: 200, json: async () => ({ hotels: city === challengeInput ? exposed : city.toLowerCase() === "paris"
        ? [{ city: "Paris", listingStatus: "PUBLIC" }, { city: "Paris", listingStatus: "PUBLIC" }] : [] }) };
    }), /synthetic fixture|synthetic challenge marker/);
  }
});

test("delivery rejects a missing feature or unpublished results", async () => {
  await assert.rejects(checkDelivery("http://example.test", async () => ({ status: 501 })), /Deliver public hotel search/);
  await assert.rejects(checkDelivery("http://example.test", async () => ({ status: 200,
    json: async () => ({ hotels: [{ city: "Paris", listingStatus: "PRIVATE" }, { city: "Paris", listingStatus: "PUBLIC" }] }) })),
  /Only public listings/);
});