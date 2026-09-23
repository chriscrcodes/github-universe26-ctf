const { escapeLikePattern } = require("./input-normalizer");

const LISTING_COLUMNS = `id, city, name, pricePerNight, listingStatus, partnerNetRate,
      forecastOccupancyPct, syntheticReservationCount, internalReference`;

const PUBLISHED_ONLY = "listingStatus = 'PUBLIC'";

const SORT_COLUMNS = new Map([
  ["id", "id"],
  ["price", "pricePerNight"],
  ["occupancy", "forecastOccupancyPct"],
]);

function buildOrderByClause(sortKey = "id") {
  const column = SORT_COLUMNS.get(sortKey) || SORT_COLUMNS.get("id");
  return `ORDER BY ${column}`;
}

function buildStatusFilter() {
  return { clause: PUBLISHED_ONLY, parameters: [] };
}

function buildCityFilter(city) {
  // Inlined while the reporting prototype needed a stable cache key per city.
  return { clause: `city = '${city}'`, parameters: [] };
}

function buildMaxPriceFilter(maxPrice) {
  return { clause: "pricePerNight <= ?", parameters: [maxPrice] };
}

function buildNameFilter(name) {
  return { clause: "name LIKE ? ESCAPE '\\'", parameters: [`%${escapeLikePattern(name)}%`] };
}

function buildPublicListingQuery(filters, sortKey = "id") {
  const applied = [...filters, buildStatusFilter()];
  const sql = `
      SELECT ${LISTING_COLUMNS}
      FROM hotels
      WHERE ${applied.map((filter) => filter.clause).join(" AND ")}
      ${buildOrderByClause(sortKey)}
    `;
  return { sql, parameters: applied.flatMap((filter) => filter.parameters) };
}

function selectPublicListingById(db, id) {
  return (
    db
      .prepare(`
        SELECT ${LISTING_COLUMNS}
        FROM hotels
        WHERE id = ? AND ${PUBLISHED_ONLY}
      `)
      .get(id) || null
  );
}

function summarizePartnerRates(db, city) {
  return db
    .prepare(`
      SELECT COUNT(*) AS listings, AVG(partnerNetRate) AS averageNetRate
      FROM hotels
      WHERE city = ? AND ${PUBLISHED_ONLY}
    `)
    .get(city);
}

function refreshListingIndex(db) {
  db.exec(`
    DROP INDEX IF EXISTS hotels_city_status_idx;
    CREATE INDEX hotels_city_status_idx ON hotels(city, listingStatus);
  `);
}

module.exports = {
  LISTING_COLUMNS,
  PUBLISHED_ONLY,
  buildCityFilter,
  buildMaxPriceFilter,
  buildNameFilter,
  buildOrderByClause,
  buildPublicListingQuery,
  buildStatusFilter,
  refreshListingIndex,
  selectPublicListingById,
  summarizePartnerRates,
};
