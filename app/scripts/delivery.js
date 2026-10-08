const assert = require("node:assert/strict");
const { repositoryContext } = require("../src/codeql-evidence");
const { recordEvidence } = require("../src/workshop-progress");

const challengeInput = "' OR 1=1 -- ";

async function checkDelivery(appUrl, request = fetch) {
  for (const [city, expectedCount] of [["Paris", 2], ["paris", 2], ["NoSuchWorkshopCity", 0], ["", 0]]) {
    const response = await request(`${appUrl.replace(/\/$/, "")}/api/hotels?city=${encodeURIComponent(city)}`,
      { signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, 200, "Deliver public hotel search before recording initial delivery.");
    const { hotels } = await response.json();
    assert.ok(Array.isArray(hotels), "Expected a hotel listing array.");
    assert.equal(hotels.length, expectedCount, `Unexpected public search result for ${JSON.stringify(city)}.`);
    assert.ok(hotels.every((hotel) => hotel.city === "Paris" && hotel.listingStatus === "PUBLIC"),
      "Only public listings may be returned.");
  }
  const response = await request(`${appUrl.replace(/\/$/, "")}/api/hotels?city=${encodeURIComponent(challengeInput)}`,
    { signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200, "Run the supplied synthetic challenge prototype before recording delivery.");
  const { hotels } = await response.json();
  assert.ok(Array.isArray(hotels), "Expected a hotel listing array.");
  const unpublished = hotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
  assert.equal(hotels.length, 24, "The challenge input must expose the supplied synthetic fixture.");
  assert.equal(unpublished.length, 4, "Expected four synthetic unpublished listings.");
  assert.equal(unpublished.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0), 27400,
    "Unexpected synthetic reservation fixture.");
  assert.ok(unpublished.some((hotel) => hotel.internalReference === "FLAG{unpublished-inventory-exposed}"),
    "Expected the synthetic challenge marker.");
  return { fixture: "synthetic-hotels-v1", input: challengeInput, unpublishedCount: unpublished.length,
    syntheticReservationCount: 27400 };
}

async function main() {
  const context = repositoryContext();
  const exposure = await checkDelivery(process.env.APP_URL || "http://127.0.0.1:3000");
  assert.deepEqual(repositoryContext(), context, "Remote main changed during delivery verification; retry.");
  recordEvidence("red", { ...context, kind: "initial-delivery", command: "npm run delivery",
    pushed: true, exposure, cases: ["Paris", "paris", "unknown city", "empty city", "synthetic exposure"] });
  console.log("PASS: initial delivery checks recorded against the synthetic workshop data. No phase automatically advanced.");
}

if (require.main === module) main().catch((error) => {
  console.error(`Delivery not recorded: ${error.message}`); process.exitCode = 1;
});

module.exports = { challengeInput, checkDelivery, main };