const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "..", "data");
const databaseFile = path.join(dataDirectory, "hotels.sqlite");

const seedHotels = Object.freeze([
  { id: 1, city: "Paris", name: "Hôtel Montparnasse Jardin", pricePerNight: 225, listingStatus: "PUBLIC", partnerNetRate: 164, forecastOccupancyPct: 82, syntheticReservationCount: 1840, internalReference: "PUB-PAR-0001" },
  { id: 2, city: "Paris", name: "Maison Saint-Clair", pricePerNight: 268, listingStatus: "PUBLIC", partnerNetRate: 196, forecastOccupancyPct: 76, syntheticReservationCount: 1320, internalReference: "PUB-PAR-0002" },
  { id: 3, city: "Berlin", name: "Lindenhof Berlin", pricePerNight: 154, listingStatus: "PUBLIC", partnerNetRate: 109, forecastOccupancyPct: 79, syntheticReservationCount: 1680, internalReference: "PUB-BER-0003" },
  { id: 4, city: "Berlin", name: "Spreeblick Hotel", pricePerNight: 182, listingStatus: "PUBLIC", partnerNetRate: 128, forecastOccupancyPct: 73, syntheticReservationCount: 1460, internalReference: "PUB-BER-0004" },
  { id: 5, city: "Berlin", name: "Charlottenburg Court", pricePerNight: 238, listingStatus: "UNPUBLISHED", partnerNetRate: 171, forecastOccupancyPct: 88, syntheticReservationCount: 7200, internalReference: "INTERNAL-BER-0005" },
  { id: 6, city: "Lisbon", name: "Casa do Miradouro", pricePerNight: 176, listingStatus: "PUBLIC", partnerNetRate: 122, forecastOccupancyPct: 81, syntheticReservationCount: 1510, internalReference: "PUB-LIS-0006" },
  { id: 7, city: "Lisbon", name: "Tejo Garden Hotel", pricePerNight: 201, listingStatus: "PUBLIC", partnerNetRate: 143, forecastOccupancyPct: 77, syntheticReservationCount: 1370, internalReference: "PUB-LIS-0007" },
  { id: 8, city: "Lisbon", name: "Alfama Terrace House", pricePerNight: 249, listingStatus: "UNPUBLISHED", partnerNetRate: 178, forecastOccupancyPct: 84, syntheticReservationCount: 6800, internalReference: "INTERNAL-LIS-0008" },
  { id: 9, city: "Tokyo", name: "Sakura Lane Hotel", pricePerNight: 287, listingStatus: "PUBLIC", partnerNetRate: 207, forecastOccupancyPct: 86, syntheticReservationCount: 1950, internalReference: "PUB-TOK-0009" },
  { id: 10, city: "Tokyo", name: "Ginza Harbor Inn", pricePerNight: 324, listingStatus: "PUBLIC", partnerNetRate: 235, forecastOccupancyPct: 80, syntheticReservationCount: 1620, internalReference: "PUB-TOK-0010" },
  { id: 11, city: "Tokyo", name: "Kiyosumi House", pricePerNight: 362, listingStatus: "UNPUBLISHED", partnerNetRate: 261, forecastOccupancyPct: 91, syntheticReservationCount: 7100, internalReference: "INTERNAL-TOK-0011" },
  { id: 12, city: "Paris", name: "Canal Saint-Martin Residence", pricePerNight: 315, listingStatus: "UNPUBLISHED", partnerNetRate: 228, forecastOccupancyPct: 89, syntheticReservationCount: 6300, internalReference: "FLAG{unpublished-inventory-exposed}" }
]);

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
      id, city, name, pricePerNight, listingStatus, partnerNetRate,
      forecastOccupancyPct, syntheticReservationCount, internalReference
    ) VALUES (
      @id, @city, @name, @pricePerNight, @listingStatus, @partnerNetRate,
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
        id, city, name, pricePerNight, listingStatus, partnerNetRate,
        forecastOccupancyPct, syntheticReservationCount, internalReference
      ) VALUES (
        @id, @city, @name, @pricePerNight, @listingStatus, @partnerNetRate,
        @forecastOccupancyPct, @syntheticReservationCount, @internalReference
      )`
    );
    const transaction = db.transaction((rows) => {
      db.prepare("DELETE FROM hotels").run();
      for (const row of rows) insert.run(row);
    });
    transaction(seedHotels);
    return db.prepare(`
      SELECT id, city, name, pricePerNight, listingStatus, partnerNetRate,
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
    SELECT id, city, name, pricePerNight, listingStatus, partnerNetRate,
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
  seedHotels,
  withDatabase,
};
