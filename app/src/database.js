const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "..", "data");
const databaseFile = path.join(dataDirectory, "hotels.sqlite");

const currencyByCity = Object.freeze({
  Paris: "EUR",
  Berlin: "EUR",
  Lisbon: "EUR",
  Tokyo: "JPY",
  "San Francisco": "USD",
});

const roomTypesByCity = Object.freeze({
  Paris: ["Classic Double / Twin", "Superior Double", "Family Room"],
  Berlin: ["Standard Twin", "Superior Double", "Family Room"],
  Lisbon: ["Standard Double", "Superior with Balcony", "Family Room"],
  Tokyo: ["Standard Twin", "Superior Twin", "Premier Grand King"],
  "San Francisco": ["Deluxe King", "Premier King", "Signature Two Double Beds"],
});

const roomTypeIndexByCity = Object.create(null);

const seedHotels = Object.freeze([
  { id: 1, city: "Paris", name: "Hôtel La Bourdonnais", pricePerNight: 225, listingStatus: "PUBLIC", partnerNetRate: 164, forecastOccupancyPct: 82, syntheticReservationCount: 1840, internalReference: "PUB-PAR-0001" },
  { id: 2, city: "Paris", name: "Pullman Paris Tour Eiffel", pricePerNight: 268, listingStatus: "PUBLIC", partnerNetRate: 196, forecastOccupancyPct: 76, syntheticReservationCount: 1320, internalReference: "PUB-PAR-0002" },
  { id: 3, city: "Berlin", name: "Motel One Berlin-Hauptbahnhof", pricePerNight: 154, listingStatus: "PUBLIC", partnerNetRate: 109, forecastOccupancyPct: 79, syntheticReservationCount: 1680, internalReference: "PUB-BER-0003" },
  { id: 4, city: "Berlin", name: "Motel One Berlin-Alexanderplatz", pricePerNight: 182, listingStatus: "PUBLIC", partnerNetRate: 128, forecastOccupancyPct: 73, syntheticReservationCount: 1460, internalReference: "PUB-BER-0004" },
  { id: 5, city: "Berlin", name: "Charlottenburg Court", pricePerNight: 238, listingStatus: "UNPUBLISHED", partnerNetRate: 171, forecastOccupancyPct: 88, syntheticReservationCount: 7200, internalReference: "INTERNAL-BER-0005" },
  { id: 6, city: "Lisbon", name: "HF Fénix Lisboa", pricePerNight: 176, listingStatus: "PUBLIC", partnerNetRate: 122, forecastOccupancyPct: 81, syntheticReservationCount: 1510, internalReference: "PUB-LIS-0006" },
  { id: 7, city: "Lisbon", name: "HF Fénix Urban", pricePerNight: 201, listingStatus: "PUBLIC", partnerNetRate: 143, forecastOccupancyPct: 77, syntheticReservationCount: 1370, internalReference: "PUB-LIS-0007" },
  { id: 8, city: "Lisbon", name: "Alfama Terrace House", pricePerNight: 249, listingStatus: "UNPUBLISHED", partnerNetRate: 178, forecastOccupancyPct: 84, syntheticReservationCount: 6800, internalReference: "INTERNAL-LIS-0008" },
  { id: 9, city: "Tokyo", name: "APA Hotel Ueno Ekimae", pricePerNight: 287, listingStatus: "PUBLIC", partnerNetRate: 207, forecastOccupancyPct: 86, syntheticReservationCount: 1950, internalReference: "PUB-TOK-0009" },
  { id: 10, city: "Tokyo", name: "APA Hotel Shinjuku Gyoemmae", pricePerNight: 324, listingStatus: "PUBLIC", partnerNetRate: 235, forecastOccupancyPct: 80, syntheticReservationCount: 1620, internalReference: "PUB-TOK-0010" },
  { id: 11, city: "Tokyo", name: "Kiyosumi House", pricePerNight: 362, listingStatus: "UNPUBLISHED", partnerNetRate: 261, forecastOccupancyPct: 91, syntheticReservationCount: 7100, internalReference: "INTERNAL-TOK-0011" },
  { id: 12, city: "Paris", name: "Montmartre Courtyard Hotel", pricePerNight: 315, listingStatus: "UNPUBLISHED", partnerNetRate: 228, forecastOccupancyPct: 89, syntheticReservationCount: 6300, internalReference: "FLAG{unpublished-inventory-exposed}" },
  { id: 13, city: "Berlin", name: "Motel One Berlin-Mitte", pricePerNight: 205, listingStatus: "PUBLIC", partnerNetRate: 146, forecastOccupancyPct: 78, syntheticReservationCount: 1380, internalReference: "PUB-BER-0013" },
  { id: 14, city: "Lisbon", name: "HF Fénix Garden", pricePerNight: 188, listingStatus: "PUBLIC", partnerNetRate: 131, forecastOccupancyPct: 83, syntheticReservationCount: 1590, internalReference: "PUB-LIS-0014" },
  { id: 15, city: "Lisbon", name: "HF Fénix Music", pricePerNight: 220, listingStatus: "PUBLIC", partnerNetRate: 155, forecastOccupancyPct: 75, syntheticReservationCount: 1260, internalReference: "PUB-LIS-0015" },
  { id: 16, city: "Tokyo", name: "APA Hotel Asakusa Tawaramachi Ekimae", pricePerNight: 245, listingStatus: "PUBLIC", partnerNetRate: 176, forecastOccupancyPct: 84, syntheticReservationCount: 1710, internalReference: "PUB-TOK-0016" },
  { id: 17, city: "Tokyo", name: "APA Hotel Asakusa Kaminarimon", pricePerNight: 301, listingStatus: "PUBLIC", partnerNetRate: 216, forecastOccupancyPct: 78, syntheticReservationCount: 1480, internalReference: "PUB-TOK-0017" },
  { id: 18, city: "Tokyo", name: "APA Hotel Asakusa Kuramae", pricePerNight: 273, listingStatus: "PUBLIC", partnerNetRate: 194, forecastOccupancyPct: 81, syntheticReservationCount: 1530, internalReference: "PUB-TOK-0018" },
  { id: 19, city: "San Francisco", name: "Hotel Zephyr", pricePerNight: 289, listingStatus: "PUBLIC", partnerNetRate: 208, forecastOccupancyPct: 84, syntheticReservationCount: 1920, internalReference: "PUB-SFO-0019" },
  { id: 20, city: "San Francisco", name: "Argonaut Hotel", pricePerNight: 318, listingStatus: "PUBLIC", partnerNetRate: 229, forecastOccupancyPct: 79, syntheticReservationCount: 1640, internalReference: "PUB-SFO-0020" },
  { id: 21, city: "San Francisco", name: "San Francisco Marriott Marquis", pricePerNight: 342, listingStatus: "PUBLIC", partnerNetRate: 245, forecastOccupancyPct: 76, syntheticReservationCount: 1420, internalReference: "PUB-SFO-0021" },
  { id: 22, city: "San Francisco", name: "Hotel Zoe Fisherman's Wharf", pricePerNight: 226, listingStatus: "PUBLIC", partnerNetRate: 161, forecastOccupancyPct: 88, syntheticReservationCount: 1830, internalReference: "PUB-SFO-0022" },
  { id: 23, city: "San Francisco", name: "Hotel Riu Plaza Fisherman's Wharf", pricePerNight: 267, listingStatus: "PUBLIC", partnerNetRate: 191, forecastOccupancyPct: 82, syntheticReservationCount: 1570, internalReference: "PUB-SFO-0023" },
  { id: 24, city: "San Francisco", name: "Kimpton Alton Fisherman's Wharf", pricePerNight: 204, listingStatus: "PUBLIC", partnerNetRate: 145, forecastOccupancyPct: 74, syntheticReservationCount: 1350, internalReference: "PUB-SFO-0024" }
].map((hotel) => {
  const roomTypeIndex = roomTypeIndexByCity[hotel.city] || 0;
  roomTypeIndexByCity[hotel.city] = roomTypeIndex + 1;
  const roomType = roomTypesByCity[hotel.city][roomTypeIndex % roomTypesByCity[hotel.city].length];
  const isFamily = roomType.includes("Family") || roomType.includes("Two Double Beds");
  const bedConfiguration = roomType.includes("Twin")
    ? "2 twin beds"
    : roomType.includes("Two Double Beds") ? "2 double beds" : roomType.includes("King") ? "1 king bed" : "1 double bed";
  const yenListing = hotel.city === "Tokyo";
  return Object.freeze({
    ...hotel,
    pricePerNight: yenListing ? hotel.pricePerNight * 100 : hotel.pricePerNight,
    partnerNetRate: yenListing ? hotel.partnerNetRate * 100 : hotel.partnerNetRate,
    currency: currencyByCity[hotel.city],
    roomType,
    maxGuests: isFamily ? 4 : 2,
    bedConfiguration,
    breakfastIncluded: hotel.id % 3 === 0 ? 1 : 0,
    freeCancellation: hotel.id % 2 === 0 ? 1 : 0,
  });
}));

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function openDatabase() {
  ensureDataDirectory();
  return new Database(databaseFile);
}

function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      pricePerNight INTEGER NOT NULL,
      currency TEXT NOT NULL,
      roomType TEXT NOT NULL,
      maxGuests INTEGER NOT NULL,
      bedConfiguration TEXT NOT NULL,
      breakfastIncluded INTEGER NOT NULL,
      freeCancellation INTEGER NOT NULL,
      listingStatus TEXT NOT NULL CHECK (listingStatus IN ('PUBLIC', 'UNPUBLISHED')),
      partnerNetRate INTEGER NOT NULL,
      forecastOccupancyPct INTEGER NOT NULL,
      syntheticReservationCount INTEGER NOT NULL,
      internalReference TEXT NOT NULL
    )
  `);
}

function seedIfEmpty(db) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO hotels (
      id, city, name, pricePerNight, currency, roomType, maxGuests,
      bedConfiguration, breakfastIncluded, freeCancellation, listingStatus, partnerNetRate,
      forecastOccupancyPct, syntheticReservationCount, internalReference
    ) VALUES (
      @id, @city, @name, @pricePerNight, @currency, @roomType, @maxGuests,
      @bedConfiguration, @breakfastIncluded, @freeCancellation, @listingStatus, @partnerNetRate,
      @forecastOccupancyPct, @syntheticReservationCount, @internalReference
    )`
  );
  const transaction = db.transaction((rows) => {
    const count = db.prepare("SELECT COUNT(*) AS count FROM hotels").get().count;
    if (count > 0) return;
    for (const row of rows) insert.run(row);
  });
  transaction.immediate(seedHotels);
}

function resetDatabase() {
  ensureDataDirectory();
  const db = openDatabase();
  try {
    db.exec("DROP TABLE IF EXISTS hotels");
    initializeSchema(db);
    const insert = db.prepare(
      `INSERT INTO hotels (
        id, city, name, pricePerNight, currency, roomType, maxGuests,
        bedConfiguration, breakfastIncluded, freeCancellation, listingStatus, partnerNetRate,
        forecastOccupancyPct, syntheticReservationCount, internalReference
      ) VALUES (
        @id, @city, @name, @pricePerNight, @currency, @roomType, @maxGuests,
        @bedConfiguration, @breakfastIncluded, @freeCancellation, @listingStatus, @partnerNetRate,
        @forecastOccupancyPct, @syntheticReservationCount, @internalReference
      )`
    );
    const transaction = db.transaction((rows) => {
      db.prepare("DELETE FROM hotels").run();
      for (const row of rows) insert.run(row);
    });
    transaction(seedHotels);
    return db.prepare(`
      SELECT id, city, name, pricePerNight, currency, roomType, maxGuests,
        bedConfiguration, breakfastIncluded, freeCancellation, listingStatus, partnerNetRate,
        forecastOccupancyPct, syntheticReservationCount, internalReference
      FROM hotels
      ORDER BY id
    `).all();
  } finally {
    db.close();
  }
}

function hasCurrentHotelSchema(db) {
  const columns = db.prepare("PRAGMA table_info(hotels)").all().map((column) => column.name);
  return [
    "id",
    "city",
    "name",
    "pricePerNight",
    "currency",
    "roomType",
    "maxGuests",
    "bedConfiguration",
    "breakfastIncluded",
    "freeCancellation",
    "listingStatus",
    "partnerNetRate",
    "forecastOccupancyPct",
    "syntheticReservationCount",
    "internalReference",
  ].every((column) => columns.includes(column));
}

function ensureDatabaseReady() {
  ensureDataDirectory();
  if (!fs.existsSync(databaseFile)) {
    resetDatabase();
    return;
  }

  const db = openDatabase();
  let requiresReset = false;
  try {
    initializeSchema(db);
    requiresReset = !hasCurrentHotelSchema(db);
    if (!requiresReset) seedIfEmpty(db);
  } finally {
    db.close();
  }

  if (requiresReset) resetDatabase();
}

function isTransientDatabaseError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  return ["SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_READONLY", "SQLITE_CANTOPEN"]
    .some((prefix) => code.startsWith(prefix));
}

function withDatabase(work) {
  // A concurrent reset can drop the file between the readiness check and the
  // query, so one retry keeps the workshop app from returning a 500 mid-demo.
  for (let attempt = 0; ; attempt += 1) {
    try {
      ensureDatabaseReady();
      const db = openDatabase();
      try {
        return work(db);
      } finally {
        db.close();
      }
    } catch (error) {
      if (attempt >= 2 || !isTransientDatabaseError(error)) throw error;
    }
  }
}

function listHotels() {
  return withDatabase((db) => db.prepare(`
    SELECT id, city, name, pricePerNight, currency, roomType, maxGuests,
      bedConfiguration, breakfastIncluded, freeCancellation, listingStatus, partnerNetRate,
      forecastOccupancyPct, syntheticReservationCount, internalReference
    FROM hotels
    ORDER BY id
  `).all());
}

module.exports = {
  databaseFile,
  listHotels,
  openDatabase,
  resetDatabase,
  roomOptionsForHotel(hotel) {
    const roomTypes = roomTypesByCity[hotel.city] || [hotel.roomType];
    const primaryIndex = Math.max(0, roomTypes.indexOf(hotel.roomType));
    const orderedRoomTypes = [hotel.roomType, ...roomTypes.filter((_roomType, index) => index !== primaryIndex)];
    return orderedRoomTypes.map((roomType, index) => {
      const isFamily = roomType.includes("Family") || roomType.includes("Two Double Beds");
      const bedConfiguration = roomType.includes("Twin")
        ? "2 twin beds"
        : roomType.includes("Two Double Beds") ? "2 double beds" : roomType.includes("King") ? "1 king bed" : "1 double bed";
      return {
        roomType,
        pricePerNight: Math.round(hotel.pricePerNight * [1, 1.2, 1.45][index]),
        maxGuests: isFamily ? 4 : 2,
        bedConfiguration,
        breakfastIncluded: hotel.breakfastIncluded,
        freeCancellation: hotel.freeCancellation,
      };
    });
  },
  seedHotels,
  withDatabase,
};
