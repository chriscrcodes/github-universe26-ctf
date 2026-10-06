const test = require("node:test");
const assert = require("node:assert/strict");
const { checkDelivery } = require("../scripts/delivery");

test("delivery checks normal public search without security payloads", async () => {
  const cities = [];
  await checkDelivery("http://example.test", async (url) => {
    const city = new URL(url).searchParams.get("city");
    cities.push(city);
    return { status: 200, json: async () => ({ hotels: city.toLowerCase() === "paris"
      ? [{ city: "Paris", listingStatus: "PUBLIC" }, { city: "Paris", listingStatus: "PUBLIC" }] : [] }) };
  });
  assert.deepEqual(cities, ["Paris", "paris", "NoSuchWorkshopCity", ""]);
});

test("delivery rejects a missing feature or unpublished results", async () => {
  await assert.rejects(checkDelivery("http://example.test", async () => ({ status: 501 })), /Deliver public hotel search/);
  await assert.rejects(checkDelivery("http://example.test", async () => ({ status: 200,
    json: async () => ({ hotels: [{ city: "Paris", listingStatus: "PRIVATE" }, { city: "Paris", listingStatus: "PUBLIC" }] }) })),
  /Only public listings/);
});