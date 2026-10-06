const assert = require("node:assert/strict");
const { repositoryContext } = require("../src/codeql-evidence");
const { recordEvidence } = require("../src/workshop-progress");

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
}

async function main() {
  const context = repositoryContext();
  await checkDelivery(process.env.APP_URL || "http://127.0.0.1:3000");
  assert.deepEqual(repositoryContext(), context, "Remote main changed during delivery verification; retry.");
  recordEvidence("red", { ...context, kind: "initial-delivery", command: "npm run delivery",
    pushed: true, cases: ["Paris", "paris", "unknown city", "empty city", "PUBLIC boundary"] });
  console.log("PASS: public city search delivered locally and pushed to main. No phase automatically advanced.");
}

if (require.main === module) main().catch((error) => {
  console.error(`Delivery not recorded: ${error.message}`); process.exitCode = 1;
});

module.exports = { checkDelivery, main };