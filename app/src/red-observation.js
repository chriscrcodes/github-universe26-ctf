const { readWorkshopState, recordEvidence } = require("./workshop-progress");

const CANONICAL_PAYLOAD = "' OR 1=1 --";
let publicationInFlight;

function canonicalChecks(city, hotels, baselineHotels) {
  if (typeof city !== "string" || city.trim() !== CANONICAL_PAYLOAD
    || !Array.isArray(hotels) || !Array.isArray(baselineHotels)) return null;

  const unpublished = hotels.filter((hotel) => hotel.listingStatus === "UNPUBLISHED");
  const capturedFlag = unpublished
    .map((hotel) => hotel.internalReference)
    .find((reference) => typeof reference === "string" && reference.startsWith("FLAG{"));
  const checks = {
    baselineCount: baselineHotels.length,
    baselinePublic: baselineHotels.length === 2
      && baselineHotels.every((hotel) => hotel.listingStatus === "PUBLIC"),
    payloadCount: hotels.length,
    unpublishedCount: unpublished.length,
    syntheticReservations: unpublished.reduce((total, hotel) => total + hotel.syntheticReservationCount, 0),
    flagCaptured: Boolean(capturedFlag),
  };
  if (checks.baselineCount !== 2 || !checks.baselinePublic || checks.payloadCount !== 24
    || checks.unpublishedCount !== 4 || checks.syntheticReservations !== 27400 || !checks.flagCaptured) {
    return null;
  }
  return { checks, capturedFlag };
}

async function publishCanonicalRedPhase(city, hotels, baselineHotels, dependencies = {}) {
  const evidence = canonicalChecks(city, hotels, baselineHotels);
  if (!evidence) return { status: "not-confirmed" };

  if (publicationInFlight) return publicationInFlight;
  publicationInFlight = (async () => {
    const getState = dependencies.readState || readWorkshopState;
    const saveEvidence = dependencies.recordEvidence || recordEvidence;
    const publish = dependencies.publishPhase || ((phases) => {
      const { main } = require("../scripts/publish-phase");
      return main(phases);
    });
    const state = getState();
    if (state.completedPhases.includes("red")) return { status: "already-recorded" };
    if (state.completedPhases.at(-1) !== "started") return { status: "not-ready" };

    saveEvidence("red", {
      command: "participant-ui-canonical-payload",
      result: "The canonical UI payload returned all listings, including unpublished listings.",
      checks: evidence.checks,
      flag: evidence.capturedFlag,
    });
    const publication = await publish(["red"]);
    return { status: publication?.boardDelivered ? "board" : "local" };
  })();

  try {
    return await publicationInFlight;
  } finally {
    publicationInFlight = null;
  }
}

module.exports = { CANONICAL_PAYLOAD, canonicalChecks, publishCanonicalRedPhase };